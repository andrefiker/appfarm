# Loot — Receitas e Despesas

Native Kotlin/Jetpack Compose Android app. Two compact tabs: patient income and manual expenses. Both work offline using the same Room database. No login, categories, imported expenses, merchant rules, cloud sync or internet permission. Aliases in tests are fictional; the production expense list starts empty.

## Build and test

JDK 17, Gradle 8.9, Android SDK API 35. In this directory run `gradle --no-daemon :app:testDebugUnitTest :app:lintDebug :app:assembleDebug`. APK: `app/build/outputs/apk/debug/app-debug.apk`. Connected device tests and screen capture: `gradle --no-daemon :app:connectedDebugAndroidTest` (API 33 emulator configured in GitHub workflow). Debug builds may have different signing certificates across runners.

## Data and months

The Room database `qr-payments-v2.db` is now version 2. Explicit `MIGRATION_1_2` only adds empty `expenses` and `expense_months` tables and their unique `(expenseId, monthKey)` index and foreign key. It never reads, imports, or creates old expense categories or values; existing patient tables and on-device records remain in place. No destructive fallback migration is configured.

`Expense` contains ID, name, monthly default in integer cents, activity/archive month and creation/update times. `ExpenseMonth` contains the frozen expected cents, paid cents, inclusion and explicit incomplete flag. Opening a new month adds missing snapshots with zero paid. Changing a fee or archiving first snapshots unvisited earlier months, then changes the selected and future months only. Archive preserves older values. Delete requires one confirmation, or two if prior months or payments exist; a foreign key cascades permanent deletion. Patients retain their existing data model and logic.

Both compact lists keep patient/expense name, expected fee, paid amount when partial, full toggle, access to paid editing on full rows, and a row menu for archive/delete. A floating add button sits above scrollable list content with bottom padding. Expense overpayments remain stored and the summary displays the amount over expected.

## Privacy, updates, rollback

Everything is manual and stored only on the device. Android backup remains disabled; uninstall removes local records. The older Supabase migration file remains in this branch for history, but the current APK does not use Supabase or access the network. The budget app’s previous expense data is not read.

An APK signed with a different debug certificate cannot update an already installed Loot APK. Do not uninstall the installed copy if it has unique patient data; export or migrate the local database first. For a same-key update, version 2→3 keeps the patient data and creates only the empty expense tables. To roll back code, return the Git branch to `e8b7499c9dc9034e83539e4ff53f328d8926b507`. Android will not downgrade an installed database or version code directly; restore from a data backup before using an older app.
