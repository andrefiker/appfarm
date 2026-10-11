# APP STATE — Atendimentos

Display name: Atendimentos  
Directory: `atendimentos/`  
Package: `com.andrefiker.atendimentos`  
Version: 1.0.0, versionCode 1, minSdk 28, targetSdk 34  
Architecture: local `file:///android_asset/index.html` WebView; private on-device JSON import; DOM storage; no bundled clinical records, Internet permission or Android backup.

## Verified build

Branch: `work/atendimentos-apk-20261011`.  
Source/build commit: `9dc690880daeee3a39dd0bb9fa76554deb20cd42`; final CI run `38100695620` succeeded.  
APK: `Atendimentos-v1.0.0-debug-emulator-verified.apk`, SHA-256 `6c85bae845d766cdfbdbff0b730ceea6db443480d60b89b58229b0928e37acdb`, 32,883 bytes.  
Signing: Android debug certificate, v2 verified; certificate SHA-256 `dd743866ce5f963b58178390f05f010106f230aabae119b8389497cfe5c528a9`. A different signing key will require export, uninstall and private import.

Synthetic schema tests passed. Browser smoke passed for empty state, roster import, focus/navigation, note persistence on reload, clipboard, roster export, offline reload and document links. The supplied 11-record JSON passed schema validation locally and was never sent to CI. APK badging, signature, assets and no-Internet-permission checks passed in CI. Emulator run installed/launched the app, returned from Home, and force-stopped/restarted it with Wi-Fi disabled. Native SAF import/export UI and physical-phone install have not been tested.

Rollback target: repository `main` at `0db2815c14b727031d63e7c14ef0a75255690e90`, before this app directory existed. No merge or production deployment.
