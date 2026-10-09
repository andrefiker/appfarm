# AWAY APP STATE

## Identity
- Directory: `away-android/`
- Package ID: `com.andrefiker.away`
- Version: 1.0.0 (versionCode 1)
- Branch: `away-android-1.0.0`

## Current verified source
- Latest app source commit: `5e2b9e2f7ad58d34c03ba65cb8333b309ee42700` (widget resize refresh).
- Branch head with verification docs: recorded separately in `APPFARM_STATE.md` on this branch.
- Rollback target: `0db2815c14b727031d63e7c14ef0a75255690e90` (pre-AWAY main).

## Architecture
- Native Kotlin app with standard RemoteViews home-screen widget
- Local UsageStatsManager event reads; SharedPreferences stores boot boundary and notification settings
- No network permission, backend, account, analytics, ads, or foreground service
- English and Brazilian Portuguese

## Verification
- Android 16 CI run `37988441387`: build passed; 7 unit tests passed.
- APK metadata: package `com.andrefiker.away`, version 1.0.0/code 1, min API 28, target API 36.
- APK signature: one signer, APK Signature Scheme v2 verified.
- APK permissions: no Internet permission; Usage Access is granted separately in Android Settings; notification permission is only needed if notifications are enabled.
- Compiled manifest checks passed for the launch activity, widget provider, and `APPWIDGET_UPDATE` registration.
- APK SHA-256 from run `37988441387`: `017c1c749c318a4a5451bc437a9c44c7bcbcb3bb3de074de62b924f4d962bd2b`.
- Build artifact: `AWAY-android` in run `37988441387` (artifact ID `11643659184`).
- Device/widget-cycle verification: not performed; no device or emulator was available in this workspace.

## Limitations
- Requires the user to enable Android Usage Access in system settings.
- Widget refreshes rely on unlock/boot broadcasts and Android's minimum 30-minute periodic update; OS/OEM policies may delay them.
- Screen-off duration is a proxy. Screen activation, notification wakeups, or other interactive events invalidate an interval.
- AWAY does not open itself over the launcher on unlock.
- CI's debug signing key is not preserved for future builds; a future update APK must use a persistent key or be installed after removing the previous app.

## Rollback
- Source rollback: `0db2815c14b727031d63e7c14ef0a75255690e90` (pre-AWAY main)
