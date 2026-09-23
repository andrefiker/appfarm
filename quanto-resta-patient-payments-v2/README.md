# Loot — patient payments

Native Android app using Kotlin, Compose, Material 3, Room, ViewModel and StateFlow. Opens directly to the monthly patient list. No sign-in, network permission, SDK telemetry, cloud synchronization, or provider key in the APK. The Android package and Room database name remain unchanged so an update signed with the same key can read existing on-device records.

## Build

JDK 17, Gradle 8.9, Android SDK API 35. In this folder run `gradle :app:testDebugUnitTest :app:lintDebug :app:assembleDebug`. Debug APK: `app/build/outputs/apk/debug/app-debug.apk`. With a connected emulator run `gradle :app:connectedDebugAndroidTest` for Room persistence and an actual screen capture.

## Storage and months

`Patient` holds an alias, current default monthly fee, active/archive month and creation date. `PatientMonth` has a unique patient/month pair and stores expected and paid cents. Monetary amounts use integers. Opening a month creates missing rows with zero paid. Before changing a fee or archiving, earlier unvisited months are snapshotted with the previous terms. Edits to default fees affect the selected and future months; earlier months retain their amounts. Archive excludes selected and future months while retaining prior history. Permanent delete requires confirmation and scrubs the local alias and payment rows. Full OFF retains the payment using an explicit incomplete flag; manually editing a payment returns to automatic full status.

The database retains an owner ID from the earlier cloud version solely to keep existing local records readable. New installations generate a device-local ID. Existing local data is selected by the first non-deleted patient when the new app starts. There is no account switcher.

## Privacy and upgrade

Data is stored only on this device. The earlier Supabase tables remain untouched but this version does not upload or download records, so records held **only** in Supabase will not appear automatically. Android backup is disabled. Uninstalling the app clears its local data. An APK signed with a different debug key cannot update an existing installation: do not uninstall an installation that holds unique data without exporting or migrating it first. Prefer aliases over full names. Existing expense code was not available here and was not modified.

## Rollback

Revert this branch to commit `c5a828ddf97d76c29d082f25afcd5c10fed7c509` to restore the earlier auth/sync code. The Supabase schema was not changed for this update. Returning to an older APK requires a compatible signing key and Android version code; uninstalling removes local data.
