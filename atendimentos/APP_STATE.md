# APP STATE — Atendimentos

Display name: Atendimentos  
Directory: `atendimentos/`  
Package: `com.andrefiker.atendimentos`  
Version: 1.0.0, versionCode 1, minSdk 28, targetSdk 34  
Architecture: local `file:///android_asset/index.html` WebView; private on-device JSON import; DOM storage; no bundled clinical records, Internet permission or Android backup.  

## Verified build

Branch: `work/atendimentos-apk-20261011`.  
Source/build commit: `9dc690880daeee3a39dd0bb9fa76554deb20cd42`; CI run `38100517454` succeeded.  
APK: `Atendimentos-v1.0.0-debug.apk`, SHA-256 `1ac97515b08f1164cb372bf42d648a1e052d9a5b4ba73c65a8405ae1ab9256bd`, 32,883 bytes.  
Signing: Android debug certificate, v2 verified; certificate SHA-256 `10678c939e706f926ac099233e4996bb0b4711d69f06ce9a36a0bf5d36df101b`. A different signing key will require export, uninstall and private import.  

Synthetic schema tests passed. Browser smoke passed for empty state, roster import, focus/navigation, note persistence on reload, clipboard, roster export, offline reload and document link rendering. The supplied 11-record JSON passed schema validation locally and was never sent to CI. APK badging, signature, assets and no-Internet-permission checks passed in CI. No physical-phone check has been performed. Native file picker and save document flows remain for phone verification. An emulator attempt is tracked in CI run `38100695620` and should not be claimed as passed without its completed result.

Rollback target: repository `main` at `0db2815c14b727031d63e7c14ef0a75255690e90`, before this app directory existed. No merge or production deployment.
