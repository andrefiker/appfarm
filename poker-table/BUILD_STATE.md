# Build state

Stage 1 engine verification remains green. Production now uses Hatchable for the mobile-first PWA frontend and Railway for the authoritative realtime poker server and Postgres persistence.

Current verified production baseline (2026-09-11):
- Hatchable project: `Poker Table` / `poker-table`, version 1, deployed at `https://poker-table.hatchable.site`.
- Railway project: `poker-table-v1`; authoritative service: `PokerServerV1`.
- Railway deployment: `5008c815-5275-4514-9586-38195b17b405` — SUCCESS.
- Railway frontend origin is the Hatchable production hostname.
- WebSocket upgrade reaches origin accepted -> ticket consumed -> connected -> snapshot sent.
- Spectator render preserves recipient privacy: zero opponent face cards observed.
- Exact portrait containment verified at 360x800, 393x852, and 430x900 with five visible seat zones and no horizontal overflow.
- AppDeploy remains an older rollback artifact only; its frontend will require the Railway origin to be restored before it can serve as an active rollback.

Remaining release gate:
- Make the Hatchable project publicly visible from Hatchable Settings; MCP can deploy but cannot change project visibility.
- Obtain one seated-identity reconnect proof on the Hatchable frontend. The current persistent table is full, so the automated fresh-guest check can only verify spectator reconnect until a seat becomes available.
- Re-run the full production hand/private-state regression after that seated reconnect proof.

Quiet Knight resources remain untouched.
