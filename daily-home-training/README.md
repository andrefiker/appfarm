# Daily Home Training

A tiny offline Android checklist for the nine requested home exercises. No account, network permission, analytics, ads, or third-party services.

Current release: **1.4.1** (`versionCode` 6). The focused workout screen shows each previous result and its +1 goal. Tap the goal to log it, or use the steppers or numeric keyboard. Drafts persist as entered; FINISH completes a session and reveals the next goal. Tap **Edit list** in the date bar to add, edit, remove, or restore exercises directly on the workout screen. Native window insets keep the date bar below the Android status icons. The Android launcher retains its adaptive mint-and-ivory mark.

## Build

From this directory with Android SDK 35 and Gradle 8.10.2 available:

```sh
gradle --no-daemon :app:assembleDebug
```

Installable debug APK: `app/build/outputs/apk/debug/app-debug.apk`.

## Test

```sh
node --test tests/*.test.cjs
```

The app stores its small JSON ledger in Android `SharedPreferences`. The WebView contains only bundled local assets. The package ID is `com.andrefiker.dailyhometraining`.

## Behavior

- Every exercise establishes its own baseline on its first completed actual result. Blank entries leave that exercise unrecorded; explicit zero makes the next goal one.
- Each exercise's next goal is its most recent completed actual result plus one, independent of calendar gaps, goal misses, or excesses. There are no caps.
- FINISH locks the completed day. Edit results deliberately unlocks it; later completed target snapshots do not change when old results are edited.
- Future dates cannot be entered. Drafts and completed history persist locally across restarts.
- Per-leg and per-side amounts are entered for one side. Changing an exercise unit starts a new progression lineage, while removal keeps its history for restore.
- Upgrading v1.3 storage preserves actuals, drafts, and saved snapshots once, then uses per-exercise baseline state.
