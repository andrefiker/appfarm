# Verification — Screen Time Widget 1.1.0

Executed: 2026-10-10 UTC (2026-10-09 America/Sao_Paulo).

- Package: `com.ghost.screentimewidget`; versionName `1.1.0`, versionCode `2`.
- Min SDK 28, target/compile 35; original identity and private signing key preserved.
- Branch: `feat/screen-time-widget-v1.1-20261010`, `andrefiker/appfarm`; main untouched.
- Rollback: `d131aa31f74b5921cde1ab9cf66771bf34615904` (v1.0.0).
- Final wrapper command: `./gradlew --offline --no-daemon :app:testDebugUnitTest :app:lintDebug :app:assembleDebug` (Java 17, local SDK 35/build tools 35.0.0).
- **BUILD SUCCESSFUL**. **84 tests passed**, 0 failures/errors/skipped: {"MainRenderTest": 2, "IntervalMathTest": 14, "AndroidLocalTest": 15, "BehaviorMathTest": 53}.
- Lint: **0 errors, 23 warnings**. No lint baseline/error suppression. Warnings are optional newer widget metadata, strings/translations, battery-exemption prompt, backup metadata and layout suggestions.
- Artifact: `Screen-Time-Widget-v1.1.0.apk`; build output `app/build/outputs/apk/debug/app-debug.apk`.
- APK bytes: `27926007`; SHA-256: `3cec81e4c82980dc02446e8985e4b65b1ba681c8769c00c8c1a23a5a148bfad9`.
- ZIP CRC/integrity check passed. Alignment `zipalign -c -P 16 4` passed.
- APK signature verification passed: v3, RSA 2048, one signer. Certificate SHA-256: `fffd977bc63ed751632f4c554dc951472675a487de9cfbbdeebd6934220a0c92`.
- **Certificate equals the supplied v1.0.0 APK certificate** and package ID is identical; versionCode increased. These satisfy signing/package/version requirements for in-place updating. Actual installation update is not physically verified.
- Launchable activity: `com.ghost.screentimewidget.MainActivity`.
- No INTERNET, ACCESS_NETWORK_STATE, overlay, Accessibility Service or Device Administrator permissions. Test-only Robolectric dependencies are not packaged as application dependencies.
- Native-graphics Robolectric tests use Android SDK 35: actual SQLite close/reopen/deduplication/retention; automatic/idempotent awards and challenge persistence; overnight exclusion; unknown history; clock fences; production RemoteViews in compact 120×110 and 180×120, medium 320×190 and expanded 320×260 layouts, light/dark. Images visually inspected; small-widget title shortened after finding truncation.
- Actual Compose MainActivity launched/rendered at 360×800 light and 320×720 dark. Light image captures the loading state; dark image captures the denied-permission onboarding. Both tests assert denied permission is read. Widgets use synthetic regression data; images are not measurements from Andre's phone.
- Pure logic tests cover event ordering/duplicates/open and overlapping intervals, midnight/reboot boundaries, confirmed/estimated returns, sleep including DST, shaping, baseline insufficiency, same-period comparisons, clock changes, challenge recognition, message variation/rate limits, and no duplicate rewards.
- Final adb inventory: no connected devices. No physical device or emulator installation/launch, actual Android 16/HyperOS, actual launcher resize/pin, boot recovery, screen-transition timing, overnight or battery reliability claim. Progress/Settings Compose screens and their interactions are not fully rendered/interaction-verified. Follow TEST_CHECKLIST.md.
- CI not run: verified local wrapper build produced this exact artifact. Host tests are not device/OEM tests.

`release-evidence/` contains executed test XML, build/lint reports, manifest/signature inspection and host-rendered images. Source and key are in the private source archive; the key is excluded from Git. Keep the key for updates. No claim of measured behavioral effectiveness is made; the implemented design needs real-use evaluation.
