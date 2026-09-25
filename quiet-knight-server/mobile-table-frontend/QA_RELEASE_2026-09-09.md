# Quiet Knight v37 — mobile table release

Released 2026-09-09 UTC. Existing AppDeploy production was updated after rendered candidate QA. Vercel is temporary QA hosting only. No production code fixes were needed during this QA pass.

## Exact production state

- App: `quiet-knight-live-v2xp3y`, **v37**, snapshot `1788920004629` (2026-09-09 02:13:24.629 UTC).
- Label: **QK • v37 • A quieter table**.
- Production: https://quiet-knight-live-v2xp3y.v2.appdeploy.ai/
- Rollback: **v36 / 1788913697012**. Available in AppDeploy version history; not deleted.
- Exactly four production files deployed: `src/GameApp.tsx`, `src/chess-ui.tsx`, `src/game.css`, `tests/tests.txt`.
- All four matched PR #5 head `b3fb3eceeabfd433333add3540ce1cb4491b84e7` by Git blob SHA before deployment. Production applied snapshot was reconfirmed as v36 immediately before the update. PR remains draft; no merge to the Railway deployment branch.

## Temporary Vercel preview

- Project: `quiet-knight-mobile-qa`, ID `prj_LTleriAoeoUvAjsRWggjki1KYI8S`.
- Final preview: https://quiet-knight-mobile-flihkbo45-andre-fikers-projects.vercel.app/
- Deployment: `dpl_3HgfQ1jiVV7WCekD1nz9jxGTREG9`, **READY**, target preview, region iad1.
- Inspector: https://vercel.com/andre-fikers-projects/quiet-knight-mobile-qa/3HgfQ1jiVV7WCekD1nz9jxGTREG9
- Vercel authentication protection remains enabled. A connector-issued temporary share URL was used for browser access; it expires and is not a permanent public link.
- Static production build artifacts are unchanged across QA deployments. JS `index-Ds_sduo8.js`, CSS `index-BnoJtuDO.css`, computer worker `computer-worker-CwRSDPc2.js`.
- SHA256 app JS: `3ffbf87edb38f16e58a783a4779984b8e79eddd4dd742a811cad3c7dc92cc8dc`.
- SHA256 CSS: `325f81dc78db74e637977937bc3bfe89f9ae66b33da983d1c7aa0cb9d3cfa6d6`.
- `qa-viewport.html` / `assets/qa-viewport.js` exist only on staging. They embed the exact app in a fixed-size iframe, load legal synthetic saved-game histories through explicit fixture buttons, and optionally activate the existing reduced-motion CSS rules for a disclosed simulation. No fixture, override or QA backdoor was deployed to AppDeploy.
- Earlier screenshots use equivalent compiled candidate deployments `dpl_JD5GsTn7kiNf6MZA9T69GyPUf4wR` and `dpl_BXfLWsaSrYZikipTfeAkHaSxAkx1`. Only QA wrapper code changed afterward.

## ACTUALLY VERIFIED

### Rendered candidate

Cloud Chromium desktop viewport 1363×936, containing 390×844 and 360×800 iframe viewports. These are real responsive browser renderings, not physical-phone or mobile-user-agent emulation.

| Viewport | Playing board | All 64 squares | Result |
| --- | --- | --- | --- |
| 390×844 | 374×374, x=8, y=100 | 46.75×46.75 each | Opponent → board → You → state → controls fits first viewport |
| 360×800 | 344×344, x=8, y=100 | 43×43 each | Body scrollWidth=360; no horizontal overflow; toolbar ends at y=585 |
| 1363×936 desktop | 670×670 | 83.75×83.75 each | Complete table fits viewport; drawer on right |

- Original carved pieces remain large and visually centered. Their original SVG box is scaled 1.12; visible silhouettes fit squares. No board distortion or runtime/framework overlay observed.
- White and Black orientations rendered; Black has h1 first and a8 last.
- Selected square, legal destinations and selected-piece styling; actual capture ring on d5 and exd5 execution.
- Castling from a legal saved history: king g1, rook f1, e1/h1 vacated.
- Check: e1 king has `square-check`, state says “You are in check”.
- Promotion: four readable queen/rook/bishop/knight options; selecting queen produced a white queen on a8.
- Move animation: actual `.art-moving` element with 80ms `piece-slide` and correct origin offsets.
- Reduced-motion **QA stylesheet activation simulation**: selected lift becomes `none`; animation and transition durations become `1e-06s`. This is not an observed OS media-preference change.
- Table controls: trigger, close button, Escape, backdrop dismissal, focus return to trigger. Body overflow is hidden while open and restored afterward. Expanding preferences yielded a 741px client-height/1405px scroll-height sheet; keyboard scrolling reached scrollTop 664 while page scroll remained 0. No observed scroll trap.
- Mobile toolbar and close button have 44px targets. Sheet reaches viewport bottom without overlap at zero safe-area insets. Desktop drawer width 440px.
- Move history expands to PGN/FEN controls. Material, captures, preferences, atmosphere, sound, haptics, diagnostics remain reachable. Finished-game fixture shows Black wins / Checkmate, New game, Share game and Preview postcard.
- Normal preview computer move received a legal **local fallback** reply. Do not count it as Stockfish.
- Candidate console entries inspected showed browser-extension metadata errors and earlier Vercel-login Google warnings; no candidate app exception was observed. Live/Stockfish requests failed visibly from staging as described below; console health is not a claim of successful staging networking.

### Actual production after deployment

- AppDeploy reports ready, with empty frontend/backend error arrays and empty QA frontend/network errors. Its E2E result is null, **not a test pass**.
- Applied source and browser label both confirmed v37. First navigation briefly showed v36 during the worker update; a normal reload loaded v37. No forced reload logic or worker source was changed.
- Actual production browser game: White **e4**, **Stockfish 18 replied c6**, state returned to **Your move**.
- Table controls opened, move history showed **1. e4 c6**, PGN/FEN remained accessible, and close action worked.
- Actual production screenshot captured. No relevant app error was found in inspected browser console entries; extension metadata errors remain external noise.

## Multiplayer attempt and infrastructure

- A staging “Create live game” attempt returned “Could not create a room. Please try again.” It stayed on Home; no computer game was silently created by that failed request.
- Deployed Railway source at `02e9c1f866ac9eefdb44f09d147067b42530280d` permits HTTP CORS for its configured AppDeploy origin and localhost, not Vercel. Staging uses the unchanged hardcoded Railway API/WS addresses. No proxy, CORS relaxation or backend configuration change was applied.
- Browser capabilities expose shared-storage tabs, not separate browser contexts. A second tab visibly reused the same saved game. Therefore **no true independent-client multiplayer acceptance passed**. Create/join roles, shared FEN, bidirectional moves, disconnect/reconnect, stale-overwrite prevention, resignation and both rematches remain unverified through independent current frontends.
- Railway deployment remained `743ce873-7afa-41b1-8bee-6c8f031e7c2e`, SUCCESS. Backend build remains last documented `qk-server-2026-09-08-r5-table-presence`, deployed commit above; raw health/build endpoint not newly read. Stockfish directly answered moves on production before and after frontend deployment.
- Postgres deployment `52fd82d2-bb3a-4d16-8cbb-4d142ac56fab`, SUCCESS, existing 500MB `/var/lib/postgresql/data` volume.
- Redis deployment `eca0ab1e-606a-4800-aa1e-e089afa508e0`, SUCCESS, no persistent volume.
- All infrastructure unchanged. The same 21 staged Railway changes, patch `3b485ae1-3c4f-4677-a2d0-dacdef826ffc`, remain unapplied. No database contents/schema/scoring/identity changes. No Supabase migration. PostHog remains uninstrumented; no events added.

## DETERMINISTIC / SOURCE TESTED

- TypeScript noEmit, Vite production build, and all seven existing QA scripts rerun successfully: reconnect/stale callbacks/resume, capture/material/audio, role/presence protocol, exact built offline worker/cache retention, Stockfish frontend cancellation/fallback, keepsakes and sharing.
- Legal histories for rendered edge-state fixtures replay successfully through chess.js and the app's ordinary saved-game loader. No arbitrary FEN was injected into application internals.
- Engine, network, realtime, scoring, identity and service-worker source unchanged. Build-derived worker cache label/assets naturally update during the frontend build.
- `tests/tests.txt` remains an authored acceptance suite; AppDeploy did not provide a completed E2E run.

## NOT PHYSICALLY VERIFIED

- Two independent frontend multiplayer actors and the full live/rematch/reconnect chain above.
- Physical Android/iPhone haptics, audible sound, touch precision, OS reduced-motion setting, nonzero notch/home-indicator safe-area insets, device keyboard, background/lock recovery and network-disabled installed-PWA relaunch.
- Mobile browser toolbar/visual-viewport resizing; iframe testing does not certify these.

## Screenshot evidence

- [Mobile active game / selection](qa/qk-v37-mobile.jpg)
- [Mobile Table controls open](qa/qk-v37-controls.jpg)
- [360px Black orientation](qa/qk-v37-narrow-black.jpg)
- [Desktop candidate](qa/qk-v37-desktop.jpg)
- [Actual production v37 with Stockfish move history](qa/qk-v37-production.jpg)

Design decisions and original mismatch ledger remain in RELEASE_GATE.md. No usable UX Pilot design was available; no Uxia dependency or new design generation was introduced. Scope is complete; do not merge unrelated backend work or continue adding features.
