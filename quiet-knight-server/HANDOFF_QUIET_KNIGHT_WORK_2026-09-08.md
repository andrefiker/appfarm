# NEWEST OVERRIDE — v36 production; Quiet Review deployment held

# Quiet Knight Live — production report, 2026-09-09

The existing app is live with Knight ID, durable Quiet Points, presence, true swap-color rematch, Zen Table, four atmospheres, factual game summary, restrained tactile/idle behavior, PGN/FEN export, local result postcards, and small recent-game memory. The board and URL are preserved. This pass is NOT fully complete: Quiet Review deployment is held by a Railway configuration-tool blocker; passkeys, optional offline Stockfish and physical two-phone/PWA certification remain deferred.

## Exact production

- AppDeploy app `quiet-knight-live-v2xp3y`, version **v36**, snapshot **1788913697012**, build **QK • v36 • Quiet table**.
- URL: https://quiet-knight-live-v2xp3y.v2.appdeploy.ai/
- AppDeploy terminal ready; QA frontend/network errors empty, frontend/backend error arrays empty. E2E is null, NOT a passing two-context test.
- Rollback v35/1788912375648 (Games to remember), v34/1788911930441 (Zen Table), v33/1788911551563 (At the table), v32/1788910640743 (Knight ID), v31/1788909175142 (offline repair), original v28/1788895430651.
- Railway server deployment **743ce873-7afa-41b1-8bee-6c8f031e7c2e**, SUCCESS; build **qk-server-2026-09-08-r5-table-presence**; deployed Git commit **02e9c1f866ac9eefdb44f09d147067b42530280d**. Dockerfile, single iad replica, port3000; native Railway fetch/WS authority preserved.
- Stockfish18: final production frontend received legal `e3` as White against human Black at level1, displayed Stockfish18 and Your move. Backend health build was read through in-app diagnostics. Direct Work-browser navigation to /computer/health is blocked by the browser environment, so it is not a newly observed raw health response.
- Postgres service **de1e91d1-4de8-4984-8225-b17e3b61d734**, deployment **52fd82d2-bb3a-4d16-8cbb-4d142ac56fab**, SUCCESS; PostgreSQL18.6; schema migration1. Volume **e6c3c959-cc46-488b-8402-56582c36bf6a**, 500MB, iad, mounted `/var/lib/postgresql/data`; explicit PGDATA `/var/lib/postgresql/data/pgdata`. Real SQL test verified data_directory lies inside mount. Private networking, no public database proxy. One synthetic ID TableCheck0908 was visibly created/recovered; exact current total player count was not queried. No backup/restore drill or volume-loss guarantee is claimed.
- Redis service **5fd21ffb-9a38-4f13-884c-bdd41d9eb88b**, unchanged deployment **eca0ab1e-606a-4800-aa1e-e089afa508e0**, SUCCESS. redis:7-alpine, no attached volume. Historical default RDB is ephemeral, not replacement durability. Live rooms/pending results remain vulnerable to Redis replacement; completed identity/score ledger is on Postgres. No Redis restart, deletion, volume attachment or credential export occurred.

## Held Railway update — do not accidentally accept it

Main commit **b649bd427872dd3d652953403e2514af94b51f5c** contains completed bounded Quiet Review backend implementation and added predeploy gates, but is NOT deployed.

Provider agent staging created patch **3b485ae1-3c4f-4677-a2d0-dacdef826ffc**. Direct tools show21 environment changes; server delta5 includes intended source.commitSha plus four pending variable names. Postgres delta13 unexpectedly includes `deploy.multiRegionConfig.iad.stackerAssignment:null` and twelve pending variable names. Redis has no staged delta. Variable values were not exposed. Agent calls repeatedly timed out with HTTP504 when asked to remove only the unintended Postgres delta. A later call's execution cell was lost during tool refresh; direct status still proves the patch remains STAGED. No accept-deploy call was made for this patch.

Next required infrastructure action: inspect the exact staged-vs-running values privately, remove the unintended Postgres delta without changing running credentials/data, and stage only the intended server update. Preserve PORT3000, FRONTEND_ORIGIN, REDIS_URL and DATABASE_URL. User already authorized deployment; do not ask again. Do not claim staging clean without direct proof. If the provider tool remains unavailable, leave production unchanged.

Quiet Review UI is preserved under `pending-quiet-review-frontend/`, explicitly unapplied and based on v35. Rebase its small logical changes onto CURRENT AppDeploy remote source, preserving v36 worker retention/build/tests. Do not deploy these older full files wholesale. Only release UI after the server predeploy gates and review cache/no-room-mutation test pass.

## Feature state

- Knight ID: optional3–20 ASCII handle, case-insensitive uniqueness, publicUUID, random256-bit device credential locally; server storesSHA256 hash only. Bearer header, never URLs/diagnostics. Guest mode retained. Existing seat tokens are independent; association freezes for the game.
- Passkeys: not implemented. UI explicitly says device-bound, no passkey recovery yet; clearing storage can lose access. No password/email requirement.
- Quiet Points: human-only, two distinct validIDs, win3/draw1/loss0, first3 scored pair games rolling24h. Transactional ledger unique(room_code,game_number), ordered locks, no double award, no computer points. Fourth game remains playable and clearly casual. Stats/streak are display only.
- Head-to-head and post-game points: live, secondary/expandable. No global leaderboard.
- Presence: seat-authenticated body-only WS hello, safe public booleans, spectator exclusion, server ping/pong cleanup. Currently single-replica aggregation; do not scale replicas without distributed presence. Arrival knock is muted/gesture-aware and coalesced30s; physical audibility not certified.
- Swap rematch: server swaps actual seat tokens/IDs/join digests, increments game_number, resolves current role over active socket, locks until role matches new game. Same colors remains available.
- Zen/Table atmospheres/quiet idle: live. Walnut default; Library/Midnight/Rain CSS variables; board dimensions/pieces unchanged. Zen keeps board/player/turn/exit/settings/reconnect and reveals secondary actions. Three-minute idle dims only secondary UI; warnings wake.2px selection lift, short settle/haptic, reduced-motion support.
- Game so far: factual move number/material/replayed captures/queens/lastSAN, no engine evaluation.
- Postcard and exports: local code-native SVG using existing piece art -> PNG; native file sharing where supported, quiet cancellation, download/text fallback; PGN validates replay/FEN and uses names/result/date; FEN copy. No image generation, hosted image or credentials.
- Table memory: guests max5 local completed tables, deduplicated; Knight ID recent completed games in Postgres; read-only final position.
- Offline: Vary header cache-match bug fixed with ignoreVary on exact public-static URLs. Complete precache before activation, clean embedded offline HTML, network-first navigation, current+previous dependency retention, no Railway APIs cached. Actual browser cache shrank35->9entries, active worker build **41d1ffe683f00ce9**, ready=true, marker=true, expected6, missingempty. Current computer worker included. Saved seats/ID/theme/Zen survived. No forced reload loop.
- Optional stronger offline Stockfish pack: not installed; deferred until physical base-PWA offline acceptance. Online is real Stockfish18; offline remains explicitly labelled local engine. GPL/source attribution retained.
- Legacy: import trace confirms AppDeploy backend scaffold modules import each other; retained existing quarantine comments. src/realtime-controller.ts is not imported by production frontend. Active path remains network.ts/use-room-realtime.ts -> Railway. Nothing blindly deleted.

## Actually verified

- Live browser: ID TableCheck0908 created/recovered after reload; current roomHT3ZY3 retains White and Live after upgrades; Rain/Zen/settings preserved; UI renders; completed guest game AF7WYY renders checkmate, CopyPGN reports copied, postcard preview uses final board and Downloadpostcard reports downloaded. Final Stockfish18 level1 White replye3 to humanBlack.
- Real candidate backend on Railway plus real Redis and isolated real Postgres schema passed full preserved verify-live and identity/server acceptance before current r5 deployment. Two WS actors, immediate snapshots, e4/e5 propagation, authority guards, seat recovery, heartbeat, concurrent joins/moves, TTL7days, enpassant, promotion/captured promoted queen, mate, resign/rematch.
- Real SQL tests: handle uniqueness, credential hash/recovery/rejection, win/draw/loss, concurrent duplicate ledger, five simultaneous pair games competing for3slots, rolling-window expiry, self/guest exclusion, H2H and mounted data directory. Test schemas removed only their own fixtures.
- Scoring evidence: roomSJMMPC game1, ledger **dec212fd-a999-49bb-9185-08d279eec7a9**, White win, +3/+0; repeated reads did not award again. Same/swap rematches reached game4, casual, +0/+0. The test ledger was removed with its isolated schema; the UUID is evidence, not a production recent-game record.
- Earlier frontend+protocol test room7DRH3L: A was actual frontendWhite/Live, B separate protocolBlack; e4/e5/Nf3 propagated without refresh; A navigated away, B playedNc6, A returned sameWhite/latestposition/Live. This is NOT two isolated frontend contexts. Current r5 two-socket backend acceptance again passed e4/e5 and seat recovery.

## Deterministic / source tested

TypeScript and productionVite build; exact-built-worker complete precache including computer worker, Vary matching, invite-query offline fallback, Railway bypass, previous-generation survival and third-generation pruning. Lifecycle fake clocks cover hidden pause/no retry-budget consumption, stale callbacks/versions, focus/pageshow/freeze/BFCache, bounded exhaustion and automatic restart. Presence/role cannot establishLive. Idle wake, diagnostics allowlist, resume pointer boundaries, PGN/FEN validation and bounded guest memory pass.

Held Quiet Review: actual nativeStockfish18 local tests pass completed-only history/FEN/injection/maxplies, <=3legal moments/suggestions, shared busy guard, cancellation and deadline cleanup. Shortmate927ms;150ply benchmark~2498ms,maxevent-loop gap21ms. Backend totaldeadline4800ms,1thread32MB,sharedsinglechild admission. Raw input must end legally; resignation only from durableledger. Cache by completed gameID; no room mutation. SQL-backed review cache endpoint test is authored but NOT executed because r6 deployment is held. UI typecheck/build/input tests passed before being held. No LLM used.

## Not physically verified

Two genuinely isolated current-frontend browser contexts; Android2+minute background/lock return; airplane-mode fully closed installed-PWA relaunch; offline saved-game resume and actual local engine reply after that relaunch; native mobile share sheet; audible ownclick/incomingchime/arrival knock; passkeys and offlineStockfishpack. Work browser supports tabs sharing storage, not isolatedcontexts/network disabling/Android lifecycle. Do not call AppDeploy E2Enull a pass.

Draft PR2's substantive Playwright workflow was inspected, preserved and updated for swap dialog/role orientation in `frontend-acceptance/`; it remains authored and syntax-checked, not executed. Five AppDeploy workflows remain with exactly one[sanity]. Deterministic harnesses are preserved alongside instructions for exporting the current remote source before running them.

## Short physical checklist

A. Two phones: create/open invite; AWhite/BBlack/bothLive; e4,e5,Nf3 without refresh.
B. Lock A2+minutes; Blegalmove; return A:sameseat/latestmove/Live.
C. Create two different KnightIDs; finish: winner+3/loser+0.
D. Swapcolors rematch: boards AND move authorization swap; finish again.
E. Fourth same-pair game in24h: visiblyCasual, playable,+0/+0.
F. Fully close installedPWA; icon launch; Resume live game restoresroom/seat.
G. Prepareoffline, savecomputer, airplanemode, close/relaunch, resume, legalmove/localreply.
H. OnlineStockfish18: levels1and10,bothcolors.
I. Audiblemedia: ownclick,incomingchime,onearrivalknock.
J. ZenTable: fullboard usable; Tablecontrols revealsresign/settings/reconnect.


---
HISTORICAL CHECKPOINTS BELOW. Newest override above wins.

# CURRENT IMPLEMENTATION CHECKPOINT — v33 Knight ID / table presence (2026-09-08 23:53 UTC)

This is an IN-PROGRESS implementation checkpoint, not the final report. Andre's newest 61-section Reliability + Identity + Distinctive Product Pass overrides older restrictions below. Deployments and additive Railway Postgres are explicitly authorized. Optional passwordless Knight IDs and Quiet Points are now intended. Preserve guests, Stockfish, the existing board identity, URL and Redis room authority. Do not invoke image generation. Do not delete existing resources or touch unrelated appfarm projects.

## Exact state
- AppDeploy quiet-knight-live-v2xp3y: v33 / 1788911551563 / QK • v33 • At the table; terminal ready, QA frontend/network errors empty, E2E null (NOT a passed frontend E2E).
- URL https://quiet-knight-live-v2xp3y.v2.appdeploy.ai/
- Rollback v32 / 1788910640743 (Knight ID UI), v31 / 1788909175142 (offline cache repair), original v28 / 1788895430651.
- Railway server deployment 743ce873-7afa-41b1-8bee-6c8f031e7c2e SUCCESS, build qk-server-2026-09-08-r5-table-presence, source commit 02e9c1f866ac9eefdb44f09d147067b42530280d on main. Previous r4 deployment 1dda5656-860c-4b97-b778-5d32deaa47f0 / commit 93d1b3de15761be58a819cbde4e133e4dfb63b34. Original Stockfish rollback f2b8e46d59168f6b48790ba9b697973372c4461f.
- Same Dockerfile builder/root /quiet-knight-server/domain/process port3000.
- New Postgres service de1e91d1-4de8-4984-8225-b17e3b61d734; official ghcr.io/railwayapp-templates/postgres-ssl:18, actual PostgreSQL18.6; deployment 52fd82d2-bb3a-4d16-8cbb-4d142ac56fab SUCCESS.
- Persistent postgres-volume e6c3c959-cc46-488b-8402-56582c36bf6a, 500MB, iad, mounted /var/lib/postgresql/data. PGDATA explicitly /var/lib/postgresql/data/pgdata. Real SQL acceptance confirms data_directory is inside the mount. No public database proxy. DATABASE_URL is a Railway reference; do not expose its rendered value.
- Schema migration1 in schema.sql; tables qk_players, qk_games, qk_migrations.
- Redis service/deployment unchanged eca0ab1e-606a-4800-aa1e-e089afa508e0, no attached volume. DO NOT restart it casually.
- The old staged patch was actually committed with isolated Postgres creation; direct get_status proved clean. Subsequent source edits repeatedly restage existing variable names, values hidden. Last server commit succeeded and direct status again showed no staged changes. Trust direct tools over agent narratives.

## Offline root cause fixed
v29/v30 added safe read-only cache diagnostics. In actual browser cache.keys contained current JS/CSS but cache.match(bare URL) missed them. Cached static responses have Vary: Accept-Encoding, Origin. v31 uses ignoreVary:true ONLY for existing public same-origin static cache lookups (readiness, navigation preparation, static fallback, asset migration). URL identity remains exact; Railway APIs remain bypassed.
Actual browser v31 reported build464d408eb55fdb96, ready=true, marker=true, expected6, missing empty, and Computer files saved for offline play after reload. v32 also prepared successfully. No seat/local-save clearing or forced reload.
Current cache retention still copies all historical asset hashes. This remains a planned bounded-generation cleanup, not finished.
Files: src/cache-diagnostics.ts, src/diagnostics.ts, public/sw.js. Diagnostics only allowlisted static paths/header names, never cache body or credentials.

## Implemented so far
- Optional device-bound Knight ID, unique case-insensitive 3–20-character handle; server-generated32-byte credential, only SHA256 hash stored in Postgres. Bearer HTTP header, never URL. qk-player-token-v1 locally. Profile and guest-mode preference separate. Guest mode preserves credential, does not delete seats.
- Passkeys NOT implemented. UI says this ID lives on the device and storage loss can lose access. Work browser disallows passkey interaction; do not pretend recovery exists.
- Device profile/stats, Quiet Points, recent records returned by GET /players/me; small Home chip and profile dialog. Recent final-board viewing still pending.
- Knight ID assigned on new White/Black seat only; seat resumes bypass identity authentication and association remains frozen. Existing qk-seat-CODE and qk-last-live-room retained.
- Completed result ledger unique(room_code,game_number). game_number defaults1 for old rooms. Atomic PG transaction locks game/pair/players, records result and awards win3/draw1/loss0. First3 scored games for two distinct IDs within rolling24h; further games casual. Guests/self/computer get no points. Redis final state is saved before scoring; pending record retried on room read/heartbeat/rematch; identified rematch waits if result not durably recorded.
- Same/swap-color rematches swap actual seat tokens, player associations and join digests, increment game_number; original join key resumes correct new color. WS seat.role confirms role/game_number; frontend locks moves until role belongs to current game.
- Presence via presence.hello body, only credential digest retained on socket; public presence.update booleans. Spectators excluded. Server ping/pong20s, terminate after missing next pong. Current presence aggregation is within the currently configured single server replica; do not scale replicas without adding distributed presence.
- v33 presence label, quiet two-tap synthesized arrival knock with30s dedup and no initial-hydration knock, optional head-to-head sheet, Swap colors primary and Same colors secondary.
- Stockfish18 move endpoint/limits preserved; log field app_level avoids Railway severity collision.

## Actually exercised
- Real production browser v32: created synthetic TableCheck0908 Knight ID (do not reserve Andre's handle), reload recovered it with0points; created room HT3ZY3 with named White seat; Live. Existing room7DRH3L retained White and version7 across backend replacements; diagnostics r4 and Live after automatic reconnect.
- Online Stockfish still returned legal moves after each backend upgrade; runtime logs confirm.
- Real Postgres verify-identity.js runs in a random isolated SQL schema and removes only its own fixtures. Passes uniqueness/auth/hash/recovery, win/draw/loss, concurrent duplicate recording, five simultaneous games competing for three scoring slots, rolling-window expiry, self/guest exclusion, legal result/history, head-to-head, migration idempotency and mounted data_directory.
- predeploy.js now explicitly runs verify-identity.js THEN verify-server.js. Do NOT use a chained preDeployCommand: logs for the earlier string only proved first script. Current preDeployCommand is ["node predeploy.js"] and final predeploy.complete marker proves both.
- verify-server.js starts candidate HTTP/WS server on loopback39173 with isolated PG schema but real existing Redis, creates fresh synthetic rooms (never occupied user seats), and runs preserved verify-live.js in full. All pass: health/CORS/preflight, create/join/idempotent Black/spectator, immediate2socket snapshots, e4/e5 propagation, authority guards, reconnect/seat resume, Redis7dayTTL, resign/rematch, heartbeat, concurrent joins/moves, en passant, both promotions/captured promoted queen/checkmate.
- Extended HTTP tests pass: two Knight IDs attach, winner3/loser0, idempotent reads, swap/same rematches, Black join-key recovery after swap, actual move authorization after swap, presence away/return/spectator exclusion/private roles, fourth-game casual.
- Evidence from deployment743ce873: backend test room WC696P; scoring test room SJMMPC, first game ledger UUID dec212fd-a999-49bb-9185-08d279eec7a9, game_number4 casual. These identity/ledger fixtures were removed with their isolated SQL schema, so this UUID is test evidence, not a production history record.
- Frontend deterministic lifecycle suite passes; additional protocol test proves presence/role messages cannot set Live, token is body-only, stale role/retired socket ignored, return re-identifies seat.
- Vite production build and TypeScript pass; exact built SW mock passes complete shell+computer-worker cache, invite-query fallback, old assets and Railway bypass.

## Explicit remaining work — continue implementation
1. Real-browser v33 verification after applied update; fresh TWO isolated frontend contexts and Android physical backgrounding remain unverified (available Work browser tabs share storage; no claim of two-phone certification).
2. Zen Table persisted, board/bars/status prominent, controls revealable; retain exit/settings/reconnect/resign.
3. Game-so-far factual summary; selection lift2–3px/haptic, short settle/reduced motion; quiet idle dim secondary UI with wake on touch/move/presence/warning.
4. Walnut(default), Library, Midnight, Rain CSS atmospheres; never tilt/shrink/redesign board or replace pieces.
5. PGN/FEN export; minimal code-native result postcard, native file share/download/text fallback.
6. Bounded postgame Quiet Review using existing native Stockfish only, completed valid histories, finite deadline/maxplies, one engine job, cancellation, no multiplayer mutation, <=3 meaningful moments, cached by ledger ID.
7. Tiny table memory: IDs from ledger, guests local; view final position. Recent ID records exist but final-position action not connected yet.
8. Bounded SW asset-generation retention current+previous; verify safe upgrades/offline. Do not cache Railway/online engine responses.
9. Redis durability evaluation without restarting existing Redis; preserve active data or leave unchanged with exact procedure.
10. Trace legacy imports, quarantine only confirmed inactive AppDeploy realtime/backend.
11. Optional strong offline Stockfish pack ONLY after ordinary network-disabled relaunch verified. Otherwise scoped follow-up; preserve lighter local fallback. Passkeys optional, no passwords/email mandatory.
12. Full regression and exact final report distinguishing actual/deterministic/notphysical; physical checklist live e4/e5/Nf3,2min lock-return,ID3/0,swap,fourth casual,PWA resume,airplane-mode saved-game local reply,Stockfish1/10bothcolors,audio,Zen.

Do not add accounts as a gate, matchmaking/chat/leaderboards/ads/subscriptions/ratings/achievements or live engine eval. Quiet Points are continuity, not Elo. Preserve actual-history capture accounting and on-board material39each. Keep five substantive AppDeploy workflows with exactly one [sanity].

---

# CURRENT OVERRIDE — v28 Stockfish deployment (2026-09-08 19:30 UTC)

Andre explicitly authorized replacing the weak computer opponent with Stockfish via Railway, then waived the earlier deployment prohibition. This supersedes older instructions below that forbid Stockfish in that pass.

## Current production

- AppDeploy Quiet Knight Live / quiet-knight-live-v2xp3y
- URL: https://quiet-knight-live-v2xp3y.v2.appdeploy.ai/
- v28, snapshot 1788895430651, build QK • v28 • Stockfish
- Frontend rollback: v27 / 1788891840145 (v26 / 1788890862747 also available).
- Railway deployment: 64b5827d-ad54-4692-bac4-1cf35273f6e2, SUCCESS
- Server build: qk-server-2026-09-08-r3-stockfish
- Deployed source commit: f2b8e46d59168f6b48790ba9b697973372c4461f, main, merged PR https://github.com/andrefiker/appfarm/pull/3
- Source root /quiet-knight-server; explicit Dockerfile builder; port3000 and frontend origin verified in runtime.
- Previous server rollback: 036ac6d2-a6da-4dbd-a8a0-e2e4e1973a24 / d1332884fd380aed96fb24c7c0416912a0c5a5d8.
- Redis unchanged: deployment eca0ab1e-606a-4800-aa1e-e089afa508e0. No attached persistent volume; do not restart it casually.

## What changed

Real, unmodified Stockfish18 in a native child on the EXISTING Railway server; no new service or stack. Official release digest verified locally and in build logs. Source and license retained in container; attribution and source links in Settings.
App levels1–10 map to native skills0,2,4,7,9,11,14,16,18,20. No Elo claims. One process/thread,32MB hash,80–650ms search budget,3s process deadline, bounded admission and cancellation. See STOCKFISH.md and stockfish.js.
GET /computer/health and POST /computer/move are separate from rooms. Full legal history plus expected FEN validated; reply legality checked server and frontend.
Frontend stockfish-client.ts and use-computer-opponent.ts request Stockfish when online, retry busy responses at most twice with5.5s total timeout, reject retired/reset responses, and retain cached custom worker offline. A failed online request shows a visible local fallback notice. Player bar and diagnostics identify actual engine; next online turn retries Stockfish.
No board/art/audio/multiplayer-hook or service-worker behavior changes in v28. Five substantive AppDeploy workflows retained; exactly one sanity test. Computer workflow updated.

## Actually verified this pass

- Native Stockfish18 locally: all ten skill settings produce legal replies; White Qxf7# and Black Qh4# mate in one; invalid history/UCI injection/FEN mismatch rejected; terminal position; busy protection; cancellation/recovery; deadline; missing executable. Node event loop max26ms observed during native search. Local complete request times~0.6–1.4s including cold process launch.
- TypeScript check and production Vite build pass.
- Deterministic frontend hook tests: successful remote response, leaving and reset stale-reply guards, explicit fallback, offline zero remote request, online recovery.
- Existing deterministic reconnect/diagnostics/resume suite passes.
- Exact built SW mock: complete precache, computer worker asset included, old asset survival, offline navigation and Railway bypass pass. This is NOT a physical offline relaunch test.
- AppDeploy ready, frontend/backend errors empty, QA network errors empty. e2e_tests=null, NOT a passed E2E suite.
- Actual public app in browser: v28 renders; play Black at level10 -> Stockfish White e4; human e5 -> Stockfish Nf3; reload and Resume saved computer game preserves position.
- Actual public app: play White at level1 -> e4, Stockfish Black c6. UI identifies Stockfish18. Railway logs corroborate skill20 (~890ms) and skill0 (~325ms).
- Actual Settings diagnostics: v28, r3-stockfish, Computer Stockfish18; no seat credentials.
- Existing synthetic live room7DRH3L survived server replacement with White ownership and full prior e4,e5,Nf3,Nc6 history. First resume attempt failed generically despite server HTTP200; manual retry succeeded, authoritative WS Live. White Nc3 saved/broadcast version7. Do not conceal the initial retry.

## Explicit limitations / remaining checks

- Executor direct public API tests were blocked by network approval cancellation. Full verify-live.js including Redis could not run from this executor; Railway agent lacks container execution and direct Redis-query tools. The substantive suite remains intact in GitHub.
- Two isolated browser contexts not available through current Work browser tooling; no fresh two-phone certification in this pass. Existing live seat/move test and runtime activity verified, but not a new White/Black two-browser exchange.
- Real Android lock/background return, PWA icon relaunch, airplane-mode saved-game reply, audible audio and native Share remain physical checks.
- Browser diagnostics still show SW ready=false and Offline files not yet saved. This was a known v26/v27 readiness discrepancy; v28 leaves SW unchanged. Do not claim this browser is prepared for offline play. Investigate cache readiness with visible diagnostics before claiming offline certification.
- Railway agent discardStagedChangesTool reported old patch discarded, then deployed exact commit with source/build changes. Direct connector still reported old patch before deployment, then a NEW staged patch f1bcba9f-75fb-40af-a8b1-10803eea6146 afterwards, containing FRONTEND_ORIGIN,PORT,REDIS_URL names and empty visible config. Values inaccessible. User waived the stop rule, but this is NOT proven clean. Deployed Dockerfile/source/port confirmed, Redis unchanged. Future agents must distinguish committed config from this remaining staging discrepancy.
- v26/v27 follow-up documentation and full authored (not executed) two-context Playwright acceptance remain in draft PR2 https://github.com/andrefiker/appfarm/pull/2.

---

# NOTIFICATION CHIME UPDATE — 2026-09-08
Current applied frontend: v25, snapshot 1788888649201. User requested sound more like a WhatsApp notification. Replaced the wooden click with an original locally synthesized soft two-note sine chime (988->1319Hz, second note at85ms, total about305ms). Capture uses784->1047Hz; check adds1568Hz. Gentle8ms attack,210ms decay; mute/volume/activation/cleanup/offline behavior unchanged. Settings > Test sound previews it. Only audio synthesis, build label and existing sound test expectations changed; v24 reconnect and80ms motion retained. Deployment ready with no QA frontend/network errors; physical listening on the user device not verified. No audio asset downloaded or image generated.

---

# FOREGROUND RECONNECT + FASTER MOVES — 2026-09-08
Current applied frontend: v24, snapshot 1788888211593; v23 timing snapshot 1788887961851; v22 material/audio snapshot 1788887695868.

Latest user priority: when leaving the game screen/backgrounding the app, it disconnects and does not reconnect.
Concrete source bug reproduced: old use-room-realtime.ts set halted=true after retries exhausted; BOTH online and visibility return handlers exited when halted, so normal user return/network recovery could never restart. Background timers could exhaust retries. A suspended old socket could also remain apparently OPEN/CONNECTING on return.

v24 repair:
- Pause hidden/pagehide/freeze connection and cancel all retry/heartbeat/watchdog timers.
- On foreground/pageshow/focus/resume, retire old socket, reset bounded retry budget and open fresh socket for the SAME room. Return event burst coalesced for 1s.
- Network restoration also resets exhausted retry state. No background retry churn. Foreground failures still stop after initial+6 retries.
- Only a current socket room.update establishes Live; highest version and retired-callback guards remain. No HTTP read/join/seat reset introduced.
- New truthful hidden status Paused (return reconnects immediately).
- Same src/use-room-realtime.ts API. Build label v24, existing reconnect tests extended. No Railway/Redis/backend changes.

v23 retained:
- Piece-slide animation 190ms ->80ms.
- Artificial computer delay280ms ->80ms. Search depth/difficulty and rules unchanged. Reduced-motion override preserved.
- Material totals, value legend, volume/test audio and saved games retained.

Evidence:
- Deterministic exact old-source regression reproduces permanent exhausted state after online/foreground.
- Exact new-source tests PASS: long background without timer/retry consumption, fresh socket return, missed state version8 recovery, Syncing until authoritative snapshot, stale callback/version guard, burst-event coalescing, bounded7 attempts, foreground AND network restart after exhaustion, pagehide/pageshow BFCache, freeze/resume, initially hidden page, offline/online, focus replacement of stuck socket, full cleanup.
- AppDeploy ready, no QA frontend/network errors, e2e_tests null.
- Read final remote source: hook exactly matches tested source, CSS80ms and computer80ms present.
- Actual deployed Work browser rendered v24, resumed saved Black game with White39/Black30 (+9), retained Sound on, and accepted king selection in check.
- Last optional browser step failed because Work exec-server transport disconnected; no fallback browser used.
- Physical Android/PWA background recovery, actual phone audibility, and real two-browser multiplayer remain to be confirmed by Andre. Do not claim a physical-device test passed. Earlier user confirmation that Chrome multiplayer worked applies to the baseline before this newly reported lifecycle failure.

---

# MATERIAL POINTS + AUDIO UPDATE — 2026-09-08
Current applied frontend: v22, snapshot 1788887695868. Same existing app and URL. Previous v21 snapshot 1788884724376 preserved.

User requested conventional piece points, each player's material sum, the difference, and working sound.
- Added Material panel: totals of pieces CURRENTLY ON BOARD; pawn 1, knight/bishop 3, rook 5, queen 9, king 0 (excluded, not valueless). Initial 39 each. Graphical expandable legend and advantage such as White +9. This is material, not an engine evaluation or victory score.
- src/chess-view-model.ts exports materialValues/materialTotals. FEN-derived rendered position handles captures, en passant, promotion and captured promoted pieces; existing history-based lost-piece rows unchanged.
- New src/chess-audio.ts Web Audio hook: audible midrange synthesized move click, distinct capture/check patterns, await context resume with bounded timeout, user-gesture activation, resource cleanup and mute. No external sound assets, remains offline-capable.
- Replaced previous very quiet low-frequency (340->90Hz / gain .07) sound path, which skipped playback if context was not already running.
- Visible Sound on/off button on game screen. Settings: persisted volume 20-100 default80, Test sound explicitly enables sound and plays it, truthful ready/blocked status. Existing muted preference remains respected.
- src/GameApp.tsx, src/chess-ui.tsx, src/game.css and existing tests updated. No engine/rules, Railway/backend, Redis, networking, SW or room/seat changes.

Verification:
- Deterministic exact-source checks PASS: initial39/39, en passant39/38, recapture38/38, promotion46/33 then41/41, capture of promoted queen subtracts9, king exclusion; awaited audio resume, synthesized move/capture/check voice scheduling, muted no-play, explicit test, blocked resume and cleanup.
- Actual deployed Work browser: saved Black game resumed; material39/39. Enabled Sound on, expanded correct piece-value legend, played ...d5; computer Bb5+. Test sound showed Sound ready with80% volume and offline-files-ready status.
- Played ...Qd7 deliberately to exercise capture; computer Bxd7+ captured Black queen. UI showed White39 / Black30, White+9, and a graphical Black lost queen. Screenshot inspected, 64 squares, no horizontal overflow.
- Reload/resume preserves material totals and enabled sound.
- AppDeploy ready with no frontend/network QA errors, e2e_tests null (not full workflow certification).
- Physical audibility on Andre's phone, Android PWA/offline reload, and two-client multiplayer were not retested in Work. User can test via Settings > Test sound with media volume up; browser playback readiness is not proof of physical speaker audibility.

---

# WORK TAKEOVER UPDATE — 2026-09-08, design completion

## CURRENT USER CONFIRMATION — CHROME WORKS
Andre explicitly corrected the report: "No! In chrome everything thing works even multiplayer!" The white-screen report concerns opening from ChatGPT's deployment preview/in-app context. Do NOT treat the Chrome frontend or multiplayer as currently broken based on the older report. The precise preview-specific cause is not proven. No app was deleted, replaced, rolled back, or unpublished.

Andre then authorized the design overhaul. It is now deployed on the same app and URL. Continue to preserve the working Railway transport, custom computer engine, offline shell, saves and seats.

## DESIGN OVERHAUL — completed 2026-09-08
- AppDeploy current applied version: v21, snapshot 1788884724376. v20 first visual pass: 1788884558765. The in-app design build label remains QK v20; v21 is its compact-mobile/accessibility refinement.
- Rebuilt welcome screen with editorial serif heading, code-native knight/king display, clear friend/computer choices, compact phone composition.
- Refined deep teal background, honey/walnut grain, thin frame, large satin ivory and ebony pieces; redrew knight profile and mane, stronger material shading on all six piece kinds.
- Refined desktop playing-table hierarchy, captured trays, touch controls, settings switches and promotion-choice styling. Board remains top-down, square, 8x8, no coordinates, 1.12x artwork without silhouette clipping.
- Changed only src/chess-ui.tsx, src/game.css, src/pieces.tsx, src/GameApp.tsx (build label only), tests/tests.txt. Existing five workflows retained, exactly one sanity marker. No image generation or external artwork/fonts.
- No Railway, Redis, networking, chess engine, capture calculation, service-worker or save/seat logic changes in this design turn.
- Verified actual deployed browser: saved White game survived v19->v20->v21; played g1-f3, computer replied f7-f6; selection/legal targets worked; numbered history and position survived reload; New game -> Keep playing preserved position; sound preference survived reload; Black computer game oriented Black at bottom, computer opened e3, Your move appeared.
- Desktop board measured 630x630, 64 equal cells, no horizontal overflow. Visually inspected desktop home/table/settings and AppDeploy mobile home screenshot, then shortened mobile art to improve control reach.
- Final AppDeploy QA snapshot reports no frontend/network errors; e2e_tests is still null, so do not claim the full five-workflow suite ran.
- UI reports Computer files saved for offline play. Actual offline-browser/PWA launch and physical-phone upgrade were NOT retested in Work. Multiplayer was confirmed by Andre before this visual update; no new two-context frontend multiplayer test was possible in Work.
- Browser error entries inspected were Work extension metadata errors, not app-origin stacks.
- The earlier evidence below remains useful, but historical guesses about Chrome white screens must defer to Andre's explicit correction above.

## Applied resources
- AppDeploy existing app: quiet-knight-live-v2xp3y
- Current applied frontend: v22, snapshot 1788887695868; v21 design baseline preserved: 1788884724376; v19: 1788883310605
- v18: 1788882631535; original v17 preserved: 1788881592889.
- Same public frontend URL: https://quiet-knight-live-v2xp3y.v2.appdeploy.ai/
- Railway current successful server deployment: 036ac6d2-a6da-4dbd-a8a0-e2e4e1973a24
- Deployed GitHub source commit: d1332884fd380aed96fb24c7c0416912a0c5a5d8
- Runtime build: qk-server-2026-09-08-r2, port 3000, normalized frontend origin confirmed by runtime log.
- Redis instance unchanged: deployment eca0ab1e-606a-4800-aa1e-e089afa508e0.
- IMPORTANT: Redis has NO VOLUME. Server replacement persistence was tested, Redis replacement persistence was NOT. Do not restart/redeploy Redis until a verified backup/migration preserves existing room keys and TTLs.
- The temporary preDeployCommand node verify-live.js was removed from service configuration after tests; [] applies on next deployment. No recurring task was created.

## What changed
AppDeploy:
- vite.config.ts: build-generated SW with content-derived version, complete precache list and embedded built offline HTML.
- public/sw.js: complete install before activation, migrate Quiet Knight caches while retaining old hashed assets for already open clients, navigation network-first with validated assets, fallback to embedded offline HTML; no Railway caching.
- index.html: dark static loading/retry fallback and own icon.
- src/App.tsx: render error boundary preserving saves/seats.
- src/use-room-realtime.ts: current-socket-only proof of Live, heartbeat room.sync with watchdog, bounded retries, stale-close isolation, monotonic versions; HTTP cannot establish Live.
- src/network.ts: GET no longer sends unnecessary JSON Content-Type.
- src/GameApp.tsx: build label and one bounded retry for a join rejected by concurrent state update; same join key retained.
- src/pieces.tsx, src/game.css: existing top-down 2.5D artwork kept, stronger ivory/ebony material contrast, base highlights/shadow, subtle wood grain; no images generated.
- tests/tests.txt: existing five workflows updated; one sanity marker kept.

GitHub (only quiet-knight-server folder):
- server.js: Redis atomic compare/version/set/publish prevents concurrent overwrite; Redis pub/sub broadcasts across server instances; room.sync returns fresh WS snapshot; structured logs omit tokens; health checks Redis/subscriber readiness; normalize CORS origin; WS payload bound.
- verify-live.js: bounded live HTTP + two independent WS clients + direct Redis assertions and chess-rule edge cases.
- This handoff updated.

## Evidence actually obtained
Work browser:
- v17 rendered in fresh browser; v18 and v19 rendered on reload.
- Played local White e4, computer answered h6; reload and v18->v19 preserved saved game and resume.
- v19 displayed Computer files saved for offline play.
- Desktop board measured 592x592, 64 equal cells, no horizontal overflow; screenshot visually inspected.
- AppDeploy QA returned mobile/desktop screenshots, no errors, but e2e_tests:null. Do NOT count that as the five workflows passing.
- Work Browser rejected Railway public /health with ERR_BLOCKED_BY_CLIENT. A frontend room-create failed in browser while Railway logs showed the HTTP POST succeeded. Therefore no genuine two-browser frontend acceptance was completed here.
- Browser API exposes neither independent contexts nor offline emulation. Actual offline browser reload, physical Android/PWA upgrade, Black local game, and remaining UI regression steps are not certified.
- Deployed HTML includes an AppDeploy-injected synchronous external Axios script BEFORE application module execution. This is a concrete startup dependency and a plausible blank-screen suspect, NOT a confirmed cause on Andre's device.
- AppDeploy injects into the served offline HTML too. v19 embeds CLEAN built HTML in SW so offline fallback no longer depends on that served HTML. Host online bootstrap still has injected script.
- AppDeploy frontend error logs remain empty; this does not disprove phone failure.

Backend integration in Railway predeploy:
- Final run PASS: public r2 health and CORS/preflight; create/read; same-key Black recovery; spectator; initial room.update on TWO separate WS clients; e4/e5 broadcasts; out-of-turn/spectator denial; Nf3 then socket reconnect; seat recovery; real Redis key and TTL=604800; resignation/rematch; room.sync fresh response; concurrent join recovery; exactly one of two simultaneous White moves accepted; en passant; both promotions; capture of a promoted queen; Fool's Mate checkmate.
- Final main test room 47PLUT; additional test rooms W4GRG9 (concurrency), VQ7YWB (en passant), DPXMVH (promotion), 7PHU4U (mate).
- Earlier run confirmed room 2EK3SX version 7 survived chess SERVER replacement. This says nothing about Redis container durability.

Local deterministic runtime checks:
- Node VM exercised exact v19 hook and SW source: socket proof/heartbeat, offline-online recovery, retired socket events, stale version rejection, seven attempts then exhaustion, precache completion, old-cache migration, retained previous hashed assets, embedded-shell fallback with room query, Railway bypass. Passed.
- These are simulations of lifecycle behavior, not physical phone or real offline-browser proof.

## Deployment process findings
Railway redeploy tool reused original commit/image 3291292f...; GitHub commits did not auto-deploy.
Railway agent deployServiceTool with an explicit commit correctly built and deployed current source. Use explicit source commit and inspect runtime build, rather than assuming redeploy means latest main.
No Railway/GitHub/AppDeploy resources were deleted.

---

# ORIGINAL V17 HANDOFF (historical context below)

# QUIET KNIGHT LIVE — COMPLETE HANDOFF FOR CHATGPT WORK

Date: 2026-09-08
Owner: Andre

## MISSION

Take over the existing Quiet Knight Live project and finish it as a reliable, polished, mobile-first browser chess game. Do not create a replacement product unless recovery of the existing app is genuinely impossible. Preserve the current visual work and offline computer mode. The immediate priority is reliability: the current v17 AppDeploy frontend opens as a blank white page on Andre's Android phone after the hybrid Railway migration.

Work should operate directly against the existing cloud resources below. Andre cannot attach ZIP archives to the Work session, so this GitHub handoff plus AppDeploy/Railway/GitHub connectors are the source of truth.

## CLOUD SOURCE OF TRUTH

### AppDeploy frontend/PWA
- App name: Quiet Knight Live
- app_id: quiet-knight-live-v2xp3y
- public URL: https://quiet-knight-live-v2xp3y.v2.appdeploy.ai/
- current applied version at handoff: v17
- current applied snapshot id: 1788881592889
- immediate rollback candidates:
  - v16: 1788880713230
  - v15: 1788879738975
  - v11: 1788837283332
- IMPORTANT: inspect the current remote AppDeploy source with src_glob/src_read/src_grep before editing. Do not assume this handoff contains every byte of the frontend.

### Railway multiplayer backend
- Railway project name: quiet-knight-live
- Railway project id: f2d8791f-86d0-41ca-9a7e-3a49aaf50a82
- production environment id: ba8203d2-1f38-489f-baf5-5adcba0705b1
- multiplayer service name: quiet-knight-server
- multiplayer service id: 7b7d4944-e8b1-44f1-a862-010713570311
- Redis service name: redis
- Redis service id: 5fd21ffb-9a38-4f13-884c-bdd41d9eb88b
- public multiplayer endpoint: https://quiet-knight-server-production.up.railway.app
- WebSocket endpoint: wss://quiet-knight-server-production.up.railway.app/ws?room=ROOMCODE
- public Railway domain targetPort: 3000
- service environment PORT was explicitly set to 3000 after an earlier mismatch with Railway's injected 8080; latest server runtime log confirmed: `Quiet Knight server listening on 3000`.
- FRONTEND_ORIGIN should be the AppDeploy URL.
- REDIS_URL references the Railway Redis private domain/port.

### GitHub backend source
- repository: andrefiker/appfarm
- branch: main
- backend folder: quiet-knight-server/
- files:
  - quiet-knight-server/package.json
  - quiet-knight-server/server.js
  - quiet-knight-server/HANDOFF_QUIET_KNIGHT_WORK_2026-09-08.md (this file)
- initial backend commit used for Railway source: 3291292f096e9680c2eb4d82becc863c8e06bb84

Work should fetch current GitHub files before editing. Do not put Quiet Knight server code elsewhere unless there is a strong reason. Keep it isolated in this folder and do not disturb unrelated `appfarm` contents.

## CURRENT USER-VISIBLE FAILURE

After v17 hybrid migration, Andre opened the AppDeploy URL in Chrome on Android and got a blank white page: browser chrome visible, application area completely white. This is now the FIRST bug to reproduce and fix.

The blank page began after v17 changed the frontend's multiplayer transport from AppDeploy SDK HTTP/WebSocket to cross-origin browser fetch + native WebSocket against Railway.

Do not immediately assume the root cause. Reproduce with browser devtools and inspect:
- JS console errors;
- failed module/chunk requests;
- service-worker behavior and stale cached HTML/assets;
- CORS/preflight responses from Railway;
- CSP/mixed-content issues;
- runtime exceptions during module initialization;
- whether AppDeploy QA loads a different fresh environment than Andre's installed/browser copy;
- whether v17's service worker from v15 is serving incompatible cached HTML/chunks;
- whether the cross-origin Railway server is reachable from the browser and whether `/health` returns correctly from the public domain.

A successful AppDeploy build status is NOT proof that the real installed/browser app works.

## PRODUCT REQUIREMENTS — PRESERVE THESE

### Main product
A polished mobile-first chess game named Quiet Knight Live.

### Computer mode
- playable without an account;
- choose White or Black;
- level selector 1–10;
- current engine is a custom material/minimax engine, NOT Stockfish;
- do not label it Stockfish or claim Elo calibration;
- local computer game is intended to work offline after the PWA has cached its application shell;
- local game progress/color/level are saved to localStorage and should survive close/reload where storage is available;
- local offline computer mode must remain available even though live multiplayer requires internet.

### Multiplayer mode
- create one private room;
- creator owns White;
- second person opening the same link owns Black;
- later visitors are spectators;
- no accounts, passwords, public lobby or matchmaking;
- room code: 6 uppercase alphanumeric chars avoiding ambiguous characters;
- share URL remains the SAME AppDeploy frontend URL with `?room=CODE`;
- seat ownership is stored locally as `qk-seat-CODE`;
- second-player joins are idempotent using a persistent per-room client join key so a lost HTTP response does not orphan the Black seat;
- backend validates seat ownership, turn, game status, FEN freshness and chess legality;
- moves, resignation and rematch are authoritative on the server;
- server state persists in Redis for 7 days;
- WebSocket clients receive `room.update` messages;
- on WebSocket open the server sends the current authoritative room immediately;
- reconnect should preserve seats and reconcile the current room.

### Chess rules/UI behavior
- chess.js is used for rule correctness;
- tap piece then legal destination;
- promotion dialog;
- legal destination dots/rings;
- previous move highlight;
- check state;
- correct board orientation based on player color;
- captured/lost piece rows;
- numbered move history;
- resignation confirmation;
- rematch in same room.

## VISUAL DIRECTION — DO NOT REGRESS

Andre spent many iterations on the board. Preserve the current style unless a targeted usability fix requires change.

Current intended design:
- dark teal/near-black surrounding UI;
- warm wood board palette;
- light squares approximately #e0caa6 / #cdb088;
- dark squares approximately #946f53 / #6f513d;
- edge-to-edge board on mobile, with no rank/file numbers or letters;
- thin walnut-like board frame;
- large pieces filling as much of their squares as possible without clipping;
- pieces are self-contained shaded vector artwork in warm ivory and dark charcoal/ebony;
- no random external hotlinked piece assets;
- no Unicode chess symbols;
- no chrome/silver pieces;
- no stretched/squashed fake perspective;
- current board piece art is generated in src/pieces.tsx and enlarged by CSS around 1.12x;
- board should be a true 8x8 square with equal cells;
- on phones, board is the dominant object;
- top header compact;
- player bars slim;
- status uses restrained serif typography below board;
- actions large enough for touch but not oversized;
- show White lost and Black lost using graphical pieces;
- captured pieces must derive from actual move history, including en passant and promotions, not by subtracting current board from starting board.

Do NOT invoke image generation. Andre repeatedly rejected generated mockups. All visual work must be real code/assets in the application.

## IMPORTANT FRONTEND FILES ON APPDEPLOY

Current source should include at least:
- src/App.tsx
- src/GameApp.tsx
- src/chess-ui.tsx
- src/chess-view-model.ts
- src/computer.ts
- src/game.css
- src/index.css
- src/main.tsx
- src/network.ts
- src/offline.ts
- src/pieces.tsx
- src/realtime-controller.ts (legacy AppDeploy transport controller, possibly no longer used by v17)
- src/use-room-realtime.ts
- public/sw.js
- public/manifest.webmanifest
- public/icon.svg
- tests/tests.txt

At v17:
- `src/network.ts` uses `MULTIPLAYER_BASE='https://quiet-knight-server-production.up.railway.app'` and native `fetch` for room API calls;
- `src/use-room-realtime.ts` uses native browser WebSocket against `wss://quiet-knight-server-production.up.railway.app/ws?room=...`;
- `GameApp.tsx` build label was changed to `QK • v17 • Railway multiplayer + offline`;
- AppDeploy's old realtime backend should no longer be part of the critical live-room path.

The exact current v17 source is authoritative. Inspect it.

## OFFLINE/PWA HISTORY AND CURRENT EXPECTATION

Earlier versions had a service worker that caused stale-code confusion. v14 temporarily disabled offline caching, but Andre explicitly requested offline computer mode again.

v15 restored an offline-capable service worker:
- network-first for page navigation;
- cached app shell/assets as offline fallback;
- API/shared-room state intentionally not cached;
- local computer state saved separately in localStorage;
- UI can report whether computer files are saved for offline play.

This service worker is a MAJOR suspect for the current v17 blank page because it may be serving a cached HTML or bundle from an older build. Do not remove offline mode permanently unless absolutely necessary. Prefer robust versioned cache migration:
- unique cache name per frontend build;
- install new assets completely before activation;
- cleanup old Quiet Knight cache names on activate;
- network-first navigation while online;
- offline fallback only after network failure;
- do not cache cross-origin Railway room API/WebSocket traffic;
- preserve `?room=` URLs;
- never trap the app on stale HTML pointing to missing Vite hashed assets;
- consider a stable app-shell strategy if Vite hashed files and SW versioning are fighting each other.

Acceptance for offline mode:
1. load app online once;
2. play a computer move;
3. close/reopen or reload offline;
4. app shell renders;
5. resume saved local computer game;
6. local legal moves and computer response work offline;
7. live-room creation/join clearly says internet is required.

## RAILWAY SERVER IMPLEMENTATION

Current backend in `andrefiker/appfarm/quiet-knight-server/server.js` is a Node ESM service using:
- node:http
- chess.js
- redis client
- ws WebSocketServer
- Redis room persistence

Current API surface:
- GET /health
- POST /rooms
- GET /rooms/:code
- POST /rooms/:code/join
- POST /rooms/:code/move
- POST /rooms/:code/resign
- POST /rooms/:code/rematch
- WS /ws?room=CODE

Room records include:
- code
- white_token
- black_token
- black_join_digest
- moves with from/to/promotion/san
- fen
- turn
- status waiting/active/checkmate/draw/resigned
- winner
- version
- created_at

Redis key:
- `qk:room:CODE`
- TTL 7 days

Join behavior:
- creator white token is random UUID;
- second device sends `join_key` generated and persisted in its localStorage;
- black token is deterministically derived from that join key;
- black_join_digest allows retry/recovery of the same seat if a response was lost;
- existing valid white/black seat tokens resume ownership;
- once Black exists, unrelated third clients are spectators.

WebSocket behavior:
- URL contains room code;
- server verifies room exists;
- socket is stored in a Set per room;
- server immediately sends `{type:'room.update', room: publicRoom(room)}` after upgrade;
- every join/move/resign/rematch broadcasts a fresh room.update to connected room sockets.

CORS:
- frontend origin intended to be `https://quiet-knight-live-v2xp3y.v2.appdeploy.ai`;
- localhost 5173 allowed for development;
- inspect actual preflight/headers on phone/browser before assuming correct.

Railway currently showed successful deployments for both Redis and quiet-knight-server. Latest server logs after PORT fix showed `Quiet Knight server listening on 3000`.

## WHY RAILWAY WAS INTRODUCED

Versions v12-v16 spent too much time trying to make AppDeploy realtime work reliably on actual phones. Symptoms included:
- creator stuck `Connection interrupted` or `Connecting...`;
- second phone could open/join but creator stayed `Seat open`;
- both devices could remain stuck at Connecting;
- AppDeploy QA reported no errors even while real Android clients failed;
- installed PWA sometimes displayed stale text from old builds.

v17 therefore intentionally moved authoritative multiplayer state + WebSocket transport to Railway while leaving the AppDeploy frontend/PWA intact.

Do not migrate back to AppDeploy realtime unless you have concrete evidence that doing so is better. The point of v17 was to remove AppDeploy realtime from the critical multiplayer path.

## FIRST WORK PLAN — DO IN THIS ORDER

### Phase 1 — Recover rendering before touching multiplayer
1. Inspect AppDeploy v17 source and current deployment status.
2. Open the real public URL in Work browser at mobile and desktop sizes.
3. Reproduce blank white page.
4. Inspect console/network/service-worker/cache state.
5. Determine whether current blank page is:
   - frontend JS exception;
   - Vite asset/chunk mismatch;
   - stale service worker;
   - failed cross-origin import/fetch executed during startup;
   - CSS/layout issue (unlikely because completely blank);
   - AppDeploy runtime issue.
6. Fix the smallest root cause.
7. Verify clean browser + installed-PWA upgrade path if possible.
8. Do not proceed to multiplayer acceptance until the app renders reliably.

If needed, rollback temporarily to v16 or v15 to compare behavior, but do not throw away v17 work. Use AppDeploy versioning deliberately.

### Phase 2 — Verify Railway independently
Before blaming frontend:
1. Check Railway project/service health.
2. GET public `/health` from outside Railway.
3. Create a room directly via HTTP.
4. GET the room.
5. Join it using a deterministic join_key.
6. Verify CORS from AppDeploy origin.
7. Open two WebSocket clients to `/ws?room=CODE` and verify both receive initial `room.update`.
8. Move via API and verify both receive update.
9. Check Redis survival across service redeploy/restart if practical.

Use Railway runtime/http logs while testing. Add concise structured logs if needed: method, route, code, role, WS connect/disconnect, room version. Never log seat tokens or join secrets.

### Phase 3 — Two-client frontend acceptance
Use two independent browser contexts, not one tab pretending to be two users.

Acceptance sequence:
1. Actor A opens fresh app, creates room.
2. A reaches a stable `Live` state.
3. A copies invite.
4. Actor B opens exact invite in separate context/device.
5. B becomes Black, not spectator.
6. A updates from `Seat open` to opponent present without refresh.
7. A e2-e4.
8. B sees e4 without refresh.
9. B e7-e5.
10. A sees e5 without refresh.
11. Reload B; B recovers Black seat.
12. Temporarily disconnect A; B moves; reconnect A; A reconciles latest room.
13. No duplicate moves, no stale overwrite, no permanent Connecting screen.

Only call multiplayer fixed after this test passes.

### Phase 4 — Regression
Verify:
- computer play as White;
- computer play as Black;
- offline local play after caching;
- promotion;
- check/checkmate;
- resign cancel + confirm;
- rematch same room;
- lost-piece rows;
- move history;
- edge-to-edge board and large pieces;
- no board coordinates;
- sound/haptics settings;
- browser + installed PWA if feasible.

## CONNECTION STATE UX

Use truthful, simple statuses:
- Connecting… = socket is opening
- Syncing… = socket open, waiting for/validating current room
- Live = authoritative room update has actually been received over the active Railway WebSocket
- Offline = navigator offline or explicit network loss
- Reconnecting… = retry scheduled/in progress
- Connection unavailable = bounded retry exhausted

Do NOT show Live merely because HTTP succeeded.
Do NOT block forever on Connecting.
A manual Reconnect button in Settings is acceptable.

For live rooms, board moves should be disabled unless:
- role owns a seat;
- room status active;
- connection is Live OR you deliberately redesign so HTTP mutation can proceed safely during transient WS reconnect. Prefer simple behavior initially.

## IMPORTANT TESTS ALREADY SPECIFIED IN APPDEPLOY

Current tests/tests.txt includes five workflows:
1. Create room, second actor opens invite, recovers seat on reload, exchanges e4/e5/Nf3.
2. Reconnect/offline, spectator guard, out-of-turn rejection and seat recovery.
3. Offline computer game, storage, both colors, preferences.
4. Capture accounting with en passant.
5. Promotion, resignation and rematch.

Read and reconcile the current file instead of rewriting blindly.

AppDeploy historically often returned `e2e_tests: null`, so Work must perform browser-level verification itself rather than reporting a green deploy as a passed game.

## SECURITY / PRIVACY

This is a casual private chess game, not a security-sensitive clinical system. Still:
- never expose seat tokens in UI/logs;
- no accounts required;
- room codes are unlisted, not cryptographic access control;
- keep Redis/private service credentials inside Railway variables;
- do not put secret values into GitHub or AppDeploy source.

## THINGS NOT TO DO

- Do not create a second AppDeploy chess app unless recovery is impossible and Andre explicitly agrees.
- Do not change the public frontend URL without necessity.
- Do not migrate to Supabase just because it is familiar.
- Do not reintroduce AppDeploy realtime just to avoid debugging Railway.
- Do not invoke image generation.
- Do not redesign the board while debugging networking.
- Do not claim testing passed based only on deployment status.
- Do not repeatedly patch symptoms without instrumenting the failing layer.
- Do not erase offline computer mode.
- Do not reset or steal old room seats as a workaround; use fresh rooms during acceptance.
- Do not touch unrelated files in `andrefiker/appfarm`.

## SUCCESS DEFINITION

The project is finished when all of these are true:

1. The existing public AppDeploy URL renders reliably in Chrome/Android and desktop.
2. The installed PWA launches reliably after updates.
3. Local computer chess works offline after one successful online preparation.
4. A creates a room and B opens the invite on another device/context.
5. A is White, B is Black, third client is spectator.
6. Both reach Live through Railway WebSocket.
7. Moves propagate both directions without reload.
8. Reload/reconnect preserves owned seats and current board.
9. Railway/Redis service restart does not immediately destroy room state.
10. Visual board remains the current polished warm-wood edge-to-edge design with large ivory/charcoal pieces, lost-piece rows and move history.
11. No obvious frontend/backend/runtime/network errors remain in real-browser testing.

## FINAL DELIVERY EXPECTED FROM WORK

When done, report:
- root cause of the v17 white screen;
- root cause of any remaining multiplayer failure;
- exact AppDeploy version applied;
- exact Railway deployment/service status;
- files changed on AppDeploy and GitHub;
- live frontend URL;
- Railway backend domain;
- evidence from two-client test (what actions were performed and what each actor saw);
- offline computer-mode test result;
- any remaining limitations.

Do not finish with only `deployment ready`. The final answer must state what was actually exercised.

