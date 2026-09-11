import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { Command } from './protocol.js';
import { Store } from './store.js';
import { TableService } from './table.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const bearer = (request: IncomingMessage): string | null => request.headers.authorization?.startsWith('Bearer ') ? request.headers.authorization.slice(7) : null;
const body = (request: IncomingMessage): Promise<string> => new Promise((resolve, reject) => { let raw = ''; request.on('data', (chunk) => raw += chunk); request.on('end', () => resolve(raw)); request.on('error', reject); });
const normalizeTableId = (value: string | null | undefined): string => {
  const id = (value ?? 'main').trim().toLowerCase();
  if (id === 'main' || /^room-[a-z0-9]{8}$/.test(id)) return id;
  throw new Error('invalid_table');
};

type LiveConnection = Readonly<{ tableId: string; guestId: string; socket: WebSocket }>;

export function createPokerServer(databaseUrl = process.env.DATABASE_URL ?? '') {
  const store = new Store(databaseUrl);
  const tables = new Map<string, Promise<TableService>>();
  const ticking = new Set<string>();
  const connections = new Map<string, LiveConnection>();
  let migrated: Promise<void> | null = null;

  const readyStore = () => migrated ??= store.migrate();
  const tableFor = (tableId: string): Promise<TableService> => {
    const existing = tables.get(tableId);
    if (existing) return existing;
    const service = new TableService(store, tableId);
    const loading = readyStore().then(async () => { await service.initialize(); return service; });
    tables.set(tableId, loading);
    void loading.catch(() => tables.delete(tableId));
    return loading;
  };
  const tick = async (tableId: string) => {
    if (ticking.has(tableId)) return;
    ticking.add(tableId);
    try {
      const table = await tableFor(tableId);
      await table.advanceDue();
      await table.startIfReady();
    } finally {
      ticking.delete(tableId);
    }
  };
  const json = (response: ServerResponse, status: number, value: unknown) => { response.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(value)); };
  const guest = async (token: string | null, name = 'Guest') => {
    await readyStore();
    if (token) {
      const found = await store.pool.query('select guest_id from poker_guests where token_hash=$1', [hash(token)]);
      if (found.rowCount) return { token, guestId: found.rows[0]!.guest_id as string };
    }
    const fresh = randomBytes(32).toString('base64url');
    const guestId = randomUUID();
    await store.pool.query('insert into poker_guests(token_hash,guest_id,name) values($1,$2,$3)', [hash(fresh), guestId, name.slice(0, 24)]);
    return { token: fresh, guestId };
  };
  const connectionKey = (tableId: string, guestId: string) => `${tableId}:${guestId}`;
  const publish = async (tableId: string) => {
    const table = await tableFor(tableId);
    for (const [key, connection] of connections) {
      if (connection.tableId !== tableId) continue;
      if (connection.socket.readyState !== connection.socket.OPEN) { connections.delete(key); continue; }
      connection.socket.send(JSON.stringify(await table.snapshot(connection.guestId)));
    }
  };

  const server = createServer(async (request, response) => {
    response.setHeader('access-control-allow-origin', process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173');
    response.setHeader('access-control-allow-headers', 'authorization,content-type');
    response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    if (request.method === 'OPTIONS') { response.writeHead(204).end(); return; }
    try {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
      if (request.method === 'GET' && url.pathname === '/health') { json(response, 200, { ok: true }); return; }
      if (request.method === 'POST' && url.pathname === '/api/session') {
        const requested = JSON.parse(await body(request) || '{}') as { name?: string };
        const identity = await guest(bearer(request), requested.name);
        const ticket = randomBytes(24).toString('base64url');
        const expiresAt = Date.now() + 60_000;
        await store.issueTicket(identity.guestId, hash(ticket), expiresAt);
        json(response, 200, { credential: identity.token, websocketTicket: ticket, expiresIn: 60 });
        return;
      }
      const token = bearer(request);
      const identity = token ? await guest(token) : null;
      if (request.method === 'GET' && url.pathname === '/api/table') {
        const tableId = normalizeTableId(url.searchParams.get('tableId'));
        await tick(tableId);
        const table = await tableFor(tableId);
        json(response, 200, await table.snapshot(identity?.guestId ?? null));
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/command') {
        if (!identity) throw new Error('unauthenticated');
        const incoming = JSON.parse(await body(request)) as Command;
        const tableId = normalizeTableId(incoming.tableId);
        await tick(tableId);
        const table = await tableFor(tableId);
        const result = await table.command(identity.guestId, { ...incoming, tableId });
        await tick(tableId);
        await publish(tableId);
        json(response, 200, result);
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/tick') {
        const tableId = normalizeTableId(url.searchParams.get('tableId'));
        await tick(tableId);
        await publish(tableId);
        json(response, 200, { ok: true });
        return;
      }
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
        const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
        const tableId = normalizeTableId(requestUrl.searchParams.get('tableId'));
        await tick(tableId);
        const table = await tableFor(tableId);
        const ticket = requestUrl.searchParams.get('ticket');
        const guestId = ticket ? await store.consumeTicket(hash(ticket)) : null;
        if (!guestId) { rejectUpgrade(401, 'invalid_ticket'); return; }
        console.info(`poker websocket upgrade: connected ${tableId}`);
        wss.handleUpgrade(request, socket, head, (websocket) => {
          const key = connectionKey(tableId, guestId);
          const previous = connections.get(key)?.socket;
          if (previous && previous !== websocket) previous.close(4001, 'control_replaced');
          connections.set(key, { tableId, guestId, socket: websocket });
          void table.snapshot(guestId).then((snapshot) => {
            if (websocket.readyState !== websocket.OPEN) return;
            websocket.send(JSON.stringify(snapshot));
          }).catch((error) => {
            console.error('poker websocket snapshot failed', error instanceof Error ? error.message : error);
            websocket.close(1011, 'snapshot_failed');
          });
          websocket.on('close', () => { if (connections.get(key)?.socket === websocket) connections.delete(key); });
          websocket.on('message', async (raw) => {
            try {
              const incoming = JSON.parse(raw.toString()) as Command;
              const commandTableId = normalizeTableId(incoming.tableId);
              if (commandTableId !== tableId) throw new Error('wrong_table');
              const responseValue = await table.command(guestId, { ...incoming, tableId: commandTableId });
              await tick(tableId);
              await publish(tableId);
              if (websocket.readyState === websocket.OPEN) websocket.send(JSON.stringify(responseValue));
            } catch (error) {
              if (websocket.readyState === websocket.OPEN) websocket.send(JSON.stringify({ error: error instanceof Error ? error.message : 'server_error' }));
            }
          });
        });
      } catch (error) {
        console.error('poker websocket upgrade failed', error instanceof Error ? error.message : error);
        rejectUpgrade(500, 'upgrade_failed');
      }
    })();
  });

  const scheduler = setInterval(() => {
    const activeTableIds = new Set([...connections.values()].map((connection) => connection.tableId));
    for (const tableId of activeTableIds) void tick(tableId).then(() => publish(tableId)).catch(() => undefined);
  }, 1_000);
  scheduler.unref();
  return {
    server,
    tick,
    close: async () => {
      clearInterval(scheduler);
      for (const connection of connections.values()) connection.socket.close(1001, 'server_closing');
      connections.clear();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await store.pool.end();
    }
  };
}

export const poker = createPokerServer();
export default poker.server;
