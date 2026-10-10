# Screen Time Widget — state

- Project/directory: Screen Time Widget / `screen-time-widget`
- Package: `com.ghost.screentimewidget` (preserved)
- Version: **1.1.0**, versionCode **2**; minSdk 28, target/compile 35.
- Source: `andrefiker/appfarm`, branch `feat/screen-time-widget-v1.1-20261010`. Release/source commit is recorded in Git and VERIFICATION.md. Main is untouched.
- APK: `Screen-Time-Widget-v1.1.0.apk`; reuse the original persistent private debug signing key, never an ephemeral CI key.

## Implemented

Native Kotlin/Compose + resizable RemoteViews. Primary completed daytime locked/screen-off interval; secondary screen-on clock/app rankings preserved. Credential-protected SQLite event journal and automatic achievement/challenge ledger; existing Preferences DataStore keys retained, with sleep/theme settings added. Default 23:00–07:00 exclusion, confirmed vs estimated returns, recorded unlock counts, incremental local history, same-local-time comparisons, progressive baseline, adaptive milestones, quiet optional challenge, 66 varied messages. Humor only on fresh natural-return broadcasts, max 3/day and 90-minute separation; app visits do not rotate it. No punitive streaks, reward claims, backend, login, telemetry or network.

Optional existing event-driven instant service remains default ON for immediate natural-return feedback; explicit preferences preserved. Silent ongoing notification, no per-second query/polling, user can switch to periodic snapshots. Periodic Worker/midnight/date/boot/package recovery remains available. Force-stop still requires reopening.

## Verification and limits

See VERIFICATION.md for executed build/tests, exact APK hash/certificate and visual QA. Robolectric native graphics tests inspect production RemoteViews and launch/render the actual Compose activity, alongside SQLite persistence/idempotence and pure logic tests. These are host tests, not physical install or OEM-launcher tests.

No connected adb phone; physical install/update, Android 16/HyperOS foreground reliability, permissions, reboot, overnight, actual launcher resizing and battery behavior remain unverified. Usage events can be omitted; values are recorded device-state metrics, never proof of attention or intent. Recovered/partial/unavailable history is excluded from adaptation/comparisons. Clock/reboot/observed-permission/long-collection-gap boundaries are discarded conservatively. Known limitations and physical test procedure are in README.md and TEST_CHECKLIST.md.

## Rollback

Source: **d131aa31f74b5921cde1ab9cf66771bf34615904** (v1.0.0). Prior APK and same signing key remain preserved. Android usually blocks installing a lower versionCode; a source rollback should be rebuilt with a higher versionCode and the same key. Uninstalling destroys local history/settings.

## Stop condition

Final Gradle wrapper build/test/lint succeeds; package/version/signature/alignment and no-network permissions checked; source/state committed and pushed on isolated branch; actual APK and complete private source/key bundle delivered. Further device QA is bounded by the checklist, with no unverified runtime success claim.
