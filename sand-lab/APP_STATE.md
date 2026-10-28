# SAND LAB state

- Identity: SAND LAB 1.0.0 / versionCode 1, com.andrefiker.sandlab, Android API 26–35.
- Architecture: dependency-free Canvas cellular grid, local IndexedDB worlds and session autosave; tiny Java WebView with intercepted bundled assets. No backend or permissions.
- Branch: sand-lab/v1.0.0. Verified release source commit: 4cdfab4433653d2e03a0a83781b35063319d12fb, targeted by tag sand-lab-v1.0.0. No main merge.
- APK: release/Sand-Lab-v1.0.0.apk, SHA-256 123f988848e8ccc50e154bd083283a1d03d0688bb09e9c7018cca305c895c51c.
- Signature: dedicated self-signed test RSA 3072 key; APK v2/v3 verified. Certificate SHA-256 56d85ae7c775ed79efe86fa5e07ea47b34d8cd0fa7e8dc3235731f5760ad8c7c.
- Private upgrade key: Library libfile_cc92934a31ec81918a1da48d7a26d42c, Sand-Lab-signing-v1.p12, alias sandlab, test password android. Do not publish the key. APK Library copy libfile_edca1bcce3988191845c903e2431175a.
- Verified locally: 34 deterministic tests; browser painting, undo/redo, pause/speed, save/load/rename/duplicate/delete, settings/camera, background session restoration; live playtests of all six experiments; no browser errors or remote requests; 360×640, 390×844, 768×1024 layouts. APK ZIP/assets/package/version/launchable activity/alignment/signature; zero permissions.
- Worst-case full standard grid mean step times in desktop Chromium: water 3.2 ms, fire 5.8 ms, smoke 2.4 ms, lava 2.5 ms. These are host measurements, not phone benchmarks.
- Android 15 emulator verified in Actions run 40773783405: APK install, offline launch, status-bar clearance, painting, pause, undo/redo, brush menu, named save/load and background/force-stop/reopen persistence all passed. Launch and painting screenshots inspected directly; controls clear status/navigation bars. Earlier emulator launcher ANR was isolated and dismissed by the test harness; app ANRs are never dismissed. No physical-device test is claimed.
- Release: https://github.com/andrefiker/appfarm/releases/tag/sand-lab-v1.0.0 (published and download verified). Complete app source, Android wrapper, tests, production dist and native QA evidence are in the release source ZIP.
- Limitations: simplified heat/reactions; no sound/haptics, extra materials or pinch zoom; finite presets; big worlds may slow. Twelve named worlds / 24 MB, 8 MB JSON import, eight undo snapshots. Session autosave is periodic; export before uninstalling.
- Rollback before app: 0db2815c14b727031d63e7c14ef0a75255690e90.
