# Quiet Solitaire

## v1.3.0 (2026-10-02)

Smart tap keeps ambiguous destinations visible and moves complete tableau sequences.
Foundation promotion uses both opposite-color suits for a conservative safety check.
Cards eligible for double-tap foundation wait 280 ms before the single-tap
action, preventing two actions from one gesture. Auto-finish now proves every
remaining card can reach foundation by foundation moves alone, runs in a few
seconds, and can be interrupted. The portrait board keeps page scrolling off,
preserves system insets, and gives Undo and New Game more space.

Android versionCode 14; package `com.andrefiker.quietsolitaire`. The previous
source checkpoint is `57526788ff6abf1a8cd771111a288aaa5d0a7a7f`.
The APK uses a temporary signing key unless a stable key is supplied; it may
require uninstalling an older temporary-key build.

Quiet Solitaire is a local-first Klondike game delivered as a browser/PWA build and a thin Android WebView application. The game rules and PWA were preserved; the Android wrapper packages the built files locally and does not point to a remote site.

## Run and test the PWA

```sh
npm test
npm run build
cd dist && python3 -m http.server 4173
```

Open `http://localhost:4173`. After the first successful visit, the service worker caches the PWA shell for offline browser use. The game makes no account, analytics, advertising, or backend requests.

## Build the Android APK

```sh
./build-android.sh
```

The script builds the current `dist/` PWA, copies every built asset into the APK, compiles the small Java WebView shell, aligns and signs an installable test APK, and verifies the package and asset hashes.

Set `ANDROID_HOME` to an Android SDK containing platform 35 and Build Tools 35.0.0. The AppFarm GitHub Actions workflow provisions that toolchain automatically; local builds may set `ECJ_JAR` to an Eclipse compiler jar if `javac` is unavailable.

The Android application ID is `com.andrefiker.quietsolitaire`; the displayed name is **Quiet Solitaire**. It bundles the PWA under the local WebView asset origin `https://appassets.androidplatform.net/assets/`, has no `INTERNET` permission, locks portrait orientation, enables local DOM storage and vibration, and blocks requests outside the packaged asset origin. Android Back closes an open dialog or exits the app. Pause triggers local state persistence; resume returns to the saved board. The installed PWA also requests portrait; an ordinary browser tab remains responsive to rotation. The default portrait table is left-handed: stock and waste sit together on the left, with foundations to their right. Settings can switch the table and bottom controls to right-handed layout. Tapping an Ace automatically places it in a randomly chosen empty foundation slot.

The signing key is generated temporarily for each test build and removed after signing. A later locally rebuilt APK therefore has a different signing identity; Android will reject it as an in-place update. Uninstalling the prior test APK clears its local save, so finish the current game before replacing it if you want to keep playing it. This is an installable test APK, not a Play Store release package.

## Architecture

- `src/engine.js`: deterministic seeded deals, pile rules, stock cycles, undo, hints, auto-finish eligibility.
- `src/interaction.js`: pointer-specific drag thresholds and conservative smart-tap destination priority.
- `src/layout.js`: pure layout calculation for tightening unusually tall tableau stacks.
- `src/app.js`: PWA rendering, touch/mouse interactions, legal destination highlights, persistence, stats, sound and haptics.
- `android/src/.../MainActivity.java`: small local-asset WebView shell, origin-scoped asset loading, pause/resume persistence, and Back behavior.
- `android/AndroidManifest.xml` and `android/res/`: app identity, orientation, vibration permission, theme, and launcher icon.
- `build-android.sh`: AAPT2, ECJ/javac, D8, zipalign, and apksigner pipeline.
- `tests/engine.test.js`, `tests/interaction.test.js`, and `tests/layout.test.js`: deterministic rules, smart-tap, drag-threshold, and adaptive-stack layout tests.

## Portrait table (2026-09-28 UTC)

- The compact title and counters establish identity without taking space from play. Seven wide tableau columns receive nearly all space between the pile row and a reduced bottom control bar.
- Left-handed is the default: stock and waste are grouped together on the left, with all four foundations toward the right. Settings can switch to the mirrored right-handed layout. Large rank/suit pairs and patterned red backs make the deck easy to scan.
- Settings, Game #, New Game, Hint, and Undo are always accessible in the bottom bar. A long tableau scrolls within the board area while the piles and controls stay visible.
- Tableau cards retain explicit pixel offsets from game state; this avoids the earlier Android WebView spacing fault.
- Existing local save keys, game rules, and interaction priorities are unchanged.
- The service worker precaches both interaction and layout modules and uses cache v11 so the update works offline after refresh.

## Minimalist visual pass (2026-09-28 UTC)

- Preserves the existing game layout, identity, palette family, card sizing, behavior, and local storage while removing felt texture, ornamental card-back patterning, bevels, stronger shadows, and the heavy control dock.
- Uses flatter greens, clean paper-white cards, simple court-card marks, restrained pile outlines, and low-key text/icon controls. No rules or settings were removed.

## Verified build state (2026-09-28 UTC)

- PWA tests: 28 passed, including Ace auto-placement, smart-tap safety, double-tap suppression, forgiving drop geometry, hint priority, stock recycling, and adaptive tableau layout.
- Android compile SDK: 35; minimum SDK: 26; target SDK: 34.
- App version: 1.2.0 (`versionCode=12`).
- APK ID/name: `com.andrefiker.quietsolitaire` / `Quiet Solitaire`.
- APK signature: v2 and v3 verified; APK ZIP integrity and 4-byte alignment verified.
- APK contents: all files under `dist/` match byte-for-byte; application manifest and package ID verified; no Internet permission; no unrelated assets.
- Android WebView asset loading now resolves APK asset paths relative to Android's `assets/` root; this corrects the launch error reported from the first phone install.
- Card input uses a larger touch-movement threshold to avoid treating hand jitter as a drag. Near-miss drops receive a 16 px extension, invalid drags settle back, and click/double-tap overlap is suppressed. Ambiguous selections visibly mark every legal destination; smart tap moves only when the destination is unambiguous.
- Hints prioritize revealing face-down cards and useful tableau moves ahead of foundation churn. Draw-rule changes apply to the next game so an in-progress board and its statistics remain internally consistent.
- APK and current PWA fingerprints are recorded in `APK-VERIFICATION.md`.
- No Android device or emulator is available in this environment; installation and physical touch/audio/haptics remain unverified. The rendered browser interaction pass was blocked because localhost-capable browser automation and a Chromium binary were unavailable; automated interaction and layout tests pass.

The separate known limitation remains: numbered deals are reproducible, but this build does not certify solvability or include a winnable-deal solver.
