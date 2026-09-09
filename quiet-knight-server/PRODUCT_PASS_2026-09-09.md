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
