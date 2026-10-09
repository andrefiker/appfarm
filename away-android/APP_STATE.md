# AWAY APP STATE

## Identity
- Directory: `away-android/`
- Package ID: `com.andrefiker.away`
- Version: 1.0.0 (versionCode 1)
- Branch: `away-android-1.0.0`

## Architecture
- Native Kotlin app with standard RemoteViews home-screen widget
- Local UsageStatsManager event reads; SharedPreferences stores boot boundary and notification settings
- No network permission, backend, account, analytics, ads, or foreground service
- English and Brazilian Portuguese

## Verification
- Source/test and Actions build status: pending first CI run
- Device/widget verification: pending; no device attached to this workspace
- Expected APK: GitHub Actions artifact `AWAY-android`

## Limitations
- Requires the user to enable Android Usage Access in system settings.
- Widget refreshes rely on unlock/boot broadcasts and Android's minimum 30-minute periodic update; OS/OEM policies may delay them.
- Screen-off duration is a proxy. Screen activation, notification wakeups, or other interactive events invalidate an interval.
- AWAY does not open itself over the launcher on unlock.

## Rollback
- Source rollback: `0db2815c14b727031d63e7c14ef0a75255690e90` (pre-AWAY main)
