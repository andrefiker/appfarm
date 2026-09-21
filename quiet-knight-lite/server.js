import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { GameRoom, roomCode, START_MS } from './game.js';

const here = dirname(fileURLToPath(import.meta.url));

export function createQuietKnightServer({ clockMs = START_MS, tickMs = 250 } = {}) {
  const app = express();
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ noServer: true });
  const rooms = new Map();
  const clients = new Map();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', (_request, response) => {
    response.json({ ok: true, service: 'quiet-knight-lite', rooms: rooms.size });
  });

  app.post('/api/rooms', (_request, response) => {
    let code;
    do code = roomCode(); while (rooms.has(code));
    const room = new GameRoom(code, { clockMs });
    const token = room.createWhite();
    rooms.set(code, room);
    response.status(201).json({ code, seatToken: token, state: room.stateFor(token) });
  });

  app.post('/api/rooms/:code/join', (request, response) => {
    const room = findRoom(rooms, request.params.code);
    const joined = room.join(request.body?.seatToken);
    broadcast(room, clients);
    response.json({ code: room.code, seatToken: joined.token, role: joined.role, recovered: joined.recovered, state: room.stateFor(joined.token) });
  });

  app.get('/api/rooms/:code', (request, response) => {
    const room = findRoom(rooms, request.params.code);
    response.json(room.stateFor(tokenFrom(request)));
  });

  app.post('/api/rooms/:code/move', action((room, token, body) => room.move(token, body)));
  app.post('/api/rooms/:code/resign', action((room, token) => room.resign(token)));
  app.post('/api/rooms/:code/draw', action((room, token) => room.offerDraw(token)));
  app.post('/api/rooms/:code/rematch', action((room, token) => room.requestRematch(token)));

  app.use(express.static(join(here, 'public'), { extensions: ['html'], maxAge: '1h' }));
  app.get('*splat', (_request, response) => response.sendFile(join(here, 'public', 'index.html')));

  app.use((error, _request, response, _next) => {
    const status = Number(error.status) || 500;
    if (status >= 500) console.error(error);
    response.status(status).json({ error: status >= 500 ? 'Unexpected server error.' : error.message });
  });

  function action(handler) {
    return (request, response, next) => {
      try {
        const room = findRoom(rooms, request.params.code);
        handler(room, tokenFrom(request), request.body || {});
        broadcast(room, clients);
        response.json(room.stateFor(tokenFrom(request)));
      } catch (error) {
        next(error);
      }
    };
  }

  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname !== '/ws') return socket.destroy();
    const code = normalizeCode(url.searchParams.get('room'));
    const room = rooms.get(code);
    if (!room) return socket.destroy();
    request.qk = { code, token: url.searchParams.get('token') || null };
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
  });

  wss.on('connection', (ws, request) => {
    const { code, token } = request.qk;
    clients.set(ws, { code, token });
    const room = rooms.get(code);
    if (room) sendState(ws, room, token);
    ws.on('close', () => clients.delete(ws));
    ws.on('error', () => clients.delete(ws));
  });

  const ticker = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      const beforeSecond = Math.ceil(room.currentClocks(now)[room.activeColor] / 1000);
      const expired = room.syncClock(now);
      const afterSecond = room.activeColor ? Math.ceil(room.currentClocks(now)[room.activeColor] / 1000) : -1;
      if (expired || beforeSecond !== afterSecond) broadcast(room, clients, now);
    }
  }, tickMs);
  ticker.unref();

  function close() {
    clearInterval(ticker);
    for (const client of clients.keys()) client.close();
    return new Promise((resolve, reject) => {
      wss.close(() => httpServer.close((error) => error ? reject(error) : resolve()));
    });
  }

  return { app, httpServer, rooms, close };

  function findRoom(roomMap, rawCode) {
    const room = roomMap.get(normalizeCode(rawCode));
    if (!room) throw Object.assign(new Error('Room not found.'), { status: 404 });
    return room;
  }

  function broadcast(room, clientMap, now = Date.now()) {
    for (const [client, identity] of clientMap.entries()) {
      if (identity.code === room.code && client.readyState === WebSocket.OPEN) sendState(client, room, identity.token, now);
    }
  }
}

function sendState(ws, room, token, now = Date.now()) {
  ws.send(JSON.stringify({ type: 'state', state: room.stateFor(token, now) }));
}

function tokenFrom(request) {
  return request.get('x-seat-token') || request.query?.seatToken || null;
}

function normalizeCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  const server = createQuietKnightServer();
  server.httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Quiet Knight Lite listening on ${port}`);
  });
}
