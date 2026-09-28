# QA — Quiet Breakout 1.0.0

## Automated checks

- `npm test`: 10 test cases cover all 30 deterministic stage boards, wall reflections, paddle angle influence, horizontal-velocity floor, speed cap, high-speed brick collision, normal/tough brick scoring and damage, life loss/game over, stage clear/advance, paddle clamping, and pause/resume.
- `npm run check`: JavaScript syntax checks pass.
- Android workflow reruns gameplay tests, creates the local WebView bundle, builds the APK, checks package/version with `aapt`, and verifies the debug signature with `apksigner`.

## Current environment verification

- Browser preview server returns the local game files. A browser screenshot could not be captured in this build environment: Playwright is installed without its Chromium binary, and the connected Chrome session blocks access to this workspace's loopback server.
- The current workspace has no Android SDK, Gradle, `adb`, emulator, or signing tools. GitHub Actions is the configured Android build route; no APK is claimed until its artifact is retrieved and inspected.
- Physical-device and emulator gameplay checks remain pending the APK artifact. Automated game logic and the offline asset bundler are testable locally.

## APK checks performed in CI

The workflow checks that the APK exists, has package `com.andrefiker.quietbreakout`, version code `1`, version name `1.0.0`, and a valid Android debug signature. Installation/device testing is not currently automated.
