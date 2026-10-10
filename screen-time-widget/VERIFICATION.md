# Verification — Screen Time Widget 1.0.0

Date: 2026-10-09 America/Sao_Paulo (2026-10-10 UTC)

- Project: `screen-time-widget`
- AppFarm branch: `feat/screen-time-widget-v1-20261009` (isolated; main untouched)
- Package: `com.ghost.screentimewidget`
- Version: `1.0.0`, versionCode `1`
- Minimum SDK: `28`; target/compile SDK: `35`
- Final Gradle wrapper command: `./gradlew --no-daemon :app:testDebugUnitTest :app:lintDebug :app:assembleDebug`
- Result: **BUILD SUCCESSFUL**
- Pure Kotlin tests: **14 passed**, 0 failures, 0 errors, 0 skipped
- Lint: **0 errors**, 12 warnings. Remaining warnings concern optional API 31 widget metadata, the requested battery-exemption prompt, backup metadata, small/English widget labels and layout suggestions. No error suppression or lint baseline was used.
- APK path: `app/build/outputs/apk/debug/app-debug.apk`
- APK size: `27383526` bytes
- APK SHA-256: `bc08c85ee1aeb944720849700c88dab6b7a2ca0abaca711c6680c47e1907000f`
- Signature: `apksigner verify --verbose --print-certs` PASS, APK v3, RSA 2048; minSdk 28 supports v3. Persistent debug key in private source bundle.
- Signing certificate SHA-256: `fffd977bc63ed751632f4c554dc951472675a487de9cfbbdeebd6934220a0c92`
- ZIP/native page alignment: `zipalign -c -P 16 -v 4` PASS
- Manifest inspection: launcher activity `.MainActivity`; correct package/version/SDK, widget provider and specialUse service; **no INTERNET or ACCESS_NETWORK_STATE permission**.
- XML resources parsed successfully; no night resource folders. API-29-only forceDarkAllowed is properly version-qualified.
- adb: checked before and after build; **no connected devices**.
- CI: not run; verified local Gradle build is the artifact source.
- Install/launch/rendered Android UI, actual widget host, permissions, OEM service reliability, reboot, clock change, process-kill, force-stop and in-place update: **not device-verified**. See TEST_CHECKLIST.md.

This APK is debug-signed and debuggable as requested. Keep its signing key for updates. Source and build evidence do not establish OEM/device runtime behavior.
