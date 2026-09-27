# Android wrapper

Quiet Mines Android package is a small offline WebView shell around the same production build used by the PWA. The complete web app is copied into the APK at build time, so gameplay needs no network and no Android Internet permission.

Build from the `quiet-mines/` source directory with JDK 17+, Android SDK 35, Gradle 8.9+, and Node 20+:

```sh
npm ci
npm test
npm run build
rm -rf android-wrapper/app/src/main/assets/www
mkdir -p android-wrapper/app/src/main/assets/www
cp -R dist/. android-wrapper/app/src/main/assets/www/
cd android-wrapper
gradle assembleDebug
```

Install the locally signed debug APK with `adb install -r app/build/outputs/apk/debug/app-debug.apk`. GitHub Actions builds and publishes this APK as the `quiet-mines-android` workflow artifact on the project branch.
