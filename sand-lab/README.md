# SAND LAB 1.0.0

Offline Android cellular sandbox for André Fiker. Package `com.andrefiker.sandlab`, versionCode 1, Android 8.0+ (API 26). No accounts, network, ads, analytics, permissions or server.

Ten materials: sand, water, stone, wood, fire, smoke, lava, steam, oil and plant. Six live experiments, three themes, left-handed default with mirrored controls, point/circle/line/rectangle/fill/eraser, eight undo snapshots and redo, fixed-step slow/normal/fast simulation, zoom and explicit pan, twelve local named worlds, session autosave, validated JSON import/export via Android document picker.

## Use

Select a material and drag on the world. Circle paints into empty cells; Erase removes. Pause for construction. Tools contains the other brushes, redo, camera, clear and reset. Line and Rectangle show a preview and commit on release. Point paints a one-cell-wide continuous stroke. Fill replaces a connected region, bounded by world capacity. Two fingers cancel an active stroke. Pan mode never paints. Menus suspend the simulation temporarily.

Worlds saves copies locally; Load asks before replacing the session. Rename, Duplicate and confirmed Delete are available per world. Export a JSON copy before uninstalling. Autosave runs every 20 seconds and on background; an abrupt process crash can lose recent unsaved edits. Full world state includes materials, heat, lifetime, tick and RNG. Theme, hand, pause, speed and camera persist; temporary brush choice and diagnostics reset.

## Run and test

`npm test` (Node 22+), `npm run build` (copies and scans the dependency-free production bundle into dist). Serve dist using any local static server; it has no remote resources. Android serves the same files from its own intercepted internal HTTPS origin, with all other requests blocked.

Browser QA uses Playwright from `CODEX_PRIMARY_RUNTIME_NODE_MODULES`; set `CHROMIUM_PATH` if needed. Run `npm run qa`, then `node scripts/experiments-qa.mjs`. The latter loads and runs all six experiments, checks reaction outcomes and captures screenshots. This session used headless Chromium because no Browser plugin automation tool was exposed; full Chrome was blocked by the host Unix socket policy, while the headless shell ran successfully.

## Android build

Two supported routes:

1. `ANDROID_HOME=/path/to/sdk ECJ_JAR=/path/to/ecj.jar SANDLAB_KEYSTORE=/private/sandlab.p12 bash scripts/build-apk.sh`. Needs SDK platform/build-tools 35 and Java 17; javac or ECJ. The script compiles Java, bundles production assets, aligns, signs and verifies the APK. If no existing key is supplied it creates a local test key in android-build; retain it privately before rebuilding, because android-build is replaced. Alias sandlab; test password android.
2. Standard Android Gradle project in android (`gradle :app:assembleDebug`, Gradle 8.10.2 / AGP 8.7.3 after npm run build). This produces a differently signed debug APK unless configured with the dedicated key.

The release workflow verifies the exact locally built signed binary in release/, runs source tests, checks its assets against a fresh production build, and runs Android 15 emulator UI checks before creating the authorized GitHub Release. It never merges into main. The APK is retained in the isolated branch for precise release reproducibility; private signing material is excluded from Git.

## Model and limits

This is a playful cellular model, not a scientific prediction. See docs/SIMULATION.md for explicit rules. Render scheduling is independent of the fixed 30 Hz simulation. Slow is 0.25× and Fast is 2×; catch-up is bounded to avoid hangs. Under overload simulated time slows rather than skipping reactions. Grid presets: 120×180, 160×240, 240×360; hard import limit 131072 cells and 512 per side. JSON is capped at 8 MB; named saves at 12 worlds / 24 MB. Undo history is capped at eight full snapshots. Large worlds and fire-heavy scenes may run slower on phones.

No audio, haptics, extra materials, continuous generators, pinch zoom, cloud sync or recording in v1.0.0. Navigation is explicit Pan/zoom controls. Sources in presets are finite and can be repainted. No physical-phone QA is claimed.

## Release and rollback

Release: https://github.com/andrefiker/appfarm/releases/tag/sand-lab-v1.0.0

Source: isolated branch sand-lab/v1.0.0; release tag points to the verified source. APK: release/Sand-Lab-v1.0.0.apk. SHA-256: release/SHA256SUMS.txt. Signature is a dedicated self-signed test key (v2/v3), preserved privately for future upgrades. No Play Store publication.

Repository rollback before SAND LAB: 0db2815c14b727031d63e7c14ef0a75255690e90. Restoring that commit removes this new app only from the branch; other applications are unchanged. Installed worlds require the exported JSON for data recovery across uninstall/reinstall.
