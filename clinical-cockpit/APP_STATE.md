# APP STATE — Clinical Cockpit

## Identity and release
- Display: Clínica • Cockpit
- Directory: clinical-cockpit/
- Package: com.andrefiker.clinicalcockpit
- Version: 0.1.0 / code 1 / Android 11+
- Branch: clinical-cockpit-android-v0-1; draft PR #18; main unchanged.
- Release source + exact signed binary: 2f492aa8c832b20926fa7cfa027ba23298178f99
- Runtime build source: ce3370c95b2ffcb9cd6482280527d22e16bf3377
- APK: dl/Clinical-Cockpit-v0.1.0.apk; 78,527 bytes.
- APK SHA-256: f94fe14ed8bf7644742cc50778c823594ef1b49c312c873d10bf9594d588e05c
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
- Core: 20 checks passed locally and in CI (crypto, tamper/password rejection,
  strict dates/codes, Unicode/XML and DOCX container correctness).
- Debug/release assembly, instrumentation assembly and release lint: passed.
- Main CI: https://github.com/andrefiker/appfarm/actions/runs/37665547610
- 24 synthetic Android checks: patient/session workflow, human review reset,
  encrypted draft recovery, backup validation, TXT import, local library,
  physical exports, background lock and safe areas. API35 emulator; offline.
- Synthetic native screenshots reviewed: patient, dossier, roadmap and lock.
  Screenshots are rendered by test instrumentation; production FLAG_SECURE
  remains enabled. Test APK is not signed with or distributed as the owner key.
- PDF: 5-page synthetic export opened and Unicode text extracted.
- DOCX: both generated and Android-exported files opened with python-docx.
- Final signed payload equals all entries of the successful unsigned CI APK.
- ZIP integrity, launchable activity, package/version, no permissions,
  zip alignment and APK v2/v3 signatures: passed.
- Exact production APK CI:
  https://github.com/andrefiker/appfarm/actions/runs/37666473207
- Seven external UI checks on the final owner-signed APK passed: install/offline
  launch, vault creation, patient creation, session save, encrypted persistence
  across lock, locked restart and 320dp fallback unlock-button fit.
- Repeat build/integration at release source also passed:
  https://github.com/andrefiker/appfarm/actions/runs/37666473090
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
moving phones. If the private vault itself is corrupt and cannot open, recovery
currently requires a fresh empty installation/cofre and restoring a saved backup
with the same password; there is no locked-screen restore UI yet. Never uninstall
an app containing unbacked records. Plain PDF/DOCX exports are not encrypted.

## Known limits / next exact work
- Manual entry only. AI, audio, semantic search, Google OAuth/integrations and
  NotebookLM sync pending; these are not simulated.
- Text import only (512 KB/file); compact vault cap 8 MB.
- One global draft at a time. No password rotation, automatic backup, biometric
  unlock or locked-screen recovery. Dates have no appointment time component.
- Codes do not establish anonymization of clinical narrative. Device/keyboard/
  document-provider trust remains necessary; third-party tools might sync exports.
- Start device acceptance with fictitious records. Next engineering objective:
  locked-screen encrypted-backup recovery and retention/scale review, then assess
  a genuinely local inference route before adding any clinical AI processing.

## Rollback
Pre-app baseline: 0db2815c14b727031d63e7c14ef0a75255690e90 (app absent).
First known signed baseline for future code changes: 2f492aa8c832b20926fa7cfa027ba23298178f99.
No prior app to update. Unique package leaves existing apps untouched. Android
version downgrades are not a data-recovery procedure; keep encrypted backups.
