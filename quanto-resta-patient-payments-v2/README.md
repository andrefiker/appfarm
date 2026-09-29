# Loot Portátil — Receitas e Despesas

Version 1.6 is the portable build (`com.andrefiker.lootpayments.portable`). The
header data action lets the user grant access to a shared folder, export an
encrypted `loot-backup.ltb`, detect it later, and replace the local database by
importing it with the same password. The folder permission is remembered per
installation; passwords are never stored. The backup includes patients,
expenses, monthly snapshots, paid amounts, and archive state. It requires no
network or storage permission and uses Android's Storage Access Framework.

Version 1.7 adds a third `Resumo` tab with an editable month-specific spending
limit, amount paid, remaining/over-limit state, optional supportive messages,
and dismissible local savings tips. The default limit follows that month's
planned expenses until a manual limit is set. Tips compare the two most recent
prior recorded months for the same expense, or label a 10% reduction as a
scenario based on the largest planned expense. All summary preferences stay on
device. Keep the existing signing key when building to preserve update
compatibility with version 1.6.

Version 1.8 turns `Resumo` into a compact monthly decision screen: real spend,
remaining amount, daily allowance, forecast, real-versus-baseline comparison,
fixed/flexible/extraordinary totals, data-grounded tips, month closing/reopening,
simple recent history and an optional savings target. Expenses support category,
type, tags, note, selective rollover, persistent local categorization rules,
transparent recurring/unusual-spend detection and conserved two-category splits.
All calculations remain local and actual recorded spending is always authoritative.
The interactive pass adds a temporary `E se eu gastar…?` preview with quick and
custom amounts, optional category impact, explicit apply/close actions, subtle
number/progress motion, light haptics, a deterministic month pulse, elapsed-vs-spent
pace and one-step undo for recent amount/classification/add actions. Simulations
never write data until `Aplicar como gasto` is tapped.

Version 1.9 adds explicit, separate local models for dated actual transactions,
future planned expenses, user-authored if/then rules, cooling purchases and
strategy events. The compact `Planos` surface supports `Quero comprar`, explicit
buy/wait/save choices, reversible cooling decisions and descriptive strategy
counts. Plans affect forecast but never actual; waiting never auto-buys.

Fresh installs seed only the category names from the September handoff. Every
starting amount and baseline is R$0, and no category is predeclared fixed. The
user can enter actual values and deliberately promote recurring spending later.
The one-time name-based seed never overwrites existing records.

Native Kotlin/Jetpack Compose Android app. Four compact tabs: patient income,
manual expenses, monthly summary, and plans/rules. The ledger works offline using
the same Room database. No login, bank integration, cloud sync, OCR, backend or
internet permission.

The 1.4 UI pass moves `+ Paciente` / `+ Despesa` into the header so no floating button covers a ledger row. The paid status is now a small text control with a 48 dp tap area, while full payments retain a quiet `Editar pago` action. Empty Expenses uses a compact message instead of a full-height blank card. The compact, divided ledger, monetary formatting, Room tables and business rules are unchanged. Tap the name, monthly value, paid value, or status directly; the overflow menu still contains archive and delete. Currency editing retains cents.

## Build and test

JDK 17, Gradle 8.9, Android SDK API 35. Run `gradle --no-daemon
:app:testDebugUnitTest :app:lintDebug :app:assembleDebug`. APK:
`app/build/outputs/apk/debug/app-debug.apk`. CI performs bounded unit/lint/build
and static APK verification without requiring an emulator.

## Data and months

The Room database `qr-payments-v2.db` is version 4. `MIGRATION_1_2` adds the
expense ledger; additive `MIGRATION_2_3` preserves all existing rows and paid
amounts while adding baseline/type/detail fields plus closing, rule and split
tables. `MIGRATION_3_4` adds separate planning and behavioral tables without
changing existing actuals. No destructive fallback migration is configured.

`Expense` contains ID, name, monthly default in integer cents, activity/archive month and creation/update times. `ExpenseMonth` contains the frozen expected cents, paid cents, inclusion and explicit incomplete flag. Opening a new month adds missing snapshots with zero paid. Changing a fee or archiving first snapshots unvisited earlier months, then changes the selected and future months only. Archive preserves older values. Delete requires one confirmation, or two if prior months or payments exist; a foreign key cascades permanent deletion. Patients retain their existing data model and logic.

Both compact lists keep patient/expense name, expected fee, paid amount when partial, full toggle, access to paid editing on full rows, and a row menu for archive/delete. The add action is at the top right; the last ledger row remains unobstructed. Expense overpayments remain stored and the summary displays the amount over expected.

## Privacy, updates, rollback

Everything is manual and stored only on the device. Android backup remains
disabled; uninstall removes local records. Use the encrypted folder export before
uninstalling or changing signing identities. The current APK does not use
Supabase or access the network.

An APK signed with a different certificate cannot update an installed Loot APK.
Package ID, signing certificate and a higher version code must all match for an
in-place update. Do not uninstall a copy with unique data before exporting its
encrypted backup. A compatible update preserves the existing database and runs
the additive version 3 and 4 migrations as needed.
