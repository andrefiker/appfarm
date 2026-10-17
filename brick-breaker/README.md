# Brick Breaker — v1.0.0

A standalone portrait arcade game built for Craftian in HTML, CSS and vanilla JavaScript.

## Play

Open `index.html` in a modern browser, or serve this directory with `python3 -m http.server`. No build step or server API is required. All assets and sounds are generated locally. Best score and sound preference use browser localStorage when available. No accounts, analytics, external assets, or network requests are part of the game. Browser storage may be cleared by the browser or user.

Drag anywhere on the playfield or the strip below it to move the paddle. Tap Launch ball to serve. Keyboard: arrows or A/D to move, Space to launch, P or Escape to pause. Catch W for a 16-second wide paddle, S for a 12-second slow ball, or 3 for multiball. Three lives; progressive layouts and stronger bricks. The game pauses when the browser loses focus or is hidden.

## Craftian project

Project ID: `brick-breaker-zl4y7d`

Editor: https://craftian.ai/ide?app=brick-breaker-zl4y7d

Canonical page: `website/index.html`. Published with the user's approval on 2026-10-17 at https://brick-breaker-zl4y7d.craftian.app . Deployment: `7fd793ec_e895_414e_962e_587daa6f9169`. Update this same project for future changes; do not create a duplicate. No database is required.

## Tests

`QA.json` contains the executed check list and verification limits. `qa.cjs` exercises the actual game code in headless Chromium with Playwright. It starts its own local HTTP server on port 8765 and enables an opt-in `?qa=1` test hook. The hook does not make network calls or expose user information. Test frames are manually advanced for deterministic results.

To reproduce: install Playwright in a disposable Node environment, place this folder at `brick-breaker/` under your working directory, set `CHROMIUM_PATH` to a Chromium executable, then run `node brick-breaker/qa.cjs`. In the supplied environment, Playwright is resolved through `CODEX_PRIMARY_RUNTIME_NODE_MODULES`. The harness writes two local screenshots in that folder; these are internal QA output.

## Verification limits

Tested at 393×852 and 320×700 in headless Chromium 153: 19 checks passed. Rendered gameplay inspected. No physical phone installation or on-device playtest performed. No full offline caching/service worker is included for the hosted URL; the downloadable single HTML file and Android package are self-contained.

## Android APK

Package: `com.andrefiker.brickbreaker`; version `1.0.0` / code `1`; min Android 8.0 (API 26), target API 35. Portrait orientation. No requested permissions. Game HTML is bundled in the APK; no Internet connection is required. High scores are stored locally in the Android WebView. Uninstalling deletes those scores. The native wrapper pads system insets, pauses in the background, and blocks external navigation.

Build: use JDK 17, Gradle 8.10.2, Android SDK 35 and build-tools 35.0.0. Set `ANDROID_HOME` and run `gradle --no-daemon -p android :app:assembleRelease`. The initial sandbox build used offline dependencies and excluded `lintVitalAnalyzeRelease`, `lintVitalReportRelease`, and `lintVitalRelease` because the lint-gradle artifact was not cached. Release lint was not performed; Java compilation and APK packaging passed.

The unsigned APK must be zipaligned and signed using the dedicated persistent Brick Breaker key. Its certificate SHA-256 is `ae481cc4e8c5a346c894ea518695c91831a38c7fa7f5336aa05c4f45de03beb2`. The key and password are preserved in a separate private signing backup, never in GitHub. Keep the same key and increase versionCode for future compatible updates. APK checks: correct package/version, launchable activity, portrait declaration, no permissions, bundled HTML matches source, zip alignment, v2/v3 signature verification, and no debuggable application flag. Emulator/device installation remains unverified.
