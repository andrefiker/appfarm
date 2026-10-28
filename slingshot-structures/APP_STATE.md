# APP STATE

Display name: Slingshot Structures
Directory: slingshot-structures
Package: com.andrefiker.slingshotstructures
Version: 1.0.0 / versionCode 1
Branch: feat/slingshot-structures-v1.0.0
Release commit: resolved by tag slingshot-structures-v1.0.0
Release: https://github.com/andrefiker/appfarm/releases/tag/slingshot-structures-v1.0.0
APK: dist/Slingshot-Structures-v1.0.0.apk
Architecture: Canvas + vendored Matter.js 0.20.0; localStorage; minimal Java Android WebView. No backend or network permission.

Verified: 19 engine tests; all 30 Classic stability and sampled solution checks; offline touch gameplay and checkpoints in desktop Chromium; 4 portrait sizes; local signed APK build and structural verification. See QA.md, validation.json, mobile-qa-results.json and dist/verification.txt.

Device install/launch: NOT tested; no connected Android device or emulator. Android FPS/audio/haptics/background behavior require hardware validation.
Signing: debug/test RSA key; private key excluded from repository. Rebuilding with a different debug key may require uninstall.
Release binary checksum: dist/SHA256SUMS.txt.
Rollback baseline before this new app: 0db2815c14b727031d63e7c14ef0a75255690e90. No unrelated games changed; main is not merged.
