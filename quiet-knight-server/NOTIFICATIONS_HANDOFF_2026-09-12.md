# Quiet Knight notifications and Nudge handoff — 2026-09-12

## Release state

The notification runtime is **HELD**. Production was not changed.

- AppDeploy: v41 / `1788969015839`; rollback v40 / `1788967944986`.
- Railway server: deployment `743ce873-7afa-41b1-8bee-6c8f031e7c2e`, commit `02e9c1f866ac9eefdb44f09d147067b42530280d`, build `qk-server-2026-09-08-r5-table-presence`.
- Railway staged patch: `3b485ae1-3c4f-4677-a2d0-dacdef826ffc`, three changes, source commit `b649bd427872dd3d652953403e2514af94b51f5c`.
- That staged source is the held Quiet Review change. Direct Railway tools expose no existing-service source selector and accept-deploy would apply it wholesale. Do not accept it for notifications.
- Postgres and Redis were not changed.

## Candidate source

Branch: `quiet-knight-notifications-2026-09-12`

Backend changes are based directly on the deployed server commit, not current main, so Quiet Review is not mixed into this candidate. The matching frontend directory is an export of authoritative AppDeploy v41 with the candidate changes applied.

### Backend

- `push-notifications.js`: seat-bound, device-specific Web Push subscriptions; VAPID stays server-side; deterministic event IDs; 404/410 cleanup; safe logs.
- `schema.sql`: additive migration 2 with `qk_push_subscriptions` and `qk_push_events`.
- `server.js`: authoritative post-commit move trigger and server-authorized Nudge.
- Nudge rate limit: two-minute cooldown and maximum three accepted nudges per rolling 30-minute window, keyed by room, game, and sender seat digest.
- Push delivery is best-effort and detached from move correctness.

Required Railway variables before release:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (a valid `mailto:` or HTTPS subject)

Do not put any VAPID private key in AppDeploy, GitHub source, logs, diagnostics, or chat.

### Frontend

Candidate directory: `quiet-knight-notifications-frontend/`

- Permission is requested only after the explicit Enable action.
- iPhone/iPad truthfully requires installed Home Screen PWA support.
- Existing service worker architecture is extended, not replaced.
- Foreground relevant-room clients suppress the OS notification.
- Notification click opens only `?room=CODE`; seat recovery remains local.
- Push event IDs are deduplicated in a bounded worker cache.
- Nudge is secondary inside Table controls and is visible only while the opponent is to move.
- Foreground Nudge uses the existing restrained toast.

## Verification completed

- Backend syntax checks.
- `node verify-push.js`: authoritative target, terminal suppression, handle/fallback copy, seat ownership, HTTPS subscription, deterministic dedupe, delivery bookkeeping, permanent-subscription cleanup.
- Frontend TypeScript and production Vite build.
- `node tests/verify-notifications.mjs`: explicit permission action, foreground suppression, background display, dedupe, safe room click, API cache bypass, computer-worker precache.
- Existing production AppDeploy and Railway services inspected read-only.
- Repository AppFarm stack-router skill validated with the native skill validator.

Not completed:

- Real Postgres migration execution.
- Candidate server HTTP/WS/Redis predeploy suite, because no isolated non-production Postgres/Redis/native-Stockfish environment was available here.
- Rendered candidate QA; the controlled cloud browser cannot reach the local preview, and deploying enabled controls without the backend is prohibited.
- Real phone push delivery.

## Safe release sequence after Railway is unblocked

1. Remove or independently resolve staged patch `3b485ae1-3c4f-4677-a2d0-dacdef826ffc` without applying its held Quiet Review commit accidentally.
2. Configure the existing server service to this candidate commit using a direct source-selecting operation that shows the exact commit before deployment.
3. Add VAPID variables through secure secret entry or direct Railway variable tooling; never expose values.
4. Run `node predeploy.js` against Railway's real dependencies. Confirm migration 2 and no scoring/room mutation.
5. Deploy server; verify `/health`, `/push/public-key`, two isolated clients, e4/e5 event count, stale/illegal suppression, Nudge authority/rate limit, and rollback.
6. Only after backend evidence is green, deploy the candidate AppDeploy files as the next normal version.
7. Run 390×844, 360px, and desktop QA for White/Black orientation, Zen, square board, no overflow, Table controls, reduced motion, offline readiness, and safe notification click.
8. Complete two-phone installed-PWA notification acceptance before claiming physical push delivery.

## Non-negotiable preservation

Do not change scoring, pair cap, Knight ID data, Stockfish, local fallback, room authority, seat tokens, swap-rematch identity, material/capture rows, Zen, existing offline cache behavior, Postgres volume, or Redis durability in this release.
