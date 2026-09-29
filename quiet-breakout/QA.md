# QA — Quiet Breakout 1.0.1

## Automated checks

- `npm test`: 11 test cases cover all 30 deterministic stage boards, wall reflections, paddle angle influence, horizontal-velocity floor, speed cap, high-speed brick collision, normal/tough brick scoring and damage, life loss/game over, stage clear/advance, paddle clamping, pause/resume, and Comfort Mode's slower speed cap and cleared motion effects.
- `npm run check`: JavaScript syntax checks pass.
- `node scripts/build-webview.mjs` and `node --check android/app/src/main/assets/bundle.js`: the offline Android bundle builds and parses.
- The Android workflow reruns gameplay tests, builds the offline WebView bundle and APK, checks package/version with `aapt`, confirms the APK has no Android permissions, verifies the debug signature, and checks that bundled game assets are present.

## Verification limits

- Interactive browser preview and screenshot testing were unavailable: the installed Playwright package has no Chromium binary, and the connected Chrome session blocks access to the workspace loopback server. Touch dragging, rapid direction changes, and visual rendering have not been manually claimed as tested.
- This workspace has no Android SDK, Gradle, `adb`, emulator, or signing tools, so packaging ran in GitHub Actions.
- The APK passed CI package, asset, permission, and signature checks. It has not been installed on an emulator or physical phone; background/resume and device-level gameplay remain unverified.

## Comfort update

- Comfort Mode is enabled by default on fresh installs and upgraded installs. It starts Classic and Endless at 245 px/s, grows slowly between stages, and caps the ball at 320 px/s; Zen remains slower.
- The mode removes screen shake, ball trails, brick particles, shimmer, bright ball glow, and paddle flash. Sound and haptics now start off.
- Existing score storage and Android application ID are retained. An upgrade resets comfort and haptics once to the calmer defaults; later user changes persist.

## Build route

GitHub Actions uses Java 17, Android SDK 35/build-tools 35.0.0, Gradle 8.10.2, and Android Gradle Plugin 8.8.1. No backend, network permission, or runtime service is required.
