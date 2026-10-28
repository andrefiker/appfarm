# SAND LAB state

- Identity: SAND LAB 1.0.0 / versionCode 1, com.andrefiker.sandlab, Android API 26–35.
- Architecture: dependency-free Canvas cellular grid, local IndexedDB worlds and session autosave; tiny Java WebView with intercepted bundled assets. No backend or permissions.
- Branch: sand-lab/v1.0.0. Source commit is the commit targeted by release tag sand-lab-v1.0.0. No main merge.
- APK: release/Sand-Lab-v1.0.0.apk, SHA-256 1e97f71eda555e430ecdd9611ec81445ad87f8babbeacbacaecfc6d6c081d5de.
- Signature: dedicated self-signed test RSA 3072 key; APK v2/v3 verified. Certificate SHA-256 56d85ae7c775ed79efe86fa5e07ea47b34d8cd0fa7e8dc3235731f5760ad8c7c.
- Private upgrade key: Library libfile_cc92934a31ec81918a1da48d7a26d42c, Sand-Lab-signing-v1.p12, alias sandlab, test password android. Do not publish the key. APK Library copy libfile_edca1bcce3988191845c903e2431175a.
- Verified locally: 32 deterministic tests; browser painting, undo/redo, pause/speed, save/load/rename/duplicate/delete, settings/camera, background session restoration; live playtests of all six experiments; no browser errors or remote requests; 360×640, 390×844, 768×1024 layouts. APK ZIP/assets/package/version/launchable activity/alignment/signature; zero permissions.
- Worst-case full standard grid mean step times in desktop Chromium: water 3.4 ms, fire 8.5 ms, smoke 2.4 ms, lava 2.8 ms. These are host measurements, not phone benchmarks.
- Local software emulator attempted without KVM; ADB did not become available. CI release gate runs Android 15 emulator install/offline/UI/persistence checks before publication. Its results must be inspected; no physical-device test is claimed.
- Release: https://github.com/andrefiker/appfarm/releases/tag/sand-lab-v1.0.0 (published only after CI gate).
- Limitations: simplified heat/reactions; no sound/haptics, extra materials or pinch zoom; finite presets; big worlds may slow. Twelve named worlds / 24 MB, 8 MB JSON import, eight undo snapshots. Session autosave is periodic; export before uninstalling.
- Rollback before app: 0db2815c14b727031d63e7c14ef0a75255690e90.
