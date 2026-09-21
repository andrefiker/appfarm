# Quiet Knight Lite

Temporary, isolated multiplayer chess for Railway. A single Node process serves the frontend, the authoritative HTTP API, and WebSocket room updates. Rooms are in memory and disappear when the service restarts.

```bash
npm install
npm test
npm start
```

The production clock is fixed at 10+0. Tests may pass a shorter clock to the exported server factory without changing production behavior.
