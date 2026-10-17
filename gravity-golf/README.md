# Gravity Golf

A complete, self-contained offline browser game. Open `index.html` directly in a modern browser, or serve this folder. The game makes no network requests and uses no external assets, fonts, libraries, or build tools. All visible space art is original canvas rendering as requested.

## Play

Eight handcrafted holes introduce curved shots, paired moons, a larger gravity well, and a final three-world course. Reach each glowing mint portal in as few strokes as possible. A dotted preview uses the exact same fixed-step physics as the launched ball.

- Drag backward from the tee ball and release to launch. A tap alone does not launch.
- Alternatively, use the labeled angle and power sliders, then the large centered **Launch shot** button. Angle 0° points right; 90° points upward; 180° points left. Native sliders support touch and keyboard.
- Planet contact, leaving the playfield, or a nine-second orbit returns the ball to its tee and keeps the stroke count.
- **Reset hole** restarts the current hole's stroke count. It preserves personal bests.
- **Pause** holds both aim and live flight. Page hiding or losing focus also pauses.
- Sound starts off every session. The speaker button enables synthesized audio after interaction.
- Current hole and per-hole best scores save locally on the device. If storage is unavailable, play still works and the footer reports session-only saving.
- The first hole starts with a forgiving successful tutorial aim. Every later hole starts with an unsolved aim, verified in QA.

## Implementation

Single-file HTML/CSS/vanilla JavaScript; 360 × 440 world coordinates; 120 Hz fixed simulation; capped frame catch-up; segment tests prevent fast shots tunnelling through portals and planets. Physics clamps gravity's minimum distance. Course art remains static between inputs when no shot is in flight.

The layout was visually reviewed at 393 × 852 and checked for overflow at 320 × 740 and 1280 × 900. All core controls are HTML, with visible keyboard focus and labeled controls; status messages use an aria-live region. The playfield itself is visual and is not a screen-reader-independent game.

## Validation

Run `node qa.cjs` in the supplied Codex environment. The harness starts its own temporary localhost server on port **8771** and closes it afterward. It uses installed Playwright from `CODEX_PRIMARY_RUNTIME_NODE_MODULES` and Chromium at `../browser-runtime/chromium`; these paths can be adapted for another development machine without changing the game.

**46 checks pass.** `QA.json` contains the full check list, every hole's winning angle/power evidence, and the number of successful sampled shots. A sweep of 181 angles × 46 powers × 8 holes checks finite state and demonstrates all holes are solvable. Browser tests exercise intro, sliders, drag launch, real-time and deterministic flights, failure, reset, best score, progression, full course completion, help, sound, pause/resume, visibility pause, persistence, viewport overflow, and absence of runtime errors. `gameplay.png` is an internal review capture of the real 393 × 852 game.

A deterministic test API exists **only** with `?qa=1`: `window.__gravityGolf`. Methods: `getState()`, `load(index)`, `setAim(angle,power)`, `launch()`, `step(ticks)`, `pause()`, `save()`. In this mode animation does not advance automatically. The pure `GravityGolfCore` simulation is shared by preview, actual flight, and the test harness. Normal play exposes no control hook.

## Remaining practical limits

Progress is local to each browser/device; clearing application data clears it. The game requires canvas and modern JavaScript. Native Android install, signing, and wrapper checks belong to the separate parent release workflow. There are no accounts, ads, purchases, remote services, or hidden external dependencies.

## Visual review

The final internal capture was inspected for the mint-on-deep-green palette, readable score hierarchy, original shaded planet art, an unobstructed trajectory and portal, generous touch targets, slider alignment, footer spacing, and a complete first phone viewport. No material visual defects remain. A generated concept was intentionally omitted because the scoped brief expressly requests original code-drawn canvas planets/starfield and a self-contained file; this is the intentional art-workflow deviation.
