# Quanto Resta — Patient Payments V2

Native Kotlin/Compose Android app. One patient-payment screen, Room offline working store, Supabase Auth/PostgREST sync. No clinical notes, contact data, analytics or service-role credentials. Patient aliases and amounts are sent to the `qr_` tables only after login. Local credentials use Android Keystore AES-GCM; Android backup is disabled.

## Build

JDK 17, Gradle 8.9, Android SDK API 35. Run `gradle :app:testDebugUnitTest :app:lintDebug :app:assembleDebug`. Debug APK: `app/build/outputs/apk/debug/app-debug.apk`. Instrumented Room test: `gradle :app:connectedDebugAndroidTest` with a connected emulator/device.

## Data and month rules

- `Patient`: owner ID, alias, current default monthly fee, activity/archive month, local dirty/revision flag, scrubbed deletion tombstone.
- `PatientMonth`: UUID and unique patient/month pair, expected snapshot, paid amount, included status, explicit incomplete flag, dirty/revision. All money is integer cents.
- Before changing a fee or archiving, the repository materializes unvisited older months using the prior fee. Changing a fee updates the selected and future month snapshots only. Back/forward navigation creates missing monthly rows with paid zero. Historical rows stay frozen.
- Archive excludes selected and future months from totals; past months remain intact. Delete requires confirmation, twice for a patient with prior months. Deletion scrubs the local alias, removes local monthly rows and sends a scrubbed tombstone to Supabase; the database trigger removes remote months and prevents stale devices from resurrecting the record.
- OFF on a full toggle retains the paid amount using `force_incomplete`. A later manual edit restores automatic paid >= expected behavior. This flag resolves the contradictory requirements “OFF keeps the amount” and “the toggle follows paid >= expected.”
- Sync pushes dirty patients, then months; pulls full remote state in pages; remote writes are last-arrival-wins and local dirty rows are never overwritten by a pull. WorkManager retries with network. Account credentials are required once; the cached Room list and edits work offline afterward.

## Privacy / existing app

This is a separate package and database. The expense app and its storage were not modified; the existing Android source was unavailable in this workspace. No automatic migration from the earlier budget project is claimed. The Supabase tables share an existing website project due to a free-project account limit; RLS restricts rows by authenticated owner, though project administrators and any existing service-role process have technical access. Enter aliases instead of full names.

## Rollback

Delete the isolated Git branch/folder and uninstall `com.andrefiker.lootpayments` to remove local data. To roll back the backend, first export needed payment data, then drop only the `qr_patient_months`/`qr_patients` tables and `qr_` triggers/functions from the migration. Never drop unrelated website tables. A debug APK cannot update an installation signed with a different key.
