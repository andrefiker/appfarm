# APP STATE — Clinical Cockpit

## Identity and release
- Display: Clínica • Cockpit
- Directory: clinical-cockpit/
- Package: com.andrefiker.clinicalcockpit
- Version: 0.2.0 / code 2 / Android 11+
- Branch: clinical-cockpit-android-v0-2; draft PR #19 (base v0-1); main unchanged.
- Release source + exact signed binary: cd97614880d88699205a5508289aa1d6f1cc703d
- Runtime build source: 540d645325c5c4ce2fdd057077d9b1ae84655b39;
  runtime implementation: 5fb659a0bc0e0443b84cd6e5a210ac54dbc25194
- APK: dl/Clinical-Cockpit-v0.2.0.apk; 82,623 bytes.
- APK SHA-256: 76e7cefe8b5c371d7a9ddc45b6d8a6947f382913b3c7f1c9437c7b10545d4978
- Status: signed, structurally verified and production-APK install-tested alpha.

## Architecture / scope
Native Java Android, authenticated encrypted private JSON vault, SAF text import
and native PDF/DOCX export; no backend or Android permissions. Opaque patient
codes, cumulative formulation, session history, manual dossier/roadmap editors,
human-review status, encrypted drafts/backups and local study-text library.

This is a **manual alpha**, not the complete fullstack/AI handoff. No real clinical
data was used in development, tests, source, artifacts or connected services.
No external production systems changed.

## Verified — 2026-10-07
- Core: 20 checks passed in CI (crypto, tamper/password rejection, strict
  dates/codes, Unicode/XML and DOCX container correctness).
- Exact production APK final CI: https://github.com/andrefiker/appfarm/actions/runs/37680329703
- Eleven external UI checks passed on the exact owner-signed APK: offline
  baseline install/vault/patient/session; in-place signed 0.1 → 0.2 upgrade
  preserving records/password; lock persistence; locked process restart; real
  Android DocumentsUI encrypted restore using another password; undo returning
  previous records/password; explicit snapshot disposal; 320dp unlock fit.
- Final signed SHA-256 from hosted CI equals the locally delivered APK.
- ZIP integrity and every entry of unsigned build payload match signed APK.
- Package/version, launchable activity, no permissions, zip alignment and
  persistent-key APK v2/v3 signatures: passed locally / hosted CI.
- Successful build/release lint and synthetic offline integration CI:
  https://github.com/andrefiker/appfarm/actions/runs/37680329721
  at c7fb37214107f6cbe9f547bd6b00fc671573b65a (test/controller adjustments only).
- 42 Android checks passed: existing patient/session/draft/export/import/study
  flows; password/schema/tamper rejection without writes; actual locked dialog;
  recovery of damaged vault without reinstall; independently passworded restore;
  snapshot/undo/redo; simulated snapshot I/O failure leaving target intact;
  failed candidate-key erasure; cancellation; background lock and safe areas.
- Delivered signed payload equals every entry of this successful CI build too.
- Synthetic native locked/recovered-dashboard screenshots reviewed: controls fit
  with no overlap; recovery snapshot buttons visible. Test-only rendering;
  production FLAG_SECURE remains enabled. Owner key never signs instrumentation.
- New Android-exported PDF: five pages opened, Unicode text extracted. Exported
  DOCX opened with python-docx. Final native physical document checks passed.
- Earlier successful evidence: integration CI 37679660419 and exact signed
  production CI 37679318814. Final repeats above also passed after test-only
  bounded-wait adjustments for emulator key-derivation latency; release runtime
  and the APK were unchanged. Earlier dependency/download failures were transient.
- Physical handset and Android 11 runtime testing: not performed.
- No clinical-validation or legal-compliance certification is claimed.

## Signing / recovery
Dedicated persistent owner key retained privately: Clinical-Cockpit-signing-key.p12.
Alias clinicalcockpit; PKCS12 store/key password android. Key is outside Git.
Certificate SHA-256:
60c09e631510afb847ccf08eb57c6ce3976082760140a9fb9b4f9c0014819fcf
Use this same key for every future update; increase versionCode. Do not publish
production-signed instrumentation apps, because they could access the target vault.

Vault password has no reset. Export encrypted backups before uninstalling or
moving phones. Restore is available from the locked screen without reinstalling.
It validates and uses the backup’s own password, including an independently
passworded backup. Encrypted snapshot write/readback must succeed before the
current vault is replaced; candidate write/readback precedes key/data changes.
If replacement fails, a rollback write is attempted; this cannot guarantee
recovery if the device/filesystem itself fails. Cancel/background lock invalidates
late asynchronous validation results before commit.

Desfazer última restauração validates the previous copy with its former password
and swaps the vaults. Damaged prior copies are retained but cannot be decrypted;
a valid external backup is still needed. Current vaults over the supported 8 MB
read limit or inaccessible storage prevent snapshot-based replacement.

The snapshot is on the same device and does not protect against device loss.
It can retain deleted records until Cofre → Descartar cópia anterior explicitly
removes it. Exported backups remain unaffected. Plain PDF/DOCX are unencrypted.

## Known limits / next exact work
- Manual entry only. AI, audio, semantic search, Google OAuth/integrations and
  NotebookLM sync pending; these are not simulated.
- Text import only (512 KB/file); compact vault cap 8 MB per copy. Optional
  previous-vault snapshot can consume another 8 MB.
- One global draft at a time. No password rotation, automatic backup or biometric
  unlock. Dates have no appointment time component.
- Codes do not establish anonymization of clinical narrative. Device/keyboard/
  document-provider trust remains necessary; third-party tools might sync exports.
- Start device acceptance with fictitious records. Next engineering objective:
  retention/scale review and physical-device acceptance, then assess
  a genuinely local inference route before adding any clinical AI processing.

## Rollback
Pre-app baseline: 0db2815c14b727031d63e7c14ef0a75255690e90 (app absent).
First known signed baseline for future code changes: 2f492aa8c832b20926fa7cfa027ba23298178f99.
0.2 keeps the 0.1 package/key and raises versionCode; exact signed upgrade was
tested. Previous signed APK remains at dl/Clinical-Cockpit-v0.1.0.apk. Android
version downgrades are not a data-recovery procedure; keep encrypted backups.
