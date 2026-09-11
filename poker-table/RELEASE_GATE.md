# Release gate

Do not call Poker Table production-ready unless all of the following are true:

1. Engine verification passes for both supported variants.
2. Server tests preserve recipient-specific private views, bot-observation isolation, idempotent commands, chip conservation, and legal-action invariants.
3. Railway `PokerServerV1` is healthy, uses the isolated Poker Postgres database, and passes HTTP + WebSocket production checks.
4. WebSocket authentication proves: allowed Hatchable origin -> valid one-time ticket -> connection -> recipient-specific snapshot.
5. Hatchable production frontend renders all five seat zones without horizontal overflow at 360x800, 393x852, and 430x900.
6. Spectators receive no private card faces or deck information.
7. A real seated identity survives disconnect/reload and returns to the same authoritative seat/state without duplicating control.
8. One production Hold’em hand and one Five-Card Draw flow complete with legal server-derived actions and private-state isolation.
9. PWA service-worker migration does not serve stale game state or stale frontend assets.
10. Source commit, Hatchable deployment version, Railway deployment ID, DB schema/version, and rollback target are recorded.
11. Quiet Knight source and runtime resources are untouched.

Current HOLD: Hatchable v1 + Railway connectivity, spectator privacy, and exact viewport containment pass. Public Hatchable visibility plus seated reconnect proof and the final production hand regression remain before release approval.
