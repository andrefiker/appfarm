import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import { migrate } from './db.js';
import {
  consumeSocketTicket,
  issueSocketTicket,
  login,
  register,
  userFromRequest,
} from './auth.js';
import {
  applyAction,
  applyDraw,
  createRoom,
  joinRoom,
  loadRoom,
  nextHand,
  safePayload,
  startRoom,
} from './rooms.js';

const PORT = Number(process.env.PORT ?? 8080);
const ORIGIN = process.env.CORS_ORIGIN ?? '*';

function cors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Vary', 'Origin');
}

function send(res: ServerResponse, status: number, body: unknown): void {
  cors(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  if (text.length > 50_000) throw new Error('Request too large');
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('JSON object required');
  }
  return parsed as Record<string, unknown>;
}

async function requireUser(req: IncomingMessage) {
  const user = await userFromRequest(req);
  if (!user) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  return user;
}

const sockets = new Map<string, Set<{ ws: WebSocket; userId: string }>>();

async function broadcastRoom(code: string): Promise<void> {
  const peers = sockets.get(code);
  if (!peers?.size) return;
  const room = await loadRoom(code);
  if (!room) return;
  for (const peer of peers) {
    if (peer.ws.readyState !== peer.ws.OPEN) continue;
    try {
      peer.ws.send(JSON.stringify({ type: 'state', payload: safePayload(room, peer.userId) }));
    } catch {
      // A broken socket will be removed by close/error.
    }
  }
}

async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/health') {
    send(res, 200, { ok: true, service: 'pocket-table-server' });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/auth/register') {
    const data = await body(req);
    const result = await register(String(data.handle ?? ''), String(data.password ?? ''));
    send(res, 201, result);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/auth/login') {
    const data = await body(req);
    const result = await login(String(data.handle ?? ''), String(data.password ?? ''));
    send(res, 200, result);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/auth/me') {
    const user = await requireUser(req);
    send(res, 200, { user });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/auth/socket-ticket') {
    const user = await requireUser(req);
    send(res, 200, { ticket: issueSocketTicket(user.id) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/rooms') {
    const user = await requireUser(req);
    const data = await body(req);
    const room = await createRoom(user.id, {
      variant: data.variant as never,
      seats: Number(data.seats),
      startingStack: Number(data.startingStack),
      botLevel: Number(data.botLevel) as never,
      botMix: data.botMix as never,
      fillBots: Boolean(data.fillBots),
    });
    send(res, 201, safePayload(room, user.id));
    return;
  }

  const roomMatch = url.pathname.match(/^\/rooms\/([A-Za-z0-9]{6})(?:\/(join|start|action|draw|next))?$/);
  if (roomMatch) {
    const code = roomMatch[1]!.toUpperCase();
    const op = roomMatch[2];
    const user = await requireUser(req);

    if (req.method === 'GET' && !op) {
      const room = await loadRoom(code);
      if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });
      send(res, 200, safePayload(room, user.id));
      return;
    }

    if (req.method === 'POST' && op === 'join') {
      const room = await joinRoom(code, user.id);
      send(res, 200, safePayload(room, user.id));
      await broadcastRoom(code);
      return;
    }

    if (req.method === 'POST' && op === 'start') {
      const room = await startRoom(code, user.id);
      send(res, 200, safePayload(room, user.id));
      await broadcastRoom(code);
      return;
    }

    if (req.method === 'POST' && op === 'action') {
      const data = await body(req);
      const action = data.action as {
        type: 'fold' | 'check' | 'call' | 'betTo' | 'raiseTo';
        amount?: number;
      };
      const room = await applyAction(code, user.id, action);
      send(res, 200, safePayload(room, user.id));
      await broadcastRoom(code);
      return;
    }

    if (req.method === 'POST' && op === 'draw') {
      const data = await body(req);
      const indexes = Array.isArray(data.indexes) ? data.indexes.map(Number) : [];
      const room = await applyDraw(code, user.id, indexes);
      send(res, 200, safePayload(room, user.id));
      await broadcastRoom(code);
      return;
    }

    if (req.method === 'POST' && op === 'next') {
      const room = await nextHand(code, user.id);
      send(res, 200, safePayload(room, user.id));
      await broadcastRoom(code);
      return;
    }
  }

  send(res, 404, { error: 'Not found' });
}

await migrate();

const server = http.createServer((req, res) => {
  void route(req, res).catch(error => {
    const status =
      typeof (error as { status?: unknown }).status === 'number'
        ? (error as { status: number }).status
        : 400;
    console.error(error);
    send(res, status, { error: error instanceof Error ? error.message : 'Request failed' });
  });
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  void (async () => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }
    if (ORIGIN !== '*' && req.headers.origin !== ORIGIN) {
      socket.destroy();
      return;
    }
    const code = (url.searchParams.get('room') ?? '').toUpperCase();
    const userId = consumeSocketTicket(url.searchParams.get('ticket') ?? undefined);
    if (!userId || !/^[A-Z0-9]{6}$/.test(code)) {
      socket.destroy();
      return;
    }
    const room = await loadRoom(code);
    if (!room || !room.members.some(member => member.userId === userId)) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, ws => {
      const peer = { ws, userId };
      const roomPeers = sockets.get(code) ?? new Set();
      roomPeers.add(peer);
      sockets.set(code, roomPeers);

      ws.on('close', () => {
        roomPeers.delete(peer);
        if (!roomPeers.size) sockets.delete(code);
      });
      ws.on('error', () => {
        roomPeers.delete(peer);
        if (!roomPeers.size) sockets.delete(code);
      });
      ws.on('message', data => {
        void (async () => {
          try {
            const message = JSON.parse(data.toString()) as {
              type?: string;
              action?: {
                type: 'fold' | 'check' | 'call' | 'betTo' | 'raiseTo';
                amount?: number;
              };
              indexes?: number[];
            };
            if (message.type === 'action' && message.action) {
              await applyAction(code, userId, message.action);
            } else if (message.type === 'draw') {
              await applyDraw(code, userId, message.indexes ?? []);
            } else if (message.type === 'start') {
              await startRoom(code, userId);
            } else if (message.type === 'next') {
              await nextHand(code, userId);
            } else {
              throw new Error('Unknown message');
            }
            await broadcastRoom(code);
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Action failed',
            }));
          }
        })();
      });

      ws.send(JSON.stringify({ type: 'state', payload: safePayload(room, userId) }));
    });
  })().catch(() => socket.destroy());
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Pocket Table server listening on ${PORT}`);
});
