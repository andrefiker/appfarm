# Daily Home Training

A tiny offline Android checklist for the nine requested home exercises. No account, network permission, analytics, ads, or third-party services.

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

- First launch starts on the device's local calendar date with the specified initial targets.
- Each exercise progresses independently on the day after a saved day where its completed amount meets its target.
- Blank days and missed targets keep the next target unchanged; caps limit targets only.
- Per-leg and per-side amounts are entered as the amount for one side.
- Daily values and target snapshots remain on the device and can be edited later.
