# Quiet Breakout

Quiet Breakout is an original, portrait, touch-first brick-breaker built as a local-first web game and packaged in an offline Android WebView shell.

## Play

- Drag horizontally anywhere in the lower playfield to steer the paddle.
- Tap once to serve. Your impact position controls the return angle.
- Clear the board to advance. You have three lives in Classic and Endless; Zen has no life limit and a slower ball.
- Tap the upper-right pause control to pause safely.

Modes: **Classic** (stage run), **Endless** (score chase), and **Zen** (relaxed infinite play). Sound, haptics, and reduced motion are local settings. Best scores and highest Classic stage use local storage only.

## Build and test

Requirements: Node.js 20+ for tests and bundling. Android packaging runs in GitHub Actions with Java 17, Android SDK 35, Gradle 8.10.2, and Android Gradle Plugin 8.8.1.

```sh
npm test
npm run check
node scripts/build-webview.mjs
```

The Android build bundles `web/` into `android/app/src/main/assets/`, converts the ES modules into a single local script for `file:///android_asset/index.html`, and builds `android/app/build/outputs/apk/debug/app-debug.apk`. The APK has no Internet permission and does not contact a server.

To build the Android wrapper locally, install Android SDK platform 35/build-tools 35.0.0 and Gradle 8.10.2, then:

```sh
node scripts/build-webview.mjs
cd android && gradle --no-daemon :app:assembleDebug
```

## Project structure

- `web/`: playable browser/PWA source, manifest, service worker, and original code-rendered game visuals.
- `tests/`: deterministic physics and state-flow tests.
- `scripts/build-webview.mjs`: creates the offline Android asset bundle.
- `android/`: minimal native Java WebView wrapper and Android build files.
- `.github/workflows/build-quiet-breakout-apk.yml`: tests, packages, and verifies the APK on pushes and manual dispatch.

## Release

- Version: 1.0.0 (version code 1)
- Android package: `com.andrefiker.quietbreakout`
- Signing: GitHub Actions debug keystore (installable debug APK; not a Play Store release signature)
- Rollback: `main` at the parent commit recorded in the release metadata.

See `QA.md` for verification boundaries and `release.json` for the source commit and package identifiers.
