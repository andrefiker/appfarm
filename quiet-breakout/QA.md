# QA — Quiet Breakout 1.0.0

## Automated checks

- `npm test`: 10 test cases cover all 30 deterministic stage boards, wall reflections, paddle angle influence, horizontal-velocity floor, speed cap, high-speed brick collision, normal/tough brick scoring and damage, life loss/game over, stage clear/advance, paddle clamping, and pause/resume.
- `npm run check`: JavaScript syntax checks pass.
- The Android workflow reruns gameplay tests, builds the offline WebView bundle and APK, checks package/version with `aapt`, confirms the APK has no Android permissions, verifies the debug signature, and checks that bundled game assets are present.

## Verification limits

- Interactive browser preview and screenshot testing were unavailable: the installed Playwright package has no Chromium binary, and the connected Chrome session blocks access to the workspace loopback server. Touch dragging, rapid direction changes, and visual rendering have not been manually claimed as tested.
- This workspace has no Android SDK, Gradle, `adb`, emulator, or signing tools, so packaging ran in GitHub Actions.
- The APK passed CI package, asset, permission, and signature checks. It has not been installed on an emulator or physical phone; background/resume and device-level gameplay remain unverified.

## Build route

GitHub Actions uses Java 17, Android SDK 35/build-tools 35.0.0, Gradle 8.10.2, and Android Gradle Plugin 8.8.1. No backend, network permission, or runtime service is required.
