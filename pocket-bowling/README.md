# Pocket Bowling 1.0.0

A tiny, fully offline portrait ten-pin bowling game for Android 8+.
Package: `com.andrefiker.pocketbowling`. No accounts, network, ads, tracking or backend.

## Play

Position the ball with the slider or by touching the lower lane. Flick upward to release. Distance and speed control power; sideways movement controls direction. For precise accessible delivery use POSITION, AIM, POWER, SPIN and BOWL. Positive spin hooks right. The primary button is left-friendly by default; settings mirror the action row.

Classic has ten frames; Quick has five with normal final-frame bonuses. Practice allows repeated deliveries and rack selection. Challenge asks you to clear one formation per shot; failures repeat the formation. Time Attack counts pins for 90 active seconds, resetting all ten after every delivery; menus/backgrounding pause the clock, and an already released roll finishes after the buzzer.

A strike receives the next two rolls; a spare the next roll. The scorecard leaves cumulative totals blank until bonuses are known. The HUD shows the most recent confirmed cumulative total and labels pending bonuses. Classic completed games alone contribute games, best, average and perfect games. Classic + Quick count strikes/spares, including bonus fresh racks. All modes count pins; challenges count one-shot clears. Streaks reset when starting a new game.

## Physics model and limits

The deterministic 120 Hz planar solver models a 6.8 kg ball and 1.53 kg pins. Units are metres, seconds, kilograms. Ball radius .108 m; upright pin radius .061 m; pin centres .305 m apart in a triangular rack. Restitution is .42. Rolling deceleration is .13 m/s². Spin applies lateral acceleration growing along the lane; it is an accessible approximation of lane oil and hook. Pin impulses create angular velocity and tilt; gravity-like instability grows tilt above .3 radians. A pin is down at .8 radians or on leaving the deck. Fallen pins enlarge their collision footprint and can knock down others. Pins remain physical bodies and are never removed by ball proximity. Remaining standing positions persist between throws.

A delivery resolves after the ball passes the deck and pin motion remains below thresholds for .65 s, with a 10-second ceiling. This is not full 3D rigid-body bowling. The camera keeps the whole lane visible using the same projection for the ball, guide and pins; there is no camera jump during aiming. Pin removal and fresh racks occur after resolution.

## Recovery

Before release, persist the rack, rolls and preferences with phase `rolling`. The simulation itself is temporary. Commit a roll and its stats exactly once after settlement, in the same localStorage value. Restarting the app during motion changes `rolling` to `ready` and replays the pre-throw rack without awarding pins. Backgrounding pauses active simulation. Successful rolls, standing coordinates, settings and stats save locally. No Android backup. Statistics reset requires confirmation. If browser storage is unavailable, the footer reports that progress cannot be retained.

## Source and builds

No runtime or build JS dependencies. Serve this directory with a static server, or build the production PWA:

```
npm test
npm run build
python3 -m http.server 8765 --directory dist
```

Android uses a minimal Java WebView wrapper. Every asset is intercepted from the APK under a synthetic HTTPS origin. There is no Internet permission, remote gameplay request or localhost dependency. Only VIBRATE permission is requested. Native status/navigation bars reserve phone safe areas.

```
ANDROID_HOME=/path/to/sdk ./build-android.sh
# Without javac, also set ECJ_JAR=/path/to/ecj.jar
```

Requires Java 17 runtime, Android platform 35, build-tools 35.0.0, zip and Python 3. The script runs tests, builds assets, compiles Java and DEX, aligns, signs and verifies. It uses the explicitly non-production standard debug key at `$HOME/.android/debug.keystore` or `POCKET_DEBUG_KEYSTORE`. Keep that key to sign future updates; it is deliberately excluded from Git. A different key requires uninstall/reinstall, losing local saves. Not a Play Store production signature.

`release/Pocket-Bowling-v1.0.0.apk` is the exact locally built candidate. CI checks its embedded files against `dist`, verifies identity/signature/alignment, runs browser and emulator QA, then publishes that same APK without rebuilding or changing its signature.

## Verification

`npm test` covers official scoring examples, exhaustive legal final-frame triples, invalid racks, pending totals, five-frame scoring, physical collisions/tipping/gutters, power/spin, deterministic outcomes, all formations, scoring commit-once, persistence, stats and complete physics games.

`node scripts/browser-qa.mjs` (test-only Playwright installation) plays two complete ten-frame games through BOWL, tests a pointer flick, phone sizes 320×568 through 412×915, menus, themes, recovery, practice/challenge/time attack. It captures screenshots and JSON.

`scripts/emulator-smoke.mjs` installs the release APK on an API 35 Pixel 2 emulator, disables Wi-Fi/mobile data, launches, performs a pointer swipe, backgrounds/resumes, and force-stops/reopens to check saved recovery. Physical phone testing remains separate.

See APP_STATE.md and the GitHub Actions run for actual results. A script's existence is not a claim that it passed.

## Assets and privacy

All artwork (canvas shapes, vector app icon) and synthesized audio are original project code. No downloaded artwork, fonts or audio, and no external assets or runtime dependencies. Sound and haptics can be disabled independently. The Android app uses Web Audio and honors the system media volume. No optional AI opponents in 1.0.0.

## Rollback

No main merge or unrelated app edits. Pre-project base: `0db2815c14b727031d63e7c14ef0a75255690e90`. To abandon the project use that base, or delete the dedicated branch and release only after owner review. Android uninstall removes local data; it is not needed for source rollback.
