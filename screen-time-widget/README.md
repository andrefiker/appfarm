# Screen Time Widget 1.0.0

Native Kotlin Android app, `com.ghost.screentimewidget`, minSdk 28, target/compileSdk 35. Compose main screen; RemoteViews home-screen widget. Light theme only. All usage stays on this device; no INTERNET permission, account, analytics, or backend.

## Install and setup

1. Install `app/build/outputs/apk/debug/app-debug.apk` (allow installs from your file manager if asked).
2. Open **Screen Time Widget → Grant usage access**. Select **Screen Time Widget** in Android's usage-access list and allow it. Return to the app; access is checked on every resume and read.
3. Allow notifications on Android 13+ using the app's button. The instant service can run when notifications are denied, but Android may show it only in its active-apps panel.
4. Use **Allow unrestricted battery**. The Android exemption confirmation is manual.
5. Add the widget with the app's button or long-press the home screen → Widgets. Minimum 4×2; resize taller to see all five rows at once. At small sizes the list scrolls. Refresh icon updates; the rest opens the app.
6. On Xiaomi/HyperOS, enable Background autostart and set Battery to No restrictions. The in-app guidance opens app settings or an external browser for OEM-specific guidance. The app itself has no network permission.

Settings persist in device-protected Preferences DataStore: instant updates (default ON), editable excluded packages (launcher/System UI excluded initially), top 1–5 apps, and 12/24-hour refresh timestamps. Usage **durations** never use wall-clock AM/PM formatting or wrap at 12/24 hours.

## Build and test

Install Java 17 and Android SDK platform 35/build-tools 35.0.0. Set `ANDROID_HOME`, or create your own `local.properties` with `sdk.dir=...`.

```sh
# The private source bundle includes this persistent debug key. If absent in a
# fresh repository checkout, generate a NEW development key (cannot update an
# installation signed by a different key):
./scripts/ensure-debug-key.sh
./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
```

Gradle wrapper 8.10.2, AGP 8.8.2, Kotlin/Compose plugin 2.0.21. The requested signed **debug** APK is debuggable, not a Play Store release. Keep `signing/debug.keystore` private and reuse it for in-place updates; increase versionCode. Uninstalling removes settings. System UsageEvents are owned by Android, not this app. Never replace the package name or key for an update.

## How measurement works

`UsageStatsManager.queryEvents()` is the only historical source of usage. Queries run on `Dispatchers.IO`, serialized, with a five-second memory cache. We query a 48-hour lookback before local midnight to recover intervals already open at 00:00, then clamp all contributions to today's local midnight through the snapshot time. A query beginning exactly at midnight cannot recover an interval that started before it.

The pure Kotlin reducer stable-sorts and removes exact duplicates. Screen intervals use SCREEN_INTERACTIVE/NON_INTERACTIVE, and shutdown/startup close all intervals. App foreground intervals use IDs 1/2 (ACTIVITY_RESUMED/PAUSED on newer Android; the same numeric IDs as legacy MOVE_TO_FOREGROUND/BACKGROUND). Foreground time is the union of resumed activities per package, with unmatched pauses ignored rather than invented. ACTIVITY_STOPPED is accepted as an additional close event; screen-off/reboot closes missing pauses. Concurrent packages may each accumulate foreground time in multi-window. Package visibility is limited to launcher/home apps; unresolvable packages retain their package label and fallback icon.

The widget uses the launcher-hosted Chronometer with `elapsedRealtime - total` as its base. It does **not** run per-second widget updates. Live time continues during a slow query using the monotonic capture time. Screen-off explicitly stops the Chronometer and sets frozen text. Broadcast hints bridge delayed screen-event delivery while the process lives; matching historical events replace those hints. Hints and cached totals are never persisted as a second usage database.

## Instant mode versus periodic mode

**Instant ON (default):** a minimal START_STICKY specialUse foreground service registers dynamic SCREEN_ON/OFF/USER_PRESENT receivers. It does no per-second work and uses a low-importance silent notification. This is the reliable Android mechanism for keeping those dynamic receivers alive. A service-local midnight callback also resets a live clock when the screen remains on overnight.

**Instant OFF:** no foreground service. Widget-provider updates, tap refresh, 15-minute WorkManager, boot/package/date/time/timezone broadcasts, and a lightweight receiver while the process remains alive re-derive history. WorkManager timing is approximate, and manifest receivers cannot reliably receive SCREEN_ON/OFF. Consequently, a stopped process may leave the clock ticking through screen-off until the next refresh corrects it. This cannot meet instant screen-state behavior on its own; hence the default service toggle.

At boot, the direct-boot receiver reads device-protected settings, schedules the inexact midnight alarm, and displays an unlock-needed widget. **WorkManager and UsageStats are deferred until USER_UNLOCKED/BOOT_COMPLETED**, because WorkManager does not support direct boot and Android may return no usage history while credential storage is locked. After unlock the receiver schedules periodic work, restarts the enabled service, and refreshes. No usage counters need restoring. Package replacement performs the same recovery.

An inexact RTC_WAKEUP alarm and DATE_CHANGED fallback handle midnight. TIME_SET/TIMEZONE_CHANGED invalidate the cache and old live hints and reschedule local midnight. Exact-alarm permission is deliberately unnecessary. Android can delay inexact alarms in idle; the next screen-on refresh corrects the day boundary. The service's live callback covers an awake phone crossing midnight.

## OEM battery caveats and known limitations

- OEM battery managers may kill even foreground services or block boot/autostart. Android cannot guarantee immediate callbacks on every firmware. Grant the device's background/autostart settings manually and verify the checklist.
- **Force stop is different from process death.** `adb shell am force-stop` deliberately stops the service, receivers, jobs, and alarms until the user relaunches the app. The launcher may keep an old Chronometer running meanwhile. Automatic recovery from force-stop is impossible; relaunch re-derives totals. Ordinary process death uses START_STICKY recovery and the periodic fallback, with a possible brief stale display.
- UsageEvents retention and completeness vary by OEM. Missing interactive events or an interval older than the 48-hour lookback cannot be reconstructed precisely. Permission cannot recover history the OS omitted. Query failures show a message instead of crashing.
- Android Chronometer normally uses MM:SS below an hour. We prefix `0:` below an hour, and the instant service makes a **single boundary refresh** at one accumulated hour to remove the prefix. This gives H:MM:SS without per-second widget updates. In periodic mode, crossing an hour can briefly show an extra `0:` until the next refresh; instant screen-state accuracy also requires the service.
- Rankings are snapshot data: updated on events/refresh or approximately every 15 minutes; only the screen clock ticks live. The five-second cache can make app rows lag briefly.
- Changing the device clock cannot rewrite existing event timestamps. Such events are filtered/clamped consistently, but historical totals around manual jumps or time-zone changes may differ from Android's settings screen. The reducer uses local calendar midnight, including DST-short/long days.
- Foreground is an Android activity state, not attention or touch time; screen-on includes lockscreen. Some video/background services are not foreground activities. Split-screen per-app sums can exceed the screen total.
- Exclusion changes never affect the screen-on clock; they only affect rankings. The widget uses a scrollable collection at its minimum size.

## Device test checklist

See `TEST_CHECKLIST.md`. No device was connected during the build; device-level behavior must be checked after granting permissions.

## Platform references

- https://developer.android.com/reference/android/app/usage/UsageEvents.Event
- https://developer.android.com/reference/android/app/usage/UsageStatsManager
- https://developer.android.com/reference/android/widget/Chronometer
- https://developer.android.com/develop/background-work/services/fgs/service-types
- https://developer.android.com/privacy-and-security/direct-boot
- https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started/define-work
