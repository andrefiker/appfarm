# AWAY APP STATE

## Identity
- Directory: `away-android/`
- Package ID: `com.andrefiker.away`
- Version: 1.0.1 (versionCode 2)
- Branch: `away-android-1.0.0`

## Current verified source
- Latest app source/release commit: `1d0aada92c1d96359e5d81c849c7c68432a87ae3` (AWAY 1.0.1 with Usage Access declaration).
- Branch head with verification docs: recorded separately in `APPFARM_STATE.md` on this branch.
- Rollback target: `0db2815c14b727031d63e7c14ef0a75255690e90` (pre-AWAY main).

## Architecture
- Native Kotlin app with standard RemoteViews home-screen widget
- Local UsageStatsManager event reads; SharedPreferences stores boot boundary and notification settings
- No network permission, backend, account, analytics, ads, or foreground service
- English and Brazilian Portuguese

## Verification
- Android 16 CI run `37990069012`: build passed; 7 unit tests passed.
- APK metadata: package `com.andrefiker.away`, version 1.0.1/code 2, min API 28, target API 36.
- APK signature: one signer, APK Signature Scheme v2 verified.
- APK permissions: requests `PACKAGE_USAGE_STATS` so AWAY is listed in Android's Usage Access settings; no Internet permission. Notification permission is only needed if notifications are enabled.
- Compiled manifest checks passed for the launch activity, widget provider, and `APPWIDGET_UPDATE` registration.
- APK SHA-256 from run `37990069012`: `83a57aea8a26af49b6d9a68c435c6b408ac048ec41bb2d0b1e844a9b92296e2e`.
- Build artifact: `AWAY-android` in run `37990069012` (artifact ID `11645061534`).
- Device/widget-cycle verification: not performed; no device or emulator was available in this workspace.

## Limitations
- Requires the user to enable Android Usage Access in system settings.
- Widget refreshes rely on unlock/boot broadcasts and Android's minimum 30-minute periodic update; OS/OEM policies may delay them.
- Screen-off duration is a proxy. Screen activation, notification wakeups, or other interactive events invalidate an interval.
- AWAY does not open itself over the launcher on unlock.
- CI's debug signing key is not preserved for future builds; a future update APK must use a persistent key or be installed after removing the previous app.
- The previous v1.0.0 APK did not request `PACKAGE_USAGE_STATS`; it could not appear in the permission list. Install the corrected artifact before granting Usage Access.

## Rollback
- Source rollback: `0db2815c14b727031d63e7c14ef0a75255690e90` (pre-AWAY main)
