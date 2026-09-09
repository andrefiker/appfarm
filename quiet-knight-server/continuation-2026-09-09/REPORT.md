# Quiet Knight continuation 1–3 — 2026-09-09

Production remains healthy at v37. This continuation is NOT a completed release or final reliability certification. Quiet Review deployment is still blocked by Railway tooling; passkeys remain unimplemented; isolated frontend and physical mobile acceptance remain open. No production deployment, infrastructure/configuration change, schema migration, scoring change or Redis restart was made in this continuation.

## Exact current production

| Item | State and evidence |
|---|---|
| AppDeploy app | quiet-knight-live-v2xp3y |
| Applied version / snapshot | v37 / 1788920004629, reconfirmed from current source and version list |
| Label | QK • v37 • A quieter table |
| URL | https://quiet-knight-live-v2xp3y.v2.appdeploy.ai/ |
| Rollback | Current v37 snapshot retained; previous v36 / 1788913697012 retained |
| Railway project/environment | f2d8791f-86d0-41ca-9a7e-3a49aaf50a82 / ba8203d2-1f38-489f-baf5-5adcba0705b1 |
| Server service | 7b7d4944-e8b1-44f1-a862-010713570311 |
| Server deployment | 743ce873-7afa-41b1-8bee-6c8f031e7c2e, SUCCESS/Online |
| Backend build | qk-server-2026-09-08-r5-table-presence, also observed in current app diagnostics |
| Deployed source commit | 02e9c1f866ac9eefdb44f09d147067b42530280d, running configuration |
| Port / replicas | 3000 / one iad replica in running configuration; status list leaves numReplicas null |
| Backend URL | https://quiet-knight-server-production.up.railway.app |
| Postgres service | de1e91d1-4de8-4984-8225-b17e3b61d734 |
| Postgres deployment | 52fd82d2-bb3a-4d16-8cbb-4d142ac56fab, SUCCESS/Online |
| Postgres volume | e6c3c959-cc46-488b-8402-56582c36bf6a, 500 MB, /var/lib/postgresql/data, iad |
| Database migration | Migration 1 and PostgreSQL 18.6 are the last documented/source state; not freshly queried through SQL in this continuation. No migration applied. |
| Postgres passkeys | No passkey schema or authentication shipped |
| Redis service | 5fd21ffb-9a38-4f13-884c-bdd41d9eb88b, redis:7-alpine |
| Redis deployment | eca0ab1e-606a-4800-aa1e-e089afa508e0, SUCCESS/Online |
| Redis volume/new service | None / none |
| PostHog | Unchanged, no instrumentation added |

Current GitHub main is b0c4a5de88edc3e5cc5d8ec49fb5b787ccd50074. Its held backend is newer than deployed r5. It is not evidence that Railway runs main. v37 mobile source/evidence remains on quiet-knight-mobile-table-2026-09-09; newer v37 evidence overrides older v36 handoff prose.

## Railway release blocker

Direct tools still show 21 unapplied changes in STAGED patch **3b485ae1-3c4f-4677-a2d0-dacdef826ffc**. The server delta includes intended b649bd427872dd3d652953403e2514af94b51f5c source and pending variable names PORT, FRONTEND_ORIGIN, REDIS_URL and DATABASE_URL. Postgres has an unintended configuration delta, including iad stackerAssignment:null and twelve pending variable names. Values remain redacted; no credentials were copied into evidence.

Read-only agent guidance said it supports discarding all unapplied changes, not selective discard. The subsequent request to discard only those UNAPPLIED deltas failed with **“Agent usage limit reached. Update your limit in usage settings.”** No discard, accept, deployment or running-variable edit occurred. A fresh direct status check reconfirmed the same patch and all three running deployment IDs. This is a Railway provider quota blocker, not an automatic approval-review rejection or a request for deployment permission.

The user already authorizes deployment. The required unblock is working Railway configuration tooling and direct proof that the server change is isolated from Postgres. Do not accept the current mixed patch or bypass the failed connector through the provider dashboard.

## Quiet Review

- Backend: held code exists, not live. Current production r5 has no shipped review endpoint.
- Frontend: logically rebased onto current v37 and saved as a narrow patch here; not deployed or rendered in this continuation. No v35 whole-file overwrite.
- UI placement: finished-game Table controls and saved final-position view; no board displacement. At most three calm cards; cancel and bounded timeout; durable game ID preserved in memory/records/diagnostics status.
- Local native Stockfish 18 suite passed completed-history validation, unfinished rejection, FEN mismatch, malformed/injected move rejection, 160-ply cap, legal suggestions, max three moments, shared busy rejection, cancellation and deadline cleanup. Initial acceptance runtime 880 ms.
- Additional native matrix: repetition draw 8 plies/1081 ms; tactical Scholar mate 7 plies/764 ms; short mate 4 plies/677 ms; long 150-ply trusted resignation fixture/2513 ms. All passed legality, bounded moments/deadline and unchanged input history. The long fixture uses allowResignation:true in the local harness; it is not a real durable production result. The draw produced one moment; empty-result wording is implemented but was not observed from this engine run.
- Cache: durable-ID cache path exists in source. Real HTTP/SQL cached-repeat test is authored; NOT executed this continuation. No claim of production cache verification.
- Mutation: source review route only reads completed records and writes qk_games.review. Added held gate compares scored-game room fields, public player stats and complete ledger except review cache before/after. Syntax/apply checks passed; real SQL execution remains required. Local input immutability does not certify room/scoring immutability.

## Passkeys

Registration/recovery are not implemented, deployed or tested. No new device bearer credential was minted, and no schema changed. Existing device-bound Knight ID remains usable.

Design constraint identified: current identity has one legacy credential hash on qk_players. Recovery must add durable device-credential storage while retaining that old hash path, otherwise minting a replacement would log out the old device. The future migration must retain player UUID, points, ledger/H2H and seat independence.

Planned RP ID is **quiet-knight-live-v2xp3y.v2.appdeploy.ai**; expected origin is exactly **https://quiet-knight-live-v2xp3y.v2.appdeploy.ai**. This uses the effective frontend domain, not Railway or a broad hosting suffix, per [WebAuthn RP ID rules](https://www.w3.org/TR/webauthn-3/). This is a standards-based design decision, not successful platform registration evidence. No staging-origin exception is proposed. A maintained implementation such as [SimpleWebAuthn](https://simplewebauthn.dev/docs/packages/server) should verify challenges, RP/origin, signature and counters; no bespoke crypto has been written.

The installed control-browser skill explicitly says cloud passkeys are unsupported. Its runtime exposes no isolated browser-context, virtual-authenticator, network-disable or lifecycle-freeze API. No registration ceremony was attempted and no Android certification is claimed.

## Multiplayer and lifecycle

| Required evidence | Current continuation result |
|---|---|
| Actor A role | Existing remembered room HT3ZY3 reloaded into current v37 as White, same Knight ID, Live |
| Actor B role | No independent frontend actor available; seat remains open in that room |
| Same fresh invite, both Live, opponent present | Not executed with two isolated frontend actors |
| e4 / e5 / Nf3 propagation | Not newly executed between two frontend actors |
| Reload | One existing White seat recovered same room, initial position, Waiting for a friend, Live; no computer-game diversion observed in that owned-seat resume path |
| Swap / stale-role move rejection | No new live two-actor test; earlier backend evidence retained, source suites preserved |
| Background return | Browser/Android hidden→opponent move→return sequence not executed this continuation |
| Quiet Points / draw / pair cap / idempotency / H2H | No new production scoring test. Historical isolated backend/database evidence remains historical. |

The substantive frontend-acceptance Playwright suite is retained and inspected; it explicitly uses browser.newContext() for separate actors. It was not run in this Work browser. Shared localStorage tabs were not relabeled as independent actors. No refresh loop was observed during normal reload/play, but this is not a disconnect-storm certification.

## Offline / PWA

Current v37 in-app diagnostic sample at 2026-09-09T02:34:05.018Z:

- Controller true; active worker activated; waiting none; installing none; production root scope.
- Worker/cache build **44189dc788368cd1**; ready=true; marker=true; expected=6; missing list empty.
- One qk-shell-44189dc788368cd1 cache, 10 entries. Current index-BGzXgRYO.js and index-BnoJtuDO.css, computer-worker-CwRSDPc2.js, offline-shell.html, manifest and icon present; previous index-BAfPB_WR.js and index-BEcEW0ek.css retained. Diagnostic display lists a bounded subset of entries.
- Current/previous dependency retention and Railway bypass pass deterministic built-worker tests. No cache repair was needed or made.
- Saved-computer functionality exists and games were played online. Network-disabled resume/local reply, closing an installed PWA and launching from its icon were NOT exercised. Local fallback must continue to be described as the local lightweight engine, not Stockfish.
- Optional offline Stockfish pack deferred: ordinary physical PWA/offline acceptance is still open and no separate pack was installed.

## Redis durability decision

No migration. Tools did not establish a safe old-data export, remaining-TTL copy, verification and rollback path, and Railway staging is blocked. No Redis restart, redeploy, replacement, volume attachment, key copy, TTL reset or deletion occurred. Old Redis remains the current running service; no new Redis or migration rollback target exists.

**Redis durability remains unresolved; live rooms are vulnerable to Redis service replacement.** Completed identities/scoring remain in the existing Postgres ledger. Remaining TTL preservation was not exercised because no migration occurred.

## ACTUALLY VERIFIED

- Current AppDeploy v37 source/version and rendered production; provider status for all three running services; unchanged mixed staged patch after failed discard.
- Real online Stockfish 18 turns: human White L1 e4→e6; human Black L1 computer opened e4; human White L10 e4→e6; human Black L10 computer opened e4. UI reached Your move with correct engine/level/orientation.
- Current v37 Table controls opened/closed, preferences/diagnostics accessible; saved Knight ID shown; existing White room reload recovered Live.
- Desktop 1363×936 browser: board 670×670; 64 squares each exactly 83.75×83.75; no document horizontal overflow. Screenshot production-l10-black.jpg captures the current actual app. Prior v37 390/360 mobile measurements/screenshots are retained in the mobile branch QA release report, not rerun here as new evidence.
- Browser error scan returned 35 chrome-extension-origin metadata errors and zero app-origin errors. AppDeploy reports empty frontend/backend error arrays; its E2E result remains null, not passed.
- Actual controlling-worker readiness and cache inventory as above.
- Real local native Stockfish review execution as described above. This category certifies local engine execution only, not production HTTP/database behavior.

## DETERMINISTIC / SOURCE TESTED

- Current v37 TypeScript/Vite build and seven preserved suites: phase1 lifecycle; phase2 chess/UI behavior; table protocol; built offline worker; frontend Stockfish adapter; keepsakes; share fallbacks.
- Rebased held frontend TypeScript/Vite build, completed-only review input, exact FEN/history, durable-ID request and rejection of unsupported raw resignation. Patch apply-check and baseline-source comparison passed. Three baseline files differed only by one redundant export newline, normalized before hash capture.
- Native review rejection/busy/cancel/deadline assertions and matrix legality/input immutability.
- Stronger real-server SQL/cache/mutation gate added as a separate held patch: syntax/apply tested only. Existing substantive isolated-browser acceptance retained; not executed.
- Passkey schema/security work has not been implemented or tested; RP/origin and multi-device credential requirements are design findings only.

## NOT PHYSICALLY VERIFIED

- Two isolated current-frontend actors, same-invite Black ownership and move propagation, live swap authority/reconnect convergence, production scoring/pair cap in this continuation.
- Android screen lock/background recovery; installed-PWA icon relaunch; airplane-mode saved-game resume and actual local engine reply.
- Passkey registration/recovery, virtual authenticator, same-player/new-token/old-token validity checks; no mobile passkey evidence.
- Rendered rebased Quiet Review frontend, production review/cache/no-score-mutation; held backend must pass these before release.
- Physical haptics/audio, native phone share sheet and safe-area behavior; optional offline Stockfish.

## Andre's short physical checklist

A — Two phones: A creates; B opens exact invite; White/Black, both Live; e4/e5/Nf3 without refresh.

B — Background: lock A for 2+ minutes, B moves, return A to same seat/latest move/eventually Live.

C — Passkey, AFTER it ships: A registers; fresh B recovers same handle/points; A remains signed in.

D — Swap: finish, Swap colors, verify actual move ownership changes.

E — PWA: close installed app, launch icon, resume live room.

F — Offline: prepare, save local game, airplane mode, close/relaunch, resume, local engine replies.

G — Quiet Review, AFTER it ships: finish game, Review three moments, repeat saved review.

H — Audio: own click, incoming chime, one opponent-return knock.

The next step is restoring Railway tooling and obtaining an isolated browser/physical test environment. No additional product scope should be started to work around these gates.
