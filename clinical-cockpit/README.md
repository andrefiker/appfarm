# Clínica • Cockpit — Android 0.1.0

First local Android implementation of the mobile clinical cockpit handoff.
Portuguese UI; Android 11+; `com.andrefiker.clinicalcockpit`.

## Implemented
- Password-encrypted private JSON vault, AES-256-GCM and PBKDF2-HMAC-SHA256
  (310,000 iterations, random 16-byte salt and 12-byte IV; authenticated header).
- Opaque patient codes (e.g. CL-001), cumulative formulation, next appointment
  date, searchable list, archive/reactivate and explicit deletion.
- Session history, TXT/Markdown import (512 KB cap), four manually completed
  dossier layers, evidence/uncertainty field and five-part next-session roadmap.
- Encrypted autosaved patient/session draft; editing resets human-review status.
- Physical native PDF and DOCX exports through Android Storage Access Framework.
  Raw transcript is excluded from dossier/roadmap exports.
- Encrypted backup and validated restore with the same vault password.
- Local text study library, literal search and formulation question guide.
- No permissions, Internet, backend, analytics, advertising or remote fonts.

## Scope / clinical use boundary
This is a **manual alpha**, not the complete AI/fullstack specification. No AI
model, audio transcription, semantic search, instrument scoring, automatically
computed Hexaflex radar, Google OAuth, Gmail/Calendar/Drive or NotebookLM sync.
These capabilities are pending, not simulated. Import is text only, not PDF/DOCX.
No real patient data was used in development or QA.

Codes are pseudonyms, not proof of anonymization. Narrative may identify people.
Never put real clinical data into this repository or development environment.
No legal-compliance certification or clinical-validation claim is made.

## Data and privacy
Choose a strong, unique password of at least 12 characters. The app has no
password reset or recovery service. Password-derived key is held in memory while
open and zeroed on lock; decrypted JSON/UI strings may remain in managed memory
until garbage collection. No claim of complete memory erasure.

The private vault is the only persistent clinical store. Android backups and
device-transfer extraction are disabled. Window FLAG_SECURE blocks ordinary
screenshots/recent-app previews. Lock on background; file-picker flows preserve
the session for at most two minutes, then require reopening. Rooted or otherwise
compromised devices and third-party keyboards remain outside this threat model.

Text input requests no suggestions and no autofill. IME behavior is OS/provider
controlled. Vault size capped at 8 MB; this is an early compact-store design.

PDF/DOCX are deliberately unencrypted and only written after explicit export
confirmation. Android's document provider might sync a chosen destination;
EXTRA_LOCAL_ONLY requests a local provider but does not audit its behavior.
Do not export identifiable records to cloud-synced destinations. Exported files
and previous backups are not removed by deleting a record inside the vault.

Back up from **Cofre → Salvar backup criptografado** before uninstalling or
moving devices. Restore replaces the whole vault and needs the same password.
Corrupt backups and unsupported versions are rejected before replacing records.

## Build and QA
Java 17, Gradle 8.10.2, Android SDK/build tools 35, AGP 8.7.3.
```
bash scripts/test-core.sh
gradle :app:assembleDebug :app:assembleRelease :app:assembleDebugAndroidTest :app:lintRelease
bash scripts/android-qa.sh  # connected disposable test emulator only
```
GitHub workflow: `.github/workflows/clinical-cockpit-apk.yml`.
Release unsigned output is re-signed outside the public repo with the dedicated
private owner key. Keep that key for future in-place updates. No signing key,
password, clinical data or personal registration number belongs in this repo.

## Architecture decision — 2026-10-07
Mobile requirement supersedes desktop-first Next/Postgres proposal. Native Java
Android makes storage, lock, import and physical document export direct, without
WebView bridges or a server. Backend/Postgres is unnecessary for this first local
version. AI must eventually run locally or use a separately validated input
release process; neither a name+initial nor an opaque code establishes anonymity.

See APP_STATE.md for exact verified release, QA limits and rollback.

## Verified release — 2026-10-07
`dl/Clinical-Cockpit-v0.1.0.apk`, 78,527 bytes, owner-signed v2/v3.
SHA-256 `f94fe14ed8bf7644742cc50778c823594ef1b49c312c873d10bf9594d588e05c`.
20 core checks, 24 Android integration checks and seven external UI checks on the
exact signed APK passed. Build/release lint and native visual QA passed. API35
emulator only; physical phone testing pending. See APP_STATE.md for CI links.

If the on-device vault itself is damaged and cannot unlock, this alpha has no
locked-screen restore control. Preserve your encrypted backup; recovery needs a
fresh empty app/cofre using the same password followed by backup restore. Never
uninstall an app containing records you have not backed up. This alpha has not
undergone an independent clinical/security audit; start with fictitious records.
