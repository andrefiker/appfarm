# Pocket Table Server

Private, server-authoritative Pocket Table rooms.

- Pocket ID handle/password auth, scrypt password hashing.
- 30-day bearer sessions; bearer tokens are stored hashed in Postgres.
- One-use 60-second WebSocket tickets so long-lived session tokens never appear in WS URLs.
- Private room code only. No public lobby and no spectators.
- 2–5 seats. Optional local-style bots fill empty seats.
- NL Hold'em and Fixed-Limit Five-Card Draw use the same Pocket Table rules engine.
- Recipient-scoped state: another player's hole cards are never sent before showdown; folded cards stay hidden.
- Room snapshots persist to Postgres for restart recovery.
- Single Railway app replica is the intended v1 topology; Redis is deliberately omitted until multi-replica coordination is actually needed.

## Required environment
- DATABASE_URL
- CORS_ORIGIN
- PORT is supplied by Railway.

## Health
GET /health
