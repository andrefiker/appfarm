# AWAY for Android

AWAY is an offline, local-first screen-off break tracker. It treats Android screen-off time as a proxy for disengagement; it cannot establish that a person physically left the phone.

## Build

From this directory, use Gradle 8.11.1, Java 17, Android SDK platform 36/build tools 36.0.0:

```sh
gradle :app:testDebugUnitTest :app:assembleDebug
```

The APK is `app/build/outputs/apk/debug/app-debug.apk`. GitHub Actions runs these tests and verifies the APK package/version, signature, Usage Access declaration, and absence of Internet permission.

## Setup and privacy

The app asks the user to grant Android Usage Access through system settings. Android may label it "Usage access" or "Usage data access." This is used to read screen-interactive, screen-non-interactive, and keyguard-hidden event timestamps. The permission is required for historical break calculations and the widget. All processing is on device; AWAY has no network permission, account, analytics, backend, ads, or synchronization.

Add AWAY from the launcher's widget picker. Tapping the widget opens the app. Android's widget scheduler updates at most every 30 minutes; user-present and reboot broadcasts request prompt refreshes where the launcher/OS permits. Android and OEM background policies can delay widget rendering. AWAY never opens an overlay on unlock and runs no persistent foreground service.

Optional unlock notifications are off by default, use Android's notification permission when enabled, and only appear when the just-completed break reaches the chosen minimum. Screen-on events interrupt a candidate interval; reboot resets its start boundary. If usage history is unavailable or permission is revoked, the app shows setup guidance instead of estimating a duration.

## Languages

English and Brazilian Portuguese follow the system language. Minimum Android version is API 28; target is Android 16 (API 36).
