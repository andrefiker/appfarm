# Tower Stack 1.0.0

An offline portrait stacking game for Android 8+ (`com.andrefiker.towerstack`).
All five modes and three palettes are available without unlocking. No accounts,
ads, analytics, APIs or backend. VIBRATE is the only requested permission.

## Build and tests

- `npm test` — seeded generation, real physics, scoring, collapse, replay and persistence tests.
- `npm run build` — self-contained production `dist/index.html` and Android asset.
- `npm install --no-save playwright@1.56.1 && npx playwright install chromium && npm run qa` — phone viewport playthrough and screenshots.
- Java 17, Android SDK 35, Gradle 8.10.2: `gradle -p android :app:assembleDebug`.
- APK: `android/app/build/outputs/apk/debug/app-debug.apk`.
- CI additionally installs and plays the APK in an Android 35 Pixel 2 emulator,
  with Wi-Fi and mobile data disabled. See `.github/workflows/tower-stack-apk.yml`.

Debug signing is intentional and permitted for this release. It is not a Play
Store production signature. Install the release APK with Android's local package
installer. Updates must share its signing certificate; do not assume independently
rebuilt debug APKs can update it. Preserve the published APK for reproducible installs.

## Design and rules

Matter.js 0.20.0 (MIT; notice in `vendor/MATTER-LICENSE`) handles unconstrained rigid
bodies at 60 fixed simulation steps/s, 10 position/8 velocity iterations, slight
restitution and material friction. Shapes are rectangles and trapezoids; density
changes mass and inertia. Gravity, torque and collapse are simulated, never scripted.
Body sleeping is disabled because support removal could leave sleeping bodies
suspended. Rendering culls offscreen blocks; paused games do no simulation work.
The accumulator caps catch-up at 100 ms, so severe stalls slow active game time
rather than produce a physics explosion. The three-minute clock measures active
simulation time, excluding pauses and background time.

One standard 28-unit block = 1 metre. Height is the top of live tower geometry
above the platform. Score is awarded once at placement resolution:
`100 + floor(height)*10 + (stable ? 25 : 0) + min(stable streak,10)*5 + alignment`.
Alignment is `round(max(0,1-abs(block centre-support centre)/50)*bonus)`, bonus
100 in Precision, 30 elsewhere. Stable means all live bodies are below speed
0.12 and angular speed 0.004 for 36 consecutive ticks. At 10 seconds a moving
placement resolves without stability or streak points, allowing play to continue.

Competitive runs end on a missed platform. After three scored blocks, losing
at least 40% of scored blocks (minimum two) or height below 38% of peak for 90
ticks ends a collapsed run. Harmless swaying does not end the game. Zen and
Sandbox continue after falls. Time Attack ends at tick 10800, scoring resolved
placements only. Endless ramps bounded widths and introduces trapezoids, low
friction ice and heavy stone. Precision uses identical wood blocks. Sandbox
permits choosing wood, stone, ice, narrow, wide and trapezoid blocks.

## Save strategy

LocalStorage keeps preferences, statistics and a schema-versioned run. Every drop
records its tick, x, rotation and configuration. Continue rebuilds the same seeded
simulation and replays all ticks to the saved point, including an active fall.
This avoids approximating a Matter contact solver snapshot. Replay is tested to
0.001 world units on centered and collapsing examples. Rendering never allocates
physics bodies. Replay is synchronous; long sessions can take a moment. Saves
occur on drop, resolution, pause, background and page exit. Abrupt process death
without a background callback can return to the most recent saved event.
No cross-engine or future-version bit-for-bit guarantee is made. Invalid saves
are rejected; personal records and settings are independent.

## Controls and access

Drag anywhere in the play area and release; or tap the centred wide DROP button.
Controls work equally from either hand. Optional rotation uses 15-degree steps.
The guide shows the exact drop x plus an approximate first contact surface;
rotation and subsequent rigid-body movement are physical, not promised by the guide.
↕ shows the entire structure, with a persistent base overview on tall towers.
Sound, haptics, palette and reduced motion are independent settings. Backgrounding
pauses safely and requires Continue. Android back opens the pause menu.

## Privacy and licensing

All assets are bundled. Artwork is procedural and original. Sounds are quiet,
procedurally synthesized tones. The wrapper blocks external navigation and
requests and has no Internet permission. No data leaves the device. Uninstalling
removes local records. Source and wrapper are in this directory; no external build
service is required to play. The surrounding AppFarm repository is preserved.
