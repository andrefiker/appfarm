# Daily Home Training

A tiny offline Android checklist for the nine requested home exercises. No account, network permission, analytics, ads, or third-party services.

Current release: **1.2.0** (`versionCode` 3). The compact screen uses inline steppers, direct numeric entry, one-tap goal fill, haptic feedback, a baseline pass, and previous-result +1 progression.

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

- First launch, and the one-time v1 migration, ask for a baseline workout without numerical targets.
- After baseline, each exercise's next target is its last saved actual result plus one, independent of calendar gaps.
- Blank exercises leave the previous result unchanged; an explicit zero is a valid result and makes the next target one.
- Targets have no progression caps. Per-leg and per-side amounts are entered for one side.
- Local historical results and saved target snapshots remain on the device; editing a past result does not rewrite later saved snapshots.
