# Screen Time Widget 1.1.0

A native, offline Android instrument for making room between phone checks. The primary number is the **last completed daytime locked/screen-off interval**. It is a measurement of device state, not attention, intention, exercise or productivity. No login, network, ads, analytics, reward claiming or attention-seeking reminders.

## Install / update

Install `Screen-Time-Widget-v1.1.0.apk` over v1.0.0. Package `com.ghost.screentimewidget`, versionCode 2, minSdk 28, target/compile 35. The persistent v1.0.0 debug key is reused; certificate matching is recorded in `VERIFICATION.md`. Actual installation/update must still be checked on your phone. Do not uninstall to update: uninstalling deletes settings and history.

Open the app once and grant **Usage access**. If Android reports “Restricted setting”, open Settings → Apps → Screen Time Widget → ⋮ → Allow restricted settings, then return to usage access. Menu names vary. Permission is checked on resume; denied/unavailable data displays a message rather than made-up zero totals.

Add the widget using the app button or long-press the launcher → Widgets. Resize it: small widgets show the last daytime break, longest today and meaningful-break count; medium widgets add screen time and recorded unlocks; taller widgets add quiet feedback/challenge/comparison, and very tall widgets retain the most-used app list. Theme follows the system or can be fixed to light/dark in Settings.

## Reliable monitoring vs battery cost

**Instant mode keeps the v1.0.0 default (ON), with explicit user preferences preserved.** It can be disabled for periodic mode. WorkManager requests a refresh about every 15 minutes; Android/OEM power management may defer it. Native UsageEvents reconstruct breaks at the next refresh even if the app process died. While the app process happens to be alive, dynamic receivers also observe screen and unlock events.

**Instant return updates** is optional and defaults ON to preserve the original immediate-update functionality. It uses the existing specialUse foreground service with a low-importance silent persistent notification and dynamic SCREEN_ON/OFF/USER_PRESENT receivers. This is the compelling reason for retaining this service: Android offers no reliable manifest screen/unlock broadcast that wakes a killed ordinary process to update the widget immediately on natural return. The service does no per-second query/polling. A launcher Chronometer animates the secondary screen-on clock locally while the listener is active; the main away number never animates or creates a reason to check.

Humorous feedback appears only after a qualifying natural-return broadcast, at most three times a day, separated by at least 90 minutes. Queries/app visits/refresh taps may reconcile achievements and challenges, but never select or rotate humor. Periodic mode cannot promise immediate return feedback. There are no reward notifications, confetti, claims, currencies, competitive scores or streak penalties.

For instant mode, optionally allow notifications and remove battery restrictions. On Xiaomi/HyperOS: App info → Battery → No restrictions; Settings → Apps → Permissions → Background autostart. Some OEMs still kill background services. The UI shows listener status and a timestamp. Calls, navigation and other apps are never blocked.

## Measurement and persistence

- UsageStatsManager `queryEvents`, never daily aggregate UsageStats, feeds an idempotent local SQLite event journal. First read backfills up to eight days if Android retains them. Subsequent reads query incrementally with a five-minute overlap. Thirty-five days of raw events, challenges and achievement history are retained; settings stay in the original device-protected Preferences DataStore. The journal is credential-protected and unavailable before the first unlock after reboot.
- SCREEN_NON_INTERACTIVE or KEYGUARD_SHOWN starts an interval. KEYGUARD_HIDDEN / USER_PRESENT confirms a return. Merely waking the screen does not complete a break. An unprotected foreground return can close an **estimated** interval; estimated intervals do not earn milestones, challenges or humor, and never become invented unlocks. A keyguard event arriving within two seconds can confirm a foreground estimate. Repeated/out-of-order events and delayed broadcast/native duplicates are reconciled.
- Unlocks mean recorded keyguard-hidden/USER_PRESENT events. They can undercount where Android omits events. If support is not observed, counts display unavailable. App foreground starts are separately labeled; they are not unlocks or proof of distraction.
- Sleep defaults to 23:00–07:00, configurable to the minute. Every overlapping sleep segment is subtracted, including midnight/DST boundaries. Equal sleep endpoints disable exclusion. A break is attributed to the day of its return, including daytime portions before midnight. Its sleep portion is separately labeled. Unfinished intervals and ambiguous intervals over 36 hours earn no rewards.
- Device startup/shutdown boundaries discard open away intervals. A boot-count check supplies a boundary on devices with missing startup events. Same-boot wall-clock vs elapsed-realtime divergence over two minutes discards uncertain intervals and fences the affected timestamps against reimport. Time-zone changes, observed permission gaps and collection gaps over two days restart baseline eligibility conservatively. Small/manual time shifts can still affect accuracy; no clock-jump measurement is claimed as precise.
- Full observed days begin after the first successful v1.1 read. Recovered/partial/no-event history is identified and excluded from adaptive baselines. At least three full days and six eligible daytime breaks are needed for the typical-break median. Starting milestones are 10/20/30/60/90 minutes; personalized steps shape upward from the baseline. Thresholds and one optional challenge are fixed for the day. Awards are automatically inserted once per day/milestone; challenge completion persists, with no penalty on expiry. Sleep changes affect current calculations, while already recognized achievements remain recorded.
- Same-time comparisons cut historical days at the same local time as today. They need at least three full comparison days. With three matching weekdays, the weekday baseline is used; otherwise recent full days are labeled accurately. Partial-day vs whole-day comparisons are never used.

## Build and tests

Java 17, Android SDK 35/build-tools 35.0.0, Gradle wrapper 8.10.2, AGP 8.8.2, Kotlin 2.0.21. Preserve `signing/debug.keystore` (private bundle; excluded from Git). Alias/password are the standard private debug-build values `androiddebugkey` / `android`. APK is debug-signed and debuggable, matching the original delivery.

```sh
./gradlew --no-daemon :app:testDebugUnitTest :app:lintDebug :app:assembleDebug
```

Robolectric is test-only. Its Android-hosted tests exercise actual SQLite persistence, reward/challenge idempotence and actual RemoteViews rendering in addition to the pure Kotlin interval/behavior tests. Generated widget images go to `app/build/qa/`. Standard HTTPS_PROXY is honored for test SDK downloads; Gradle proxy properties may also need configuration in restricted environments. It adds no permission or code to the installed app.

See `VERIFICATION.md` for executed results, and `TEST_CHECKLIST.md` for physical-device checks. Test-rendered views are not evidence of OEM launcher behavior.

## Known limitations

Android retains UsageEvents for only a few days and can omit events. Local collection extends retention from observed data but cannot recover history never reported. Screen-on totals include lockscreen time; split-screen package totals can exceed screen time. Initial backfill can be incomplete. A missing event can make a duration uncertain; the UI must not be interpreted as a medical/effectiveness claim.

Force stop disables automatic recovery until the app is reopened. Reboot recovery waits for user unlock for the journal; service restarts can be restricted by the OS. Inexact midnight alarms/workers may be deferred. Date/time broadcasts, service midnight callbacks and the next read recover rollover. Boot requires a granted usage permission; no actual data or reward is synthesized before unlock.

Two themes and large touch targets are implemented. Very small widgets omit secondary detail; taller ones expose it. Android Chronometer uses a prefixed `0:` below one hour, with one listener callback at the hour boundary. Periodic mode uses a frozen secondary snapshot to avoid a falsely running clock. OEM rendering, actual phone update, screen transitions, battery behavior and reboot reliability require physical testing.

## Platform references

- https://developer.android.com/reference/android/app/usage/UsageEvents.Event
- https://developer.android.com/reference/android/app/usage/UsageStatsManager
- https://developer.android.com/develop/background-work/services/fgs/service-types
- https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start
- https://developer.android.com/privacy-and-security/direct-boot
- https://developer.android.com/reference/android/widget/Chronometer
