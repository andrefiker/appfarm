import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { Command } from './protocol.js';
import { Store } from './store.js';
import { TableService } from './table.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const bearer = (request: IncomingMessage): string | null => request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : null;
const body = (request: IncomingMessage): Promise<string> => new Promise((resolve, reject) => { let raw = ''; request.on('data', (chunk) => raw += chunk); request.on('end', () => resolve(raw)); request.on('error', reject); });

export function createPokerServer(databaseUrl = process.env.DATABASE_URL ?? '') {
  const store = new Store(databaseUrl);
  const table = new TableService(store);
  let initialized: Promise<void> | null = null;
  let ticking = false;
  const connections = new Map<string, WebSocket>();

  const ready = () => initialized ??= store.migrate().then(async () => { await table.initialize(); });
  const tick = async () => {
    if (ticking) return;
    ticking = true;
    try { await ready(); await table.advanceDue(); await table.startIfReady(); } finally { ticking = false; }
  };
  const json = (response: ServerResponse, status: number, value: unknown) => { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(value)); };
  const guest = async (token: string | null, name = 'Guest') => {
    if (token) {
      const found = await store.pool.query('select guest_id from poker_guests where token_hash=$1', [hash(token)]);
      if (found.rowCount) return { token, guestId: found.rows[0]!.guest_id as string };
    }
    const fresh = randomBytes(32).toString('base64url'); const guestId = randomUUID();
    await store.pool.query('insert into poker_guests(token_hash,guest_id,name) values($1,$2,$3)', [hash(fresh), guestId, name.slice(0, 24)]);
    return { token: fresh, guestId };
  };
  const publish = async () => {
    for (const [guestId, socket] of connections) {
      if (socket.readyState !== socket.OPEN) { connections.delete(guestId); continue; }
      socket.send(JSON.stringify(await table.snapshot(guestId)));
    }
  };

  const server = createServer(async (request, response) => {
    response.setHeader('access-control-allow-origin', process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173');
    response.setHeader('access-control-allow-headers', 'authorization,content-type');
    response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    if (request.method === 'OPTIONS') { response.writeHead(204).end(); return; }
    try {
      await tick();
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
      if (request.method === 'GET' && url.pathname === '/health') { json(response, 200, { ok: true }); return; }
      if (request.method === 'POST' && url.pathname === '/api/session') {
        const requested = JSON.parse(await body(request) || '{}') as { name?: string };
        const identity = await guest(bearer(request), requested.name);
        const ticket = randomBytes(24).toString('base64url'); const expiresAt = Date.now() + 60_000;
        await store.issueTicket(identity.guestId, hash(ticket), expiresAt);
        json(response, 200, { credential: identity.token, websocketTicket: ticket, expiresIn: 60 }); return;
      }
      const token = bearer(request); const identity = token ? await guest(token) : null;
      if (request.method === 'GET' && url.pathname === '/api/table') { json(response, 200, await table.snapshot(identity?.guestId ?? null)); return; }
      if (request.method === 'POST' && url.pathname === '/api/command') {
        if (!identity) throw new Error('unauthenticated');
        const result = await table.command(identity.guestId, JSON.parse(await body(request)) as Command);
        await tick(); await publish(); json(response, 200, result); return;
      }
      if (request.method === 'POST' && url.pathname === '/api/tick') { await tick(); await publish(); json(response, 200, { ok: true }); return; }
      json(response, 404, { error: 'not_found' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'server_error';
      const status = message === 'unauthenticated' ? 401 : message === 'stale_command' ? 409 : 400;
      json(response, status, { error: message });
    }
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
  server.on('upgrade', (request, socket, head) => {
    const rejectUpgrade = (status: number, reason: string) => {
      console.warn(`poker websocket rejected: ${reason}`);
      socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`);
      socket.destroy();
    };
    void (async () => {
      try {
        const allowedOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
        if (request.headers.origin !== allowedOrigin) { rejectUpgrade(403, 'forbidden_origin'); return; }
        await tick();
        const ticket = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`).searchParams.get('ticket');
        const guestId = ticket ? await store.consumeTicket(hash(ticket)) : null;
        if (!guestId) { rejectUpgrade(401, 'invalid_ticket'); return; }
        wss.handleUpgrade(request, socket, head, (websocket) => {
        const previous = connections.get(guestId); if (previous && previous !== websocket) previous.close(4001, 'control_replaced');
        connections.set(guestId, websocket);
        void table.snapshot(guestId).then((snapshot) => websocket.send(JSON.stringify(snapshot)));
        websocket.on('close', () => { if (connections.get(guestId) === websocket) connections.delete(guestId); });
        websocket.on('message', async (raw) => {
          try {
            const response = await table.command(guestId, JSON.parse(raw.toString()) as Command);
            await tick(); await publish();
            if (websocket.readyState === websocket.OPEN) websocket.send(JSON.stringify(response));
          } catch (error) { if (websocket.readyState === websocket.OPEN) websocket.send(JSON.stringify({ error: error instanceof Error ? error.message : 'server_error' })); }
        });
        });
      } catch (error) {
        console.error('poker websocket upgrade failed', error instanceof Error ? error.message : error);
        rejectUpgrade(500, 'upgrade_failed');
      }
    })();
  });
  // A warm Vercel WebSocket instance needs to progress bot decisions and turn
  // deadlines without a client having to make a second request. Correctness
  // still comes from Neon: every invocation calls tick() before serving and a
  // cold instance can therefore resume the committed hand safely.
  const scheduler = setInterval(() => { void tick().then(publish).catch(() => undefined); }, 1_000);
  scheduler.unref();
  return {
    server,
    tick,
    close: async () => {
      clearInterval(scheduler);
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await store.pool.end();
    }
  };
}

export const poker = createPokerServer();
export default poker.server;
