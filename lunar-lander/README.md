# Lunar Lander — Moonflight

An original, completely offline lunar landing game in one dependency-free `index.html`. Navy, ivory and cyan cockpit graphics, eight handcrafted terrain missions, multi-touch flight controls, optional synthesized engine audio, and saved local progress. All visible art is drawn locally on canvas; there are no fonts, trackers, downloads, external assets, accounts, or network requests.

## Play

Open `index.html` in a modern browser, or run a local static server. The Android wrapper is maintained separately by the parent build task.

- Hold **THRUST** to push upward and slow your descent.
- Hold **ROTATE L / R** to tilt. Tilt to travel sideways; reverse the tilt to brake.
- Touch controls support simultaneous rotation and thrust with independent pointer capture. The center thrust button works equally well from either hand.
- Keyboard: **← / A**, **→ / D**, **↑ / W / Space**. **P / Escape** pauses.
- Land with both feet on the cyan pad, descent speed at most **31 m/s**, horizontal speed at most **22 m/s**, and tilt at most **12°**.
- Fuel is limited. An empty tank stops thrust; the lander continues coasting under gravity.
- Pause, restart, choose any mission, or advance after landing. Mission results and best fuel reserves save on this device. Sound starts off and is opt-in.
- Switching away from the app, losing focus, or hiding the page releases held controls and pauses a running flight.

All eight missions are available immediately. The first mission starts directly above a generous 170 m landing zone; later flights introduce traverses, narrower pads, high shelves, ridges and reduced fuel.

## Implementation

The simulation uses a fixed 1/120 second step with capped frame catch-up, gravity of 22 m/s², 59 m/s² engine acceleration, a 1.5 rad/s rotation rate, and fuel burn of 5.2 percentage points per engine second. Collisions sample the rendered lander hull and both landing feet against continuous piecewise-linear terrain. Successful touchdown requires both feet within the pad. Boundary crossings, excess speed, poor attitude and off-pad contacts fail the flight. Velocity caps prevent runaway tunneling without rescuing unsafe touchdowns.

The art is intentionally code-native so the deliverable remains self-contained, crisp at different device densities and fully offline. The screen uses responsive CSS, a dynamically sized canvas, native accessible buttons, and an HTML result overlay. There is no build step or package installation.

## Verification

Run with the runtime's bundled Playwright:

```bash
node qa.cjs
```

`qa.cjs` serves only this directory at `127.0.0.1:8773`, launches the supplied Chromium binary and saves `QA.json` plus `gameplay.png`. It checks safe landings; overspeed, tilt and off-pad crashes; fuel exhaustion; deterministic physics; simultaneous keyboard and pointer inputs; pause/resume; focus-loss release; retry; mission progression; persisted best results; browser errors; and viewport fit at 320×640, 393×852, 768×1024 and 852×393.

The reachability proof flies every mission with an autonomous controller that can only issue the same discrete left, right and thrust actions available to a player. It calls the production simulation at the production fixed timestep, does not teleport or replenish fuel, and records each mission's trajectory, landing speeds, attitude, fuel and duration. Autopilot is available only inside the QA script, not in the released game.

### Opt-in QA hook

Load `index.html?qa=1` to expose `window.__qa`. The hook is absent from normal play. It exposes mission definitions, the pure `step` function, `DT`, terrain sampling, state inspection (`get`), state setup (`set`), mission loading (`load`), explicit stepping (`advance`), isolated simulation (`simulate`), pause and control release. It exists for repeatable verification and is not required for gameplay.

### Scope

Browser tests prove game logic and responsive layout in Chromium. They do not claim physical device or APK installation coverage; those checks belong to the parent Android release task. Browser storage can be cleared by the device or browser, and progress is intentionally local rather than cloud synced. Sound requires a user gesture on platforms that restrict audio.
