# Quiet Knight actual frontend acceptance

Run this folder independently from the Railway server. It does not modify the server package or require production credentials. It creates fresh seven-day test rooms through the actual UI; it never resets existing seats or rooms.

```sh
cd quiet-knight-server/frontend-acceptance
npm install
npx playwright install chromium
npm test
```

Default target: https://quiet-knight-live-v2xp3y.v2.appdeploy.ai/ . Set `QK_FRONTEND_URL` only when deliberately testing another deployment of this same app.

Five substantive scenarios, exactly one sanity marker. Actors use separate `browser.newContext()` profiles, not tabs sharing storage. They exercise live invite ownership, moves, reload and home resume, safe diagnostics, offline/reconnect, Chromium frozen-page lifecycle, spectator restrictions, offline closed-page computer relaunch, both colors, settings, captures/en passant/material, promotion/resignation/rematch and native Share/copy behavior.

Clipboard and Share are stubbed in the test fixture to avoid opening operating-system share sheets or exporting test data. The tests inspect their payloads. Audio audibility and real native share sheets remain physical checks. Trace/video/screenshots are off: browser network traces may contain seat credentials. Do not publish storage state or raw room mutation bodies.

This workflow was authored and syntax-checked on 2026-09-08. It was NOT executed in the Work browser: that browser API supports tabs but not isolated contexts, offline emulation or CDP lifecycle control. Do not call this a passing two-phone test until it runs. Existing Railway `verify-live.js` remains unchanged and is a separate backend suite.

Actual Work evidence: browser Actor A created room 7DRH3L as White and reached Live. A separate Node protocol client joined Black. A played e4, the protocol client verified it and replied e5; A received e5 without refresh and played Nf3. While A navigated away, Black played Nc6. Returning A restored White, the same room, Nc6 and Live. Railway logs confirm saves/broadcasts versions 1–6 and a fresh socket at version 6. A also left to the home screen, reloaded and resumed the same White seat. This is frontend-plus-protocol evidence, not two-browser certification.

Cache policy has not been changed in this pass. Before changing retention, add a real three-build upgrade fixture: keep an old page open, activate the next complete build, verify offline relaunch/new worker assets and old hashed imports, then activate a third build and prove cache size stabilizes. Preserve room query parameters and local saves; never cache Railway state. A failure must prevent activation without deleting the working shell.

Physical acceptance:

1. Two phones: create/open invite, White/Black, both Live, e4/e5/Nf3 without refresh.
2. Lock A for 2+ minutes; make a legal move on B; return A to the same White seat, latest move and Live.
3. Fully close the installed app; launch its icon and Resume live game.
4. Prepare offline files, save a computer game, airplane mode, fully close/reopen, resume and get a local computer reply.
5. Audible media volume: Test sound; own move clicks, opponent/computer move chimes.

API reference: https://playwright.dev/docs/browser-contexts and https://playwright.dev/docs/api/class-browsercontext .

2026-09-09 update: swap-color rematch now explicitly confirms the dialog and both role orientations. The AppDeploy five-workflow suite is the current product acceptance specification, including Knight IDs, scoring, Zen, presence, themes and postcards. These Playwright files remain AUTHORED, NOT EXECUTED in Work. They do not certify Android.

Deterministic harnesses are preserved in `deterministic/`. Export the CURRENT AppDeploy source into `deterministic/polish/` (do not use this directory as frontend source of truth), install its dependencies and build it. Run lifecycle and worker tests from `deterministic/`: `node polish/verify-phase1.cjs`, `node polish/verify-table-protocol.cjs`, `node polish/verify-offline.mjs`. Run idle/keepsake tests from `deterministic/polish/`. These use simulated clocks/caches and are not browser offline certification.
