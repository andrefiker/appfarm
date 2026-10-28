# APP STATE

Display name: Slingshot Structures
Directory: slingshot-structures
Package: com.andrefiker.slingshotstructures
Version: 1.0.0 / versionCode 1
Branch: feat/slingshot-structures-v1.0.0
Release commit: 9f186f0e4426dc69826f529d969acd3e20714ef5
Tag: slingshot-structures-v1.0.0
Release workflow: https://github.com/andrefiker/appfarm/actions/runs/40771615689 (success)
Release: https://github.com/andrefiker/appfarm/releases/tag/slingshot-structures-v1.0.0
APK: dist/Slingshot-Structures-v1.0.0.apk
Architecture: Canvas + vendored Matter.js 0.20.0; localStorage; minimal Java Android WebView. No backend or network permission.

Verified: 19 engine tests; all 30 Classic stability and sampled solution checks; offline touch gameplay and checkpoints in desktop Chromium; 4 portrait sizes; local signed APK build and structural verification. See QA.md, validation.json, mobile-qa-results.json and dist/verification.txt.

Device install/launch: NOT tested; no connected Android device or emulator. Android FPS/audio/haptics/background behavior require hardware validation.
Signing: debug/test RSA key; private key excluded from repository. Rebuilding with a different debug key may require uninstall.
Release binary SHA-256: 1061088f02059e21b09f1bf7a992718b01b57fae2172663789a98c85eb803f46.
Direct APK: https://github.com/andrefiker/appfarm/releases/download/slingshot-structures-v1.0.0/Slingshot-Structures-v1.0.0.apk
Publication verified: release asset downloaded and compared byte-for-byte with the locally verified APK; checksum and v2/v3 signature rechecked.
Private signing recovery artifact: Slingshot-Structures-v1.0.0-private-signing-backup.zip (owner-only; never publish or commit the key).
Rollback baseline before this new app: 0db2815c14b727031d63e7c14ef0a75255690e90. No unrelated games changed; main is not merged.
