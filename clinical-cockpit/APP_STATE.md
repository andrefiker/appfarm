# APP STATE — Clinical Cockpit

## Current release
- Display: Clínica • Cockpit; directory clinical-cockpit/.
- Package com.andrefiker.clinicalcockpit; Android 11+; 0.3.0 / versionCode 3.
- Branch clinical-cockpit-android-v0-3; draft PR #20 based on v0-2; main unchanged.
- Runtime build source: 924e47bc8b68dd3c6d24a800775e0cf4623941c0.
- Verified source/test head: e373cfffb01b03b0190c3e2dff9a40d37f352369.
- Signed APK/source checkpoint: b3598c33649402207fbb0ea9315a1fa3d646b72e.
- APK dl/Clinical-Cockpit-v0.3.0.apk; 103,103 bytes.
- SHA-256 4254ec4bb341fa265cb40ea726d6d924fe024ef3a6d7d063d2c3687fd07c21b7.
- Status: signed, build/lint/native integration and exact production APK verified.

## What changed
- No daily app password. Fresh installs open directly; old vaults need their
  original password once to validate/migrate without changing the old vault.
- Android Keystore AES-GCM wraps the local vault keys; no raw key/password file.
  Wrapped entries are bound to each vault salt; active/previous/incoming keys
  coexist through restoration so an interrupted file replacement keeps access.
- Process restart/background resume use the device key. Pausar wipes the open
  model/key but Continuar is unauthenticated; access relies on the phone lock.
- Portable .ccvault backups now ask for an independent 12+ character password,
  reencrypting a snapshot with fresh salt/IV and the existing PBKDF2/AES-GCM format.
  Device keys are not transferable; old backups retain their original passwords.
- Local CSV/JSON patient roster import by file or paste; strict fields/dates/codes,
  safe Notebook URL validation, preview and explicit confirmation. Up to 500
  rows / 512 KB. Reimport skips existing codes without replacing sessions.
- Optional sourceReference, imported-review reminder and per-patient Notebook
  link. Built-in export request can be copied; Notebook opens only on user action.

## Verification — 2026-10-07
- 20 crypto/rules/DOCX checks + 20 roster checks: passed locally and in CI.
- Debug/release/instrumentation assembly and release lint: passed.
- 64 synthetic offline Android checks: passed, including existing session/draft/
  export/library flows, corruption/password/schema rejection, restore/undo,
  Keystore key roundtrip/tamper rejection, password-free reopen, independent
  portable backup encryption, roster JSON type validation/CSV UI confirmation,
  cancellation, duplicate suppression, session preservation and persistence.
- Build/native CI: https://github.com/andrefiker/appfarm/actions/runs/37689950910
- Synthetic native pause/review/patient screenshots reviewed; controls fit.
  Production FLAG_SECURE is unchanged. Instrumentation uses a separate debug key.
- Android-exported PDF opened (five pages/Unicode); DOCX opened with python-docx.
- Signed ZIP integrity, all unsigned payload entries, 4-byte local alignment and
  persistent certificate/v2/v3 signatures: verified. No permissions/Internet.
- 16 exact owner-signed production UI checks: passed on API35 offline. Signed
  0.2→0.3 update retains patient/session; incorrect old password rejected; old
  password entered once; process restart/pause/continue require no password;
  physical SAF portable export independently decrypted; real CSV picker imports
  two reviewed patients without overwriting existing sessions; reimport skips
  duplicates; Notebook CTA visible; old portable backup restore, password-free
  undo, prior-copy disposal and 320dp Continue bounds pass.
- Exact signed CI: https://github.com/andrefiker/appfarm/actions/runs/37689950693
- First production run stopped at an unindexed ADB-created CSV in DocumentsUI.
  The test fixture now requests media indexing and captures picker navigation;
  all 16 checks passed on the next run. Runtime/APK unchanged by the QA repair.
- Physical handset and Android 11 runtime acceptance: not performed.
- No real clinical material was fetched, exported to tools, committed or tested.

## Scope and source-of-truth decision
Native Java, encrypted local JSON, no backend/network/auth service/analytics.
Existing manual formulation, history, four-layer dossier, roadmap, human review,
drafts, TXT import, physical PDF/DOCX and local study library remain available.
Manual alpha: clinical AI/audio/semantic search/Google sync are pending.

Patient population is user-controlled local import; no real patient roster is
bundled. Notebook generated output is a proposal, not clinical fact. Original
source documents and reviewed therapist records are authoritative. This session
has no authorized Notebook connector; no automatic scraping or API sync was added.
Official APIs located describe the Enterprise/Cloud edition and licenses; the
simpler supported route here is a checked CSV/JSON and an external Notebook link.
References checked: developer.android.com/privacy-and-security/keystore;
docs.cloud.google.com/gemini/enterprise/notebooklm-enterprise/docs/api-notebooks;
support.google.com/gemininotebook/answer/16179559.

## Signing / recovery / limits
- Persistent owner certificate SHA-256:
  60c09e631510afb847ccf08eb57c6ce3976082760140a9fb9b4f9c0014819fcf.
  Dedicated signing key retained privately outside Git. Reuse for future updates.
  Never owner-sign/distribute instrumentation, which could access clinical storage.
- Do not uninstall to update. A legacy password is needed once for existing vaults;
  wrong passwords or key-registration failures preserve the prior vault.
- Phone unlock is the access barrier. This is not biometric/app authentication;
  no guarantee of hardware-backed keys or complete managed-memory erasure.
- Loss/uninstall of phone/app/Keystore needs an external portable backup and its
  password. No reset service; never rely only on a same-device recovery snapshot.
- Restore validates before replacement, writes/verifies the previous encrypted
  snapshot and registers incoming key first. Candidate write/readback precedes
  model/key swap; rollback is attempted on I/O failure, not guaranteed under
  device/filesystem failure. Corrupt key indexes fail closed; inaccessible local
  storage can prevent restoration and requires separate recovery investigation.
- Undo normally uses cached device keys; unmigrated old copies need old passwords.
  Damaged copies cannot be decrypted. Cancellation blocks late validation commit.
- Prior snapshots can retain deleted records until explicitly discarded. Exported
  backups and plain documents remain separate. Limit 8 MB per copy plus small
  wrapped-key index; one global draft; no automatic backup/password rotation.
- Pseudonyms/links do not anonymize clinical narrative. PDF/DOCX are unencrypted;
  third-party keyboards/document providers can sync independently of this app.

## Rollback / next work
- Prior verified signed release: 0.2.0, source cd97614880d88699205a5508289aa1d6f1cc703d;
  checkpoint/docs 80cfbd8df010b0ceda38df4aa3df7559d54117a5; APK retained in dl/.
- Android downgrade is not a recovery procedure. Preserve portable backups.
- Next: physical-phone acceptance with fictitious data; import an appropriate
  locally reviewed roster; retention/scale and genuine local inference feasibility.
