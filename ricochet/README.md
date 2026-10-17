# RICOCHET

A complete offline reflection puzzle game. Open `index.html` in a modern browser. All artwork, sound synthesis, level data, styling, and gameplay are contained in that file. No accounts, network requests, remote assets, fonts, or installation are required for the browser version.

## Play

Clear every coral target within the displayed shot budget. Drag anywhere in the range to set the angle, or use the labeled angle slider. Press **Launch** when ready. A shot reflects from the walls and obstacles, ending after eight bounces or 3,200 logical pixels of travel. Targets stay cleared between shots in the same attempt.

The dotted line previews 1,400 logical pixels using the same collision engine as the moving ball. **Guide** sets an optional suggested angle for the remaining targets. **Restart** resets the current room. Complete a room to unlock the next one. The range picker is available from the opening screen and pause menu.

Sound starts off and can be toggled with the music button. The pause button, Escape key, and page visibility changes pause play. Space launches when focus is on the page; the slider supports standard keyboard adjustment. Controls are symmetrical and the launch button is wide. Reduced motion preferences suppress particles. Progress and fewest shots are saved locally when browser storage is available.

## Twelve authored ranges

| # | Range | Targets | Shots | Verified solution angles |
|---|---|---:|---:|---|
| 1 | First Light | 1 | 1 | 90° |
| 2 | Side Effect | 2 | 1 | 42° |
| 3 | Double Take | 4 | 2 | 135°, 45° |
| 4 | The Divide | 4 | 2 | 116°, 64° |
| 5 | Low Ceiling | 3 | 1 | 30° |
| 6 | Offset | 3 | 2 | 111°, 52° |
| 7 | Switchback | 4 | 2 | 78°, 147° |
| 8 | Narrow Pass | 4 | 2 | 90°, 35° |
| 9 | Cross Current | 4 | 2 | 124°, 57° |
| 10 | The Gate | 3 | 2 | 90°, 25° |
| 11 | Three Notes | 4 | 3 | 90°, 142°, 38° |
| 12 | Afterglow | 6 | 3 | 109°, 71°, 34° |

Angles are measured counterclockwise from the rightward horizontal; 90° points straight up. The game converts these display values to canvas coordinates. Later rooms start at neutral 90°, so the player chooses the route. These are fixed authored puzzles, with explicit obstacle and target coordinates, rather than an endless level generator.

## Physics and rendering

The logical range is 360 × 490. Rendering scales uniformly with letterboxing as needed, keeping physics independent of device size. The ball radius is six logical pixels and target capture distance is seventeen (ball plus target radius). Each movement uses continuous ray/segment collision against the arena and expanded axis aligned obstacle rectangles. Targets are tested against every traveled segment, preventing tunneling. Reflection events are processed within the current time step, including simultaneous normals at corners. Decorative rounded obstacle corners do not change their rectangular collision geometry.

## QA

Run `node qa.cjs` in the prepared runtime. The harness starts and stops its own HTTP server on `127.0.0.1:8772`, uses Playwright from `CODEX_PRIMARY_RUNTIME_NODE_MODULES`, and launches the supplied Chromium binary at `/workspace/scratch/8d90d606b774/browser-runtime/chromium`.

The current run passes **40 checks**. `QA.json` contains the results and level solution evidence. `gameplay.png` is the internal 393 × 852 gameplay capture at device scale factor two.

Coverage includes opening and next-room flow, pointer and slider aiming, shot spending, wall and obstacle reflections, continuous target hits, exact preview/live position agreement across a reflection, shot exhaustion, retry, every authored level solved through live play within budget, unlocks and saved bests across reload, pause freezing physics, visibility-change pause handling, opt-in QA hooks, JavaScript errors, and controls fitting portrait layouts at widths 320, 393, and 430.

A sampled direct-only set-cover check (0.1° angular increments) finds that **10 of 12 ranges need reflected paths to meet their budget**. The sample is supporting design evidence, rather than an exhaustive mathematical proof of all angles. All twelve supplied solution paths are verified by the exact collision engine and replayed through live game state.

`?qa=1` opts into `window.__RICOCHET_QA` with deterministic `start`, `load`, `aim`, `shoot`, `step`, `pause`, `resume`, `guide`, `getState`, `solve`, and `preview` operations. `step(seconds)` advances fixed 1/120-second simulation steps and disables animation-frame physics, while rendering remains active. The hook is absent from ordinary URLs.

Browser QA covers Chromium and synthetic visibility-change handling. Physical Android touch, audio output, device lifecycle transitions, and additional browser engines still require device verification. Android packaging is maintained separately in the project scaffold.
