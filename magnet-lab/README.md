# MAGNET LAB

An original offline magnetic puzzle game. Open **index.html** in a modern browser, or embed that single file in an Android WebView. The HTML includes every style, level, physics rule and game script; it makes no network requests and needs no assets, packages or build step.

Guide a positively charged particle from the emitter to the collector. Select a coil's polarity using its three buttons: **− Attract**, **○ Off**, **+ Repel**. Tapping a coil cycles Off → Attract → Repel. Coils are safe to pass through; striped barriers, pink hot zones and chamber edges end a run. Set fields and inspect the dotted trajectory before launch, or change them during flight. Pause, reset and revisit all twelve unlocked chambers. Generated sound is optional and starts off.

The interface supports portrait 393×852 and narrow 320px screens, with centered controls, visible focus indicators, named polarity buttons, keyboard-accessible dialogs, reduced-motion rendering and local progress/best capture times. All storage access is guarded so the game still works when persistence is unavailable.

## Physics and level verification

A deterministic 120 Hz integrator uses softened inverse-square radial forces. Each magnet acceleration is capped at 280 units/s², total acceleration at 400, and speed at 225 units/s. Travel in a physics step is at most 1.875 units, smaller than the 7-unit particle radius. Collisions are tested each step. Goal capture uses a 19-unit radius. Runs time out after 14 simulated seconds. Real frame accumulation is capped to avoid a large jump after suspension; hiding the document pauses a running experiment.

Twelve authored layouts gradually introduce attraction, repulsion, idle coils, combined fields, obstacles and hot zones. Their intended polarity combinations are proven by stepping the actual physics engine into a collector. The harness also enumerates every static polarity combination for each chamber and records all successful combinations in QA.json. The final chamber has exactly one successful static combination, with all three coils active. Dynamic field changes can produce additional solutions.

`physics.js`, `levels.js`, and `game.js` are the readable source copies used by the inline HTML bundle. After editing any source copy, replace the inline `<script>` blocks in `index.html` with those three files, in that order. No bundle step is needed to run the delivered file.

## Test

```sh
node qa.cjs
```

The harness uses Playwright from `CODEX_PRIMARY_RUNTIME_NODE_MODULES` and Chromium at `/workspace/scratch/8d90d606b774/browser-runtime/chromium`. It starts and closes its own HTTP server on `127.0.0.1:8774`. QA.json contains the machine-readable result; gameplay.png is a real 393×852 browser capture.

Checks cover every chamber's physical solution; force direction; obstacles, hazards and timeout; accessible polarity controls; canvas input; the real animation loop; launch/pause/resume/reset; failure; successful capture and next; persistence; level selection; help; 320/393/768px layouts; standalone delivery; and browser errors. Android packaging and physical device checks are handled by the release wrapper workflow.

## Opt-in diagnostics

Only `?qa=1` exposes `window.MagnetQA`: `snapshot()`, `load(index)`, `mode(coilIndex, mode)`, `launch()`, `pause()`, `reset()`, `step(count)`, `solve(index)`, and `closeModal()`. Modes use `1` for attract, `0` for off, `-1` for repel. `step()` runs the same integration and outcome handling as normal play. It never moves the particle directly to a goal.

The simulation is deliberately stylized; the displayed fields are radial game mechanics rather than a dipole electromagnetism model.
