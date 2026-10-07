# APP STATE — Clinical Cockpit

- Display: Clínica • Cockpit
- Directory: clinical-cockpit/
- Package: com.andrefiker.clinicalcockpit
- Version: 0.1.0 / code 1 / Android 11+
- Branch: clinical-cockpit-android-v0-1
- Baseline/rollback: 0db2815c14b727031d63e7c14ef0a75255690e90
- Status: implementation checkpoint; CI/build/Android QA pending.
- Manual local alpha; no AI or Google/NotebookLM integrations.
- No real clinical data used or ingested. No external production changes.
- Architecture: native Java Android, authenticated encrypted private JSON vault,
  SAF text import and native PDF/DOCX export; no backend or permissions.
- Dedicated signing key retained privately for future releases (pending creation).
- Required next action: pass core tests, compile/lint, emulator integration QA,
  sign production APK and verify certificate/alignment/package/permissions.
