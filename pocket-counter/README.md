# Pocket Counter

A small offline-first Android app with one three-column home-screen widget for Rivotril, Cigarro, and Baseado counts. The values after `/` are references only; counts have no cap and do not reset automatically.

## Build

- Open this folder in Android Studio, or run `gradle --no-daemon testDebugUnitTest :app:assembleDebug` with Gradle 8.10.2.
- Java 17, Android SDK platform 35, and Build Tools 35.0.0 are used by the verified build workflow.
- Debug APK output: `app/build/outputs/apk/debug/app-debug.apk`.

## Install and add the widget

1. Install the debug APK and allow Android's standard “install unknown apps” prompt if asked.
2. Long-press an empty area of the home screen, open **Widgets**, find **Pocket Counter**, and drag the 4×2 widget onto the home screen.
3. Tap a `+1` control to update just that counter. Open Pocket Counter to see the same values or use **Reset all to zero** and confirm.

## Privacy and storage

All three counts are stored in local Android SharedPreferences. The app declares no Internet permission and has no account, analytics, ads, notifications, or network code. Android's widget manager refreshes the displayed RemoteViews from the saved values when the widget is updated.

## Tests

JUnit and Robolectric tests cover independent increments, counts above the reference values, persisted SharedPreferences after creating a new store instance, broadcast-action handling, and reset.
