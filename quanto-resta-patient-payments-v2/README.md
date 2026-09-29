# Loot — Receitas e Despesas

Native Kotlin/Jetpack Compose Android app. Two compact tabs: patient income and manual expenses. Both work offline using the same Room database. No login, categories, imported expenses, merchant rules, cloud sync or internet permission. Aliases in tests are fictional; the production expense list starts empty.

The 1.4 UI pass moves `+ Paciente` / `+ Despesa` into the header so no floating button covers a ledger row. The paid status is now a small text control with a 48 dp tap area, while full payments retain a quiet `Editar pago` action. Empty Expenses uses a compact message instead of a full-height blank card. The compact, divided ledger, monetary formatting, Room tables and business rules are unchanged. Tap the name, monthly value, paid value, or status directly; the overflow menu still contains archive and delete. Currency editing retains cents.

## Build and test

JDK 17, Gradle 8.9, Android SDK API 35. In this directory run `gradle --no-daemon :app:testDebugUnitTest :app:lintDebug :app:assembleDebug`. APK: `app/build/outputs/apk/debug/app-debug.apk`. Connected device tests and screen capture: `gradle --no-daemon :app:connectedDebugAndroidTest` (API 33 emulator configured in GitHub workflow). Debug builds may have different signing certificates across runners.

## Data and months

The Room database `qr-payments-v2.db` is now version 2. Explicit `MIGRATION_1_2` only adds empty `expenses` and `expense_months` tables and their unique `(expenseId, monthKey)` index and foreign key. It never reads, imports, or creates old expense categories or values; existing patient tables and on-device records remain in place. No destructive fallback migration is configured.

`Expense` contains ID, name, monthly default in integer cents, activity/archive month and creation/update times. `ExpenseMonth` contains the frozen expected cents, paid cents, inclusion and explicit incomplete flag. Opening a new month adds missing snapshots with zero paid. Changing a fee or archiving first snapshots unvisited earlier months, then changes the selected and future months only. Archive preserves older values. Delete requires one confirmation, or two if prior months or payments exist; a foreign key cascades permanent deletion. Patients retain their existing data model and logic.

Both compact lists keep patient/expense name, expected fee, paid amount when partial, full toggle, access to paid editing on full rows, and a row menu for archive/delete. The add action is at the top right; the last ledger row remains unobstructed. Expense overpayments remain stored and the summary displays the amount over expected.

## Privacy, updates, rollback

Everything is manual and stored only on the device. Android backup remains disabled; uninstall removes local records. The older Supabase migration file remains in this branch for history, but the current APK does not use Supabase or access the network. The budget app’s previous expense data is not read.

An APK signed with a different debug certificate cannot update an already installed Loot APK. Do not uninstall the installed copy if it has unique patient data; export or migrate the local database first. A same-key update from version 4 to 5 retains the Room version 2 database without a schema change. To roll back the 1.4 UI pass, return the Git branch to `e340ea195178a54b06fbb56fa8b457db977845ee` and rebuild with the original signing key. Android will not downgrade an installed version code directly; preserve a backup before replacing an installed app.
