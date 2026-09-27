# Android wrapper

This is a thin offline WebView wrapper for the existing Quiet Video Poker game. It does not rewrite or duplicate poker rules. The CI bundle script in `../scripts/bundle-android.mjs` embeds the tested production web assets as one local HTML file before Gradle builds the app.

- Application ID: `com.appfarm.quietvideopoker`
- Version: `1.0.0` (version code 1)
- Orientation: sensor landscape
- Permissions: `VIBRATE` only
- No Internet permission, backend, account, or development-server dependency
- Local credits, settings, and statistics persist in WebView local storage

Build from the repository root after `npm run build`:

```sh
node scripts/bundle-android.mjs
cd android
gradle --no-daemon :app:assembleDebug
```

The debug APK is at `android/app/build/outputs/apk/debug/app-debug.apk`. A JDK 17 and Android SDK 35 with build tools 35 are required.
