# ONE MORE 1.1.0 — release verification

Android package: com.andrefiker.onemore. Version 1.1.0, code 2.
Source: bce66dee5a7df14889950fb93af4c92711b96afe on one-more-training-v1-1. PR #17 remains draft, unmerged.
Final successful CI: https://github.com/andrefiker/appfarm/actions/runs/37657527400

## Behavior

One rep/controlled hold per exercise; one movement at a time; date-based balanced
rotation; offline movement diagrams and primary/assisting muscle maps. Done and
Skip advance one exercise; resumed Undo is retained and validated. Default 8
movements, optional 6/10/12. Pause returns to Continue. Completion opens at the
top and lists every muscle and the exact completed/skipped exercises. Skipped
movements contribute no muscle counts. No set counting or numeric rep entry.
This is a minimal daily movement habit, not an optimal hypertrophy prescription.

## Verification

- 16 core tests passed, including schema-1 migration and undo sanitation.
- Browser QA passed: phone layouts (320×568, 393×760) and 720×480; no horizontal
  overflow; visuals; one-rep flow; skip; reload/undo; pause/continue; summary;
  history; exercise switches; settings; schema-1 migration; scroll reset.
- Android debug/release compilation and debug/release lint passed.
- API 35 QA passed: actual v1.0 rollback-source package update preserving native
  preferences, names, disabled state, history and unfinished draft; fresh install;
  offline workout; Done/Skip; Undo after process death; completion/history;
  coexistence with Daily Home Training. WebView safe bounds 0,63,1080,1857.
- Runtime automation used debug variants signed with the same CI debug identity.
  The delivered release is non-debuggable and signed locally with the retained
  production identity. No physical-phone or production-signed emulator install
  is claimed.
- Final APK manifest independently parsed: correct package/version/label/launcher,
  min SDK 26, target SDK 35, zero permissions, no Internet permission.
- Android apksigner verified v2/v3 signatures and the exact certificate match to
  the retained original ONE-MORE-v1.0.0.apk. Hence it is an update-compatible APK.
- ZIP integrity and four-byte alignment of uncompressed payloads verified by
  offsets. No native libraries. All unsigned build payloads unchanged by signing;
  all packaged assets match the committed source byte-for-byte.
- Android wrapper and Daily Home Training source are unchanged from rollback.

## Release identity

Filename: ONE-MORE-v1.1.0.apk
APK SHA-256: ed97f15e4592df8f642b801108852b8ac7bffc11a516797fb584b2acf26d06dc
Certificate SHA-256: 8bfdfdc2fa9f078021065b3bce7fa16bf73347ece15664bb7464352894c92c2d

Signing key remains private outside GitHub. Install over v1.0; do not uninstall
if keeping its local data. Remaining verification: physical Poco/HyperOS install,
touch feel, haptics, and native document-picker backup/restore.
