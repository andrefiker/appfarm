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
