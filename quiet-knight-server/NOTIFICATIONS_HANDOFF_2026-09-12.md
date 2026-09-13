# Quiet Knight notifications and Nudge release handoff — 2026-09-13

## Release state

Move notifications and Nudge are live in the existing Quiet Knight architecture.

- AppDeploy: v42 / `1789257319961`, label `QK • Your move`.
- URL: https://quiet-knight-live-v2xp3y.v2.appdeploy.ai/
- Immediate frontend rollback: v41 / `1788969015839`.
- Railway server deployment: `1bbcadaa-0527-4c03-842e-1a40a7d15765`.
- Railway source commit: `769bd9556306dc863691210f5bbb35c1a73feacd`.
- Backend build: `qk-server-2026-09-12-r7-move-notifications`.
- Health check: successful on port 3000.
- The old mixed 21-change staged patch no longer remains. Before release it had narrowed to three source-only changes. The direct deploy resolved to the safe current main commit above; the held Quiet Review server was not shipped.

## Runtime architecture

Quiet Knight remains AppDeploy frontend + Railway authoritative Node/WebSocket server + Railway Postgres + Railway Redis + native Stockfish. Hatchable was not added because a sidecar would duplicate coordination without simplifying authority.

### Postgres

Additive migration 2 is live. It adds:

- `qk_push_subscriptions`: device-specific, endpoint-deduplicated Web Push subscriptions associated with a Knight ID when available and with a server-side seat digest for room guests.
- `qk_push_events`: deterministic delivery-event deduplication and bookkeeping.

No existing player, credential, score, game, or ledger table was rebuilt or rewritten. The production volume remains mounted at `/var/lib/postgresql/data`.

### Redis

Redis service `5fd21ffb-9a38-4f13-884c-bdd41d9eb88b` was not restarted, migrated, replaced, or given a volume. Nudge rate-limit keys are transient and namespaced by room, game, and sender seat digest. Active-room durability remains limited if the Redis service is replaced.

## Move notifications

- Permission is requested only after the player presses **Enable move notifications** in Table controls.
- Unsupported and permission-blocked states are explicit; iPhone/iPad guidance requires an installed Home Screen PWA where applicable.
- VAPID public/private keys are configured only on the Railway server. Secret values do not appear in frontend source, GitHub, diagnostics, or this handoff.
- A subscription is device-specific and bound by the server to the submitted real seat token through a digest; raw seat tokens are not stored in the push table.
- A legal move is validated and committed before the server plans delivery. Push failure cannot reject or roll back the move or its WebSocket broadcast.
- Delivery targets the other person, not the mover or a spectator. Swap-color rematches follow current authenticated seat ownership rather than stale color labels.
- The event identity is deterministic from room, game number, committed room version, and move event. Server and worker dedupe prevent repeat display.
- Terminal moves, rejected/stale moves, reload, reconnect, room sync, resignation, and repeated room updates do not create a false “Your turn” notification.
- A visible relevant-room client receives its normal live board update and suppresses the OS notification. Background/closed clients can receive Web Push.
- Notification clicks open only `?room=ROOMCODE`; saved local storage recovers the seat. No seat token, join key, Knight credential, FEN, or score is placed in the URL or body.
- Permanent Web Push 404/410 failures disable the stale endpoint safely.

## Nudge

- Nudge is a secondary action inside Table controls.
- It is available only to a seated human player in an active joined room while the opponent is to move.
- The server independently verifies the room, real seat ownership, active status, joined opponent, other-player turn, intended target, and request ID.
- The server enforces a minimum two-minute interval per sender/game and at most three accepted nudges in a rolling 30-minute window. Limited attempts return “Give them a minute.”
- Foreground delivery uses “Your opponent nudged you.”; background delivery uses Web Push.
- Nudge changes no FEN, room version, game number, score, Quiet Points, result, clock, or game ledger.

## Verification

### Actually verified

- Railway deployed the exact commit and passed `/health`.
- Runtime reported identity migration 2 ready and push storage `available:true`, `configured:true`.
- Production `GET /push/public-key` returned 200 after VAPID configuration.
- Real Railway predeploy passed push-unit, identity/Postgres, and server HTTP/WebSocket/Redis suites.
- Live server acceptance exchanged e4/e5 over authoritative HTTP/WebSocket state, recovered seats, preserved seven-day room TTL, and exercised resign/rematch, concurrency, en passant, promotion, and checkmate.
- The live server emitted post-commit opponent delivery plans with zero current subscriptions. This proves trigger/target execution but not phone delivery.
- AppDeploy v42 reached ready with no reported frontend or network errors and produced mobile and desktop QA screenshots.
- Production rendered `QK • Your move`, created a real room, reached Live, exposed the notification setting in Table controls, kept the board square with no horizontal overflow, and kept 39/39 material plus both captured-piece rows visible in normal and Zen modes.
- Production Play Black rendered the Black-at-bottom board, identified Stockfish 18 at level 5, and received an online `POST /computer/move` response with HTTP 200 in 719 ms.

### Deterministic / source tested

- Frontend TypeScript, Vite production build, and notification worker acceptance passed.
- Worker build `b699387e7d2ac05a` precaches all six expected assets including the computer worker and keeps Railway APIs out of caches.
- Foreground suppression, background display, safe click URL, bounded event dedupe, explicit permission action, and public-key subscription flow are covered.
- Backend tests cover authoritative target selection, terminal suppression, seat ownership, HTTPS endpoint validation, deterministic event dedupe, delivery bookkeeping, 404/410 cleanup, Nudge authorization, room immutability, two-minute cooldown, and three-per-30-minute cap.
- The identity suite confirmed handle uniqueness, credential recovery/rejection, guest behavior, W/D/L, score idempotency, rolling pair cap, history, H2H, additive push tables, and the persistent Postgres data directory.

### Physically verified

- Andre previously verified the v37-v41 multiplayer baseline between two real phones. No new physical move-push delivery is claimed by this release.

### Not physically verified

- A real receiving phone displaying a move notification.
- Notification tap returning to the exact room and seat on an installed iOS or Android PWA.
- Two real phones receiving one move notification in each direction.
- Background Nudge delivery and rate-limit copy on a real receiving phone.
- Exact 390×844 and 360px device runs. AppDeploy mobile QA and desktop production rendering passed; these precise device widths remain acceptance specifications.

## AppFarm build skill

The repository skill `skills/appfarm-stack-router/SKILL.md` is updated on main at commit `d172656b99db0640cc6f3847201e69e86ea839b9` and validated with the native skill validator. Native personal-skill installation was unavailable, so this is an explicit repository fallback, not a claimed installed personal skill.

Its core rule is **choose the smallest correct stack**: AppDeploy for frontend-first/PWA ownership, direct Railway for authoritative multiplayer/WebSockets/native binaries/Postgres/justified Redis, and Hatchable alone for new full-stack apps it can cleanly own. Existing successful provider ownership and per-app runtime/data isolation are preserved; Quiet Knight Release Gate overrides generic AppFarm guidance for this app.

## Andre's physical acceptance

1. Phone A and Phone B open the same room and each explicitly enables Move notifications.
2. Background A. B makes a legal move. A should receive one notification: **Quiet Knight — B moved. Your turn.**
3. Tap the notification on A. It should open the same room, recover the same seat, and show the latest position.
4. A moves, then background B. B should receive one notification.
5. While B is to move, A uses **Nudge**. B should receive **A is waiting for your move.**
6. A repeats Nudge immediately. A should see **Give them a minute.**

Do not mark physical delivery complete until a real receiving phone passes these steps.
