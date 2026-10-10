# Screen Time Widget — state

Project: Screen Time Widget
Package: com.ghost.screentimewidget
Version: 1.0.0 (versionCode 1)
Stack: native Kotlin, Compose, RemoteViews, Preferences DataStore, WorkManager
Android: min 28, target/compile 35

Source branch: `andrefiker/appfarm`, `feat/screen-time-widget-v1-20261009`; source commit is recorded in Git history. Main remains untouched.

New standalone app requested on 2026-10-09 (America/Sao_Paulo), explicitly scaffolded at `./screen-time-widget`. Existing AppFarm main/state/workflows and branch names inspected read-only. No existing matching screen-time source was found in the inspected checkout; no unrelated app was changed or merged.

Behavior: UsageEvents-reduced screen/app intervals, live launcher Chronometer, optional default-on silent specialUse foreground service, editable exclusions, boot/unlock/update/time/date recovery, midnight alarm and awake-service callback. No network permission or analytics.

Stop conditions: Gradle wrapper builds signed debug APK; pure Kotlin interval tests and lint pass; signature/package/permissions/alignment checked; final APK and source/key available. Physical-device tests require user-granted permissions; no adb device was initially connected.

Pending verification is recorded in TEST_CHECKLIST.md. Final executed results and artifact hashes are in VERIFICATION.md. Debug signing key stays in the private source bundle; it must be reused for updates.
