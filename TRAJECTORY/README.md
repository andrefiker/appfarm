# TRAJECTORY 1.0.0

An offline, portrait artillery game for Android. Package `com.andrefiker.trajectory`, version code 1; Android 8.0/API 26 or newer.

## Play

PLAY starts a duel against Easy, Normal or Hard AI. Set angle and power with the sliders, 1-unit buttons or a drag on the battlefield, choose a shell, then FIRE. Wind is horizontal acceleration and remains fixed through each match. Shots share the same physics on both sides; use the fading previous trail to correct your range. Three direct standard hits normally finish a duel, with splash and falling changing the calculation.

PRACTICE is five targets with a full guide that can be switched off. Fewer shots earn more points. CHALLENGES contains fifteen open scenarios with up to three stars each. LEARN THE ARC is a short interactive practice tutorial. Pause offers resume, immediate restart, or menu. Settings include sound, haptics, left/right FIRE placement, practice guide and camera/particle motion. Records show completed-match statistics and six local achievements.

## Architecture

No runtime dependencies. `web/src` separates weapons, terrain, physics/collision, AI, scenarios, game state, storage, sound, rendering and input/UI. `dist` is the complete production build: classic JavaScript bundle, CSS and HTML. Procedural artwork and synthesized Web Audio work offline without downloaded assets. A small Java WebView shell bundles `dist` directly.

World coordinates: x increases right, y down. Gravity is 100 world units/s²; physics advances at 1/120 second with exact constant-acceleration integration and swept samples at most 2 world units apart. Terrain is a heightfield at 2-unit spacing, with circular craters. Explosions, falling damage and settling are shared by gameplay and cluster prediction. Standard is balanced; Heavy is slower with larger damage/craters; Cluster splits once into three bomblets after the apex. AI searches the same physical simulation with seeded precision errors that shrink across attempts. It never changes shell physics.

## Build and test

Node 22 or newer:

```sh
cd TRAJECTORY
node --test tests/*.test.js
node tools/build.mjs
node --check dist/game.js
```

Android: Java **JDK** 17, Gradle 8.10.2, Android platform 35 and build-tools 35.0.0, AGP 8.7.3:

```sh
node tools/build.mjs
gradle -p android --no-daemon :app:assembleDebug
```

`ANDROID_HOME` must point to an installed SDK. The output is `android/app/build/outputs/apk/debug/app-debug.apk`. `.github/workflows/trajectory-apk.yml` supplies the same pinned build on a hosted GitHub runner when manually dispatched. No deployment or release publishing is part of that workflow.

Mobile browser QA uses Playwright 1.62.1 and Chromium. Install the development tool separately, then run `node tools/mobile-qa.cjs`. Set `PLAYWRIGHT_MODULE` to an alternative module path and `CHROMIUM_PATH` to an existing Chromium when necessary. The harness starts its own temporary local server; the game needs no server. `qa-output/` is generated and ignored.

## Signing and updates

The delivered APK uses a preserved Android debug RSA key, verified with APK v2 and v3 signatures. The private `TRAJECTORY-v1.0.0-signing.p12` is kept separately from the public source. Alias: `androiddebugkey`; standard debug store/key password: `android`. Certificate SHA-256: `39bd289abd6f0415fe88afb31d491374356d0002ef24a48100e0f1849bd88e1c`.

Future APKs must be signed with that same key to update this installation. A newly generated CI debug key cannot update it. Use Android build-tools `apksigner sign` with the preserved PKCS12 and enable v2/v3 after building; verify the certificate before delivery. Never commit the key to the public repository. An example signing script is in `tools/sign-apk.sh`.

## Privacy and lifecycle

Only permission: VIBRATE. No Internet permission, login, ads, tracking, cloud, external assets or backend. WebView network loads, foreign navigation, content access and mixed content are blocked; CSP also blocks network requests. Progress/settings use only local storage, and Android backup is disabled. Uninstalling clears progress. Backgrounding pauses simulation and sound and requires explicit resume; interrupted matches are not restored after process death, while completed progress and settings survive app restart.

## Verification and limits

22 automated tests passed, including fifteen authored challenge wins, moving-target solutions at sixteen start times, solutions from both sides on twenty generated fields, 500 terrain seeds, cluster-preview/live equivalence, AI precision/adaptation, collision/craters/settling, persistence and replay. Touch gameplay checks passed at 360×640, 390×844 and 412×915. The production file:// bundle launched and played with networking disabled, with no script errors or remote requests. See `evidence/` and `RELEASE.md`.

APK package/version, launcher, portrait orientation, signature, ZIP structure, 16 KB alignment, permission audit and byte-identical bundled assets were verified. Native Android install/launch, hardware haptics/sound and physical-device performance were **not** tested: no attached device or accelerated emulator was available. Browser testing is not an Android installation test.
