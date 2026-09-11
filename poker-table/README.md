# Poker Table

Mobile-first, server-authoritative play-money poker for 2–5 seats with humans, bots, spectators, reconnect, and two variants:

- No-Limit Texas Hold’em
- Fixed-Limit Five-Card Draw

## Production architecture

- Frontend/PWA: Hatchable (`poker-table.hatchable.site`)
- Authoritative server: Railway `PokerServerV1`
- Durable state: isolated Railway Postgres `PokerPostgres`
- Source: `andrefiker/appfarm`, branch `poker-table-deploy-v1`, under `poker-table/`
- Redis: intentionally omitted; the current single durable table does not need a separate coordination layer.

The client sends intents. The Railway server owns game state, legal actions, turn order, deadlines, bots, tickets, persistence, and recipient-specific snapshots. Canonical hidden state is never sent wholesale to every client.

AppDeploy is retained only as an older rollback artifact during the Hatchable migration; it is not the active frontend.

## Verification

```bash
npm ci
npm run verify
```

The current local verification baseline is 26/26 passing. Stage 1 includes deterministic/seeded coverage for both variants, betting/reopening rules, fixed-limit caps, side pots, draw exchanges, hand ranking, and chip-conservation invariants.

Production release additionally requires the gates in `RELEASE_GATE.md`.

## Engine

`engine/` is a pure deterministic TypeScript rules engine. State transitions never mutate their input. `GameState` is canonical server-private state and must not be serialized directly to clients because it contains hidden cards.

Important exports include deck/card utilities, five-card/best-hand ranking, pot splitting, game creation/start, legal action derivation, betting actions, draw exchange, settlement, and invariant checks.

Production callers do not accept a client-controlled deck or entropy source. Deterministic entropy exists only for verification.

## Runtime model

The server persists canonical table state in Postgres and emits recipient-specific views:

- spectators receive public state only;
- a seated player receives only that player’s private hand;
- opponents’ cards remain hidden;
- bots consume observation-scoped state rather than canonical hidden state;
- commands carry action IDs and expected state versions for idempotency/stale-command protection;
- WebSocket connections use short-lived one-time tickets derived from the guest credential.

## Isolation

Poker Table must remain isolated from Quiet Knight. Do not share runtime resources, tables, migrations, or deployment changes between the two apps.
