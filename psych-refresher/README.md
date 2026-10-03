# Psych Refresher

Offline Android companion for a continuing psychology and psychiatry seminar.

## Build and test

From this directory, run `node --test tests/*.test.js`. Build the Android debug APK with Gradle 8.10.2 and Java 17 using `gradle :app:assembleDebug`; GitHub Actions also runs Android lint and verifies the APK signature and package metadata.

The WebView loads only bundled assets. Seminar data is stored in the app's local browser storage. The app requests no Internet permission, account, analytics, ads, or cloud service. Paper URLs open in the device browser when present.

Install `dist/Psych-Refresher-v1.0.0.apk` on Android 8.0 or later. It is a debug signed APK for testing and is not signed with a persistent release key.
