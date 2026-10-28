# Release verification — 1.0.0

Verified source: 4cdfab4433653d2e03a0a83781b35063319d12fb. Branch sand-lab/v1.0.0; tag sand-lab-v1.0.0; main unchanged.

APK SHA-256: 123f988848e8ccc50e154bd083283a1d03d0688bb09e9c7018cca305c895c51c. Package com.andrefiker.sandlab, versionCode 1, versionName 1.0.0. Dedicated self-signed test key; v2/v3 signatures, alignment and ZIP integrity verified. Zero permissions. Every production web asset is byte-identical inside the APK.

34 deterministic tests pass, including diagonal sealed corners and an hourglass that drains without wall leaks. Browser playtests cover painting, undo/redo, pause/speed, camera/themes/handedness, named world management and exact session restore. Six live experiments checked; browser console errors and remote requests: zero. Layouts 360×640, 390×844 and 768×1024 inspected.

Android 15 emulator run: https://github.com/andrefiker/appfarm/actions/runs/40773783405 — success. Installed the exact APK, disabled Wi-Fi/data and enabled airplane mode, launched, painted a continuous sand stroke, paused, undid/redid, opened brushes, saved and loaded a named world, backgrounded and force-stopped, reopened and verified persistence. Native launch and painted screenshots inspected: header is below system status icons; brush/speed controls clear navigation. No app fatal exception or uncaught JavaScript error in the tested run.

The first native run exposed ignored WebView padding under Android 15; a FrameLayout now owns insets. A separate emulator Pixel Launcher ANR was diagnosed from the UI tree and screenshot; the harness dismisses only that explicitly identified system-launcher dialog, never an app ANR. One transient SDK download corruption was retried. Publication remained blocked until the passing native run.

Release download was fetched independently, compared byte-for-byte with the local signed candidate, and hashed again. Source ZIP includes complete app source, wrapper, tests, production dist and full native QA screenshots/results/logs. GitHub release: https://github.com/andrefiker/appfarm/releases/tag/sand-lab-v1.0.0

Limits: no physical-phone test or phone FPS claim; older Android/WebView combinations untested (use a current System WebView). No sound/haptics, pinch zoom or extra materials. Large worlds may slow. Native SAF JSON import/export compiles and shares the validated codec but document-picker UI was not exercised by this smoke test. Heat and reactions are simplified gameplay rules.

Rollback before this new app: 0db2815c14b727031d63e7c14ef0a75255690e90. Dedicated test signing key retained privately for upgrades; never committed.
