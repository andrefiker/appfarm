# Clínica • Cockpit — Android 0.3.0

Manual local clinical cockpit, PT-BR UI, Android 11+.
Package `com.andrefiker.clinicalcockpit`; versionCode 3; same owner signing key.

## Acesso sem senha
New installs open directly. Existing password-based vaults ask for the old
password **once**, to decrypt/validate the existing records and register their
key with Android Keystore. Migration does not replace the vault or discard data.
Wrong passwords leave the vault unchanged. The app then reopens without a password.

Vault AES-256-GCM keys are wrapped with a non-exportable Android Keystore AES key;
no plaintext key or password is stored in files. This does not impose an app
biometric/PIN barrier: anyone able to use the unlocked phone can open the app.
Pausar clears the decrypted model/key, but Continuar requires no authentication.
Background/resume and process restart reopen using the device key.

Android backups/device transfer are disabled. FLAG_SECURE remains enabled.
Managed strings can persist until garbage collection; complete memory erasure
is not claimed. Rooted/compromised devices are outside the protection boundary.

## Popular pacientes e vincular Notebook
1. **Pacientes → Importar pacientes • CSV / JSON**.
2. **Copiar pedido para o Notebook** copies the export specification. Use your
   appropriate source documents in Notebook and check the generated list there.
3. Choose a CSV/JSON file already on your phone, or paste its text in the app.
4. **Verificar importação** / file import opens a review with every code. Tap
   each entry to inspect fields, then confirm importing the new records.

The app does not read your Notebook account or generate patient identities.
No real patients are bundled; no real clinical data was used in development.
Original documents and therapist-reviewed records are authoritative; model
answers are proposals. Notebook links open the external app/browser only when
selected. There is no automatic synchronization, OAuth or AI inference.

CSV header (comma or semicolon):
```csv
code,next,notebookUrl,formulation,sourceReference
```
JSON is an array of objects with those same fields. Only `code` is required;
all supplied fields must be strings. Missing fields stay empty. Codes follow
`CL-001`; dates use `AAAA-MM-DD`. Up to 500 patients / 512 KB per batch.
CSV quoted commas, multiline text, escaped quotes, UTF-8 BOM and CRLF supported.
Unknown columns/JSON fields, duplicates within the list, invalid dates and
unsafe links are rejected before any changes. Existing codes are skipped;
existing sessions and formulations are never overwritten by bulk import.
Imported records retain a source reference and a visible review reminder.

Notebook URLs allow HTTPS on `notebook.google.com` and `notebooklm.google.com`
with a UUID notebook path. Query/fragment are removed. No arbitrary URLs or scripts.
Edit an existing patient to add/change its link; **Abrir caderno Notebook** opens it.

## Backup / restauração
Device keys do not transfer to another phone. **Cofre → Salvar backup criptografado**
asks for a separate password (12+ characters) and creates a portable encrypted
`.ccvault` using PBKDF2-HMAC-SHA256, 310,000 iterations, fresh salt/IV and AES-GCM.
Keep that password with a protected external backup before uninstalling/moving.
No password reset service exists. Old 0.1/0.2 backups still use their old passwords.

Restoration validates the backup before replacement, registers its key locally,
and saves/verifies the previous encrypted vault for undo. Current/previous keys
are retained as Keystore-wrapped entries to survive interrupted restoration.
Undo normally needs no password on this phone; unmigrated old copies need their
former password. Cancellation invalidates late validation results before commit.
Filesystem failures cannot be fully recovered by software alone.

Previous copies can retain deleted records. **Cofre → Descartar cópia anterior**
removes the prior vault and prunes retained wrapped keys when possible. It does
not delete exported files/backups. The snapshot does not protect against device loss.
Vault limit: 8 MB per copy. Plain PDF/DOCX exports remain unencrypted.

## Existing clinical functions / limits
Opaque codes, cumulative formulation, next date, history, manual four-layer
functional dossier, evidence/uncertainty, next-session roadmap, human review,
encrypted drafts, TXT/Markdown import, native PDF/DOCX and local study library.
No permissions, Internet, backend, analytics, ads or remote fonts.

Manual alpha: AI, audio transcription, semantic search, scored Hexaflex,
Google Calendar/Gmail/Drive and automatic Notebook integration remain pending.
Codes do not establish anonymization of narratives or links. Do not put clinical
material into Git/development tools. No independent clinical/security/legal audit.
Physical phone/Android 11 runtime testing pending; use fictitious acceptance data.

## Build / update
Java 17, Gradle 8.10.2, AGP 8.7.3, Android SDK/build tools 35.
```sh
bash scripts/test-core.sh
gradle :app:assembleDebug :app:assembleRelease :app:assembleDebugAndroidTest :app:lintRelease
bash scripts/android-qa.sh # disposable synthetic emulator only
```
Release signing is performed outside Git with the persistent private owner key.
Never sign/distribute instrumentation with that key. Download the signed 0.3 APK
and install over the old app; do not uninstall to update. The old password is
needed once if a pre-0.3 vault exists. APK/source/checksum/CI/rollback: APP_STATE.md.
