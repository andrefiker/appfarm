# Slingshot Structures 1.0.0

Original offline portrait Android destruction puzzle game for André Fiker / AppFarm.

- **Classic:** 30 challenges across towers, bridges, stacks, overhangs, counterweights and corbel arches, with progressively introduced materials and barriers.
- **Endless:** seeded dimensions, placement and material layouts. Initial stability and a sampled physical solution are checked before acceptance. A checked foundation fallback is used if 12 candidates fail. Seeds are reproducible in this engine; universal solvability is not claimed.
- **Precision:** all 30 challenges available, with separate fewest-shot records.
- **Sandbox:** place horizontal or vertical blocks of four materials; stacked placement, undo, clear, saved designs and unlimited shots.
- Three appearances, synthesized original sound effects, optional haptics, mirrored launcher, inspection zoom/pan, local statistics and turn checkpoints.

## Play

Drag the ball backwards to aim and release to fire. Maximum pull: **72 world units**, mapped to a maximum Matter velocity of **17.64 world units per nominal 60 Hz frame**. Pulls below 8% do not launch. Cancel Shot or a second finger cancels. No shot can fire while the previous one resolves. Inspection mode pans the close view; tap Fit to return to aiming.

Striped cores must move more than 40 units sideways, more than 32 units down, or break. The condition must persist for 36 physics steps. Shots resolve for at least 2 seconds, until rest, or at most 7 seconds; the result is latched and the remaining motion is frozen at the turn boundary. This allows completion despite tiny debris motion.

The trajectory uses an isolated projectile with the same engine, fixed step, gravity, drag and launch state as real flight. It predicts **free flight only** and explicitly excludes collisions. Restitution, friction, mass and rotation come from Matter.js. No collapse animations replace structural physics. Broken pieces are removed and replaced with bounded visual dust, not fragment bodies. Removal wakes supported bodies so they can fall.

Damage uses maximum incoming normal relative velocity per body per collision-start batch: `max(0, speed - material threshold) × 2`. Threshold/health: glass 3/4, wood 5/12, stone 11/24, metal 18/60. Density and friction are also material-specific. Health and unique removal prevent double-counting damage from duplicate contacts and destruction events.

Score: `completion ? 1000 + 500 × unused shots : 0`, plus `round(500 × broken pieces / initial pieces)`. Precision prioritizes fewest shots, then score. Other modes retain the highest score. Each challenge is counted complete once.

## Build and test

No frontend install or network dependency is needed to play or run engine tests:

```sh
npm test
npm run validate
npm run serve
```

The static production web bundle is `web/`. Matter.js 0.20.0 is vendored under its MIT license. All other art, drawing code, UI and synthesized sounds are original. No runtime APIs, backend, analytics or ads.

For reproducible touch QA, install Playwright 1.58.2 in your tooling environment and Chromium, then run `node tests/mobile-qa.cjs`. Optional environment variables: `PLAYWRIGHT_MODULE` (module path), `CHROME_PATH` (browser executable), `QA_DIR` (existing output directory; defaults to /tmp). QA runs directly from the bundled files with networking disabled.

Android requires Java **JDK 17** (including javac), Gradle **8.10.2**, Android platform 35 and build-tools 35.0.0:

```sh
ANDROID_HOME=/path/to/sdk gradle -p android :app:assembleDebug
```

If a Maven aapt2 download is unavailable, add `-Pandroid.aapt2FromMavenOverride=$ANDROID_HOME/build-tools/35.0.0/aapt2`.

The wrapper is a minimal Java WebView, Android 8.0+ / API 26, target API 34, portrait, local `android_asset` loading and DOM storage. Only VIBRATE permission is requested; INTERNET is absent. Android retains system bars to keep drag controls clear of gesture edges.

## Persistence and limits

The local save contains progress, statistics, records, settings, seed, sandbox design and a **settled turn checkpoint**. Interrupted shots restore the pre-shot checkpoint and refund that shot's ammunition; total launches still reflects an actual attempted launch. Restored pieces are frozen, with old projectiles cleared. This is deliberately not an exact mid-flight replay. Corrupt or unavailable local storage recovers safely; failure to save is shown in the footer. Uninstalling clears local progress.

Physics uses 120 Hz fixed steps, sleeping bodies, up to 8 catch-up steps per render, a maximum of 5 retained projectiles and 140 visual particles. Sandbox allows 70 pieces. Backgrounding pauses gameplay and WebView timers; resume requires the Resume control. No claim of 60 FPS on untested hardware is made.

Initial release uses **Android debug/test signing**. The private signing key is not published in this repository. Fresh debug builds on another machine may use a different key and require uninstalling the old build. The release APK is preserved byte-for-byte; its checksums and signing certificate are published with the release.

## Verification and release

See `QA.md`, `validation.json`, `APP_STATE.md` and `dist/verification.txt`. The release workflow rebuilds source, runs tests and touch QA, verifies the preserved signed APK against the source assets and publishes the version tag without merging the development branch.
