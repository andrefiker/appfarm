# Pocket Bowling — verified release state

Updated: 2026-10-28. Owner: André Fiker.

## Identity and release
- Pocket Bowling 1.0.0; version code 1; package `com.andrefiker.pocketbowling`.
- Directory: `pocket-bowling/`; branch: `codex/pocket-bowling-v1.0.0`.
- Verified release commit: `a91227e3e91ebc192e03748b45e68a117bf974b1`.
- Tag: `pocket-bowling-v1.0.0`, verified to point to that commit.
- Release: https://github.com/andrefiker/appfarm/releases/tag/pocket-bowling-v1.0.0
- APK: https://github.com/andrefiker/appfarm/releases/download/pocket-bowling-v1.0.0/Pocket-Bowling-v1.0.0.apk
- APK size: 29,756 bytes; SHA-256: `6ff9af349cae2f38c18315b5611bfb72a321614e48e741ed564fbe409973d6c8`.
- Public APK was downloaded and compared byte-for-byte with the verified candidate: identical.
- Main was not merged or edited; unrelated games preserved. No web deployment, backend or DB migration.

## Architecture and behavior
Dependency-free canvas, shared perspective/inverse touch projection, deterministic 120 Hz planar ball/pin physics with impulse-driven tilt. Separate ten-pin scoring engine. LocalStorage transaction saves game + statistics + preferences together. Bundled Java WebView intercepts local assets under a synthetic HTTPS origin; no Internet permission or remote runtime dependency.
Classic, Quick, Practice, Challenge and 90-second Time Attack. Three themes, flick plus precision controls, hook, left-friendly/mirrored actions, optional synthesized sound and haptics. `dist/` is the production PWA build; no public web deployment was needed.
Interruption during motion restores the pre-throw rack without awarding the interrupted delivery. Standing pin positions persist between throws. Menus/backgrounding pause active play.

## Verified
- Local APK built using Java 17 + ECJ 3.37, Android platform/build-tools 35; min SDK 26, target SDK 34.
- 16 automated test groups pass, including exhaustive legal final-frame triples, perfect/zero/spare games, deterministic physics, gesture projection, statistics/recovery, and preserving unrelated PWA caches.
- Browser UI: two complete Classic games (300 and 80), physical split-to-spare conversion, flick, gutters, spin/power/angle variation, practice/challenge/time attack, restart during motion, menus/preferences, and 320×568, 360×640, 390×844, 412×915 screenshots.
- APK ZIP/DEX/resources, launcher, identity/version, portrait, alignment, v2/v3 signature, and exact production asset equivalence pass. VIBRATE is the only permission.
- Android API 35 Pixel 2 emulator: installed, launched offline, actual swipe delivery, background/resume, and force-stop/reopen with exact scorecard match (nine pins recorded before and after). Safe areas inspected in screenshots.
- Source complete / PWA built / APK built / structurally verified / emulator install-tested. Physical-phone QA and physical-device 60 FPS/audio/haptic feel remain unverified.
- Successful run: https://github.com/andrefiker/appfarm/actions/runs/40775782848
- Durable JSON evidence: `qa/browser-results.json`, `qa/emulator-results.json`; detailed summary: `QA.md`.

## Signing continuity
Standard non-production RSA 2048 Android Debug signature, v2/v3 verified. Certificate SHA-256: `17a7a15aa5428ec112f6a58aba319f526766773f050744516a3c64175477935f`.
Private update key backed up as `Pocket-Bowling-debug-signing.keystore`, Library ID `libfile_974c087b19b881918a883538f5d577d0`. Alias `androiddebugkey`; standard debug store/key password `android`. Materialize that private file and set `POCKET_DEBUG_KEYSTORE` for future builds. Never commit the private key to Git. Reuse it and increment version code to preserve installed saves during updates.

## Limitations and rollback
Planar collision/tipping approximation, not full 3D; no optional AI opponents. Physical phone testing remains pending. Debug signing is not Play Store production signing.
Pre-project rollback base: `0db2815c14b727031d63e7c14ef0a75255690e90`. The immutable release tag is the working 1.0.0 baseline for future changes. Documentation commits after the release do not change its APK or tag.
