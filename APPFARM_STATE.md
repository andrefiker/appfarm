# APPFARM_STATE

Last rehydrated: 2026-09-28 (America/Sao_Paulo)

This file is compact durable state, not a transcript. Git commits, source, tests, build artifacts, and provider state are more authoritative.

## Standard workflow

WORK → GITHUB → BUILD → TEST → REPAIR → MOBILE QA → ANDROID PACKAGE → VERIFY → DELIVER.

Canonical source: `andrefiker/appfarm`, default branch `main`.

Rules:
- Separate top-level directory per app/game when practical.
- Unique Android package ID, source, tests, wrapper source, version/release info, rollback commit.
- Local-first for single-player games and personal utilities.
- APK is the default finish line for games.
- Do not use AppDeploy unless Andre explicitly requests it.
- Use Railway only for genuine server needs.
- Use Supabase only for BaaS-shaped needs; no new recurring-cost project without checking necessity/isolation/cost and Andre's approval.
- Vercel is optional for useful public/static web surfaces, not required for Android games.
- Andre is left-handed; asymmetric controls should account for that.
- Preserve verified game source when Android packaging fails; repair packaging rather than redesigning the game.

## Android packaging: current evidence

Proven repo pattern:
- `settlement-zero-android/` is a minimal Java Android WebView shell loading bundled `file:///android_asset/settlement-zero.html`.
- No Internet permission in its manifest; external navigation is blocked.
- WebView state is saved/restored; browser zoom controls are disabled.
- `.github/workflows/build-settlement-zero-apk.yml` builds on GitHub `ubuntu-latest` with Java 17, Gradle 8.10.2, Android 35/build-tools 35.0.0.
- The workflow runs `:app:assembleDebug`, then checks the APK with `aapt dump badging` and `apksigner verify`, then uploads one APK artifact.
- Latest repo commit is `4dc5aaa0bfb60f118055370483c8b3471ecbf940` (2026-09-24), message: `fix(android): use hosted runner Android SDK`.
- Settlement Zero Android source was introduced at `7e5f7d81cbbc0eed8dae9931505c49d7f9ca2c57`.

Historical wrapper:
- `.github/workflows/build-current-apks.yml` builds Android WebView product flavors for Quiet Knight / Psicologia do Desempenho / AppFarm.
- Those flavors point at remote URLs and are therefore NOT the template for offline games.
- No Capacitor implementation was found on the current default branch as of this rehydration. Treat Capacitor as an allowed preference, not a proven AppFarm path.

## Repo reconciliation status

IMPORTANT: GitHub currently lags some late-September Project-chat work.

As of 2026-09-28:
- main now includes the Quiet Video Poker v1.2.0 release at `4d7e1fb5375db5f996e82d3c0fc7b61f256ed7ab` (2026-09-28);
- Quiet Video Poker commit `2026ab088ff01eb3c2bc0ab27413aa77a26fcf43` was recovered on branch `quiet-video-poker-apk-2026-09-27`; it is the v1.0 rollback target;
- default-branch code search still did not find Star Swarm, Quiet Mines, Quiet Solitaire, Silo Defense, or Loot source by project name;
- therefore do not claim those late-September builds are safely canonical until their source/commit is located and reconciled.

Projects referenced in Project history but currently requiring repo verification before modification include:
Quiet Pong, Quiet Mines, Quiet Solitaire, Star Swarm, TANKS!, Silo Defense, Loot, Pocket Biosphere, Desktop Disaster Kit, Iron Log, Microcosm, Deep Command, Structural Failure, Quiet Kingdom, and others.

## Current infrastructure inventory

Read-only inventory checked 2026-09-28.

AppDeploy:
- 0 apps. Prior cleanup is reflected here.

Railway:
- project `quiet-knight-live` STILL EXISTS.
- services: `quiet-knight-server`, `Postgres`, `redis`.
- An earlier cleanup task intended to delete this whole Railway project, but current provider state proves deletion has not completed.

Lovable:
- workspace `André's Lovable` still has 17 projects.
- An earlier cleanup task intended to delete all Lovable projects, but current provider state proves deletion has not completed.
- Do not treat the intended cleanup as completed until provider state is empty.

Supabase:
- `marcia-epstein-attribution` — ACTIVE_HEALTHY
- `andrefiker-site` — ACTIVE_HEALTHY
- `concordia-clinica-facil` — ACTIVE_HEALTHY
- `clinica-pipeline` — INACTIVE
- `quiet-knight-multiplayer` — INACTIVE
Do not reuse or delete clinical/unrelated projects casually.

Vercel:
- 12 current projects were visible during rehydration, including `marcia-epstein-production`, `marcia-epstein-review-staging`, `projeto-algoritmo`, `quiet-knight-mobile-qa`, and `palomai`.
- No Vercel changes were made during rehydration.

## Known current source anchors / rollback references

- Quiet Solitaire Windows v1.4.0: offline x64 NSIS installer
  `Quiet-Solitaire-Windows-Setup-v1.4.0.exe` built from
  `02ace1a7af636dcbe1cfca91638f770527f3332b` in Windows Actions run
  `37048258153`. Size 120,171,182 bytes; SHA-256
  `8893b40dce40076ba0aa194ffcbe946071eba0f5b33658f5bfbbec331b228312`.
  Four Node test files passed, browser gameplay smoke passed, and Windows
  packaged and silently installed app each launched and resumed saved stock.
  Packaged app also checked tableau offsets, left-handed default, page fit,
  and blocked remote fetch. NSIS installed per user on the hosted Windows
  runner. Authenticode status `NotSigned`; Windows may show an unknown publisher
  warning. No physical PC test. Source rollback before Windows packaging:
  `c478c853b875fffaf7e5da5c711b7045e0621f8c`.
- Quiet Solitaire v1.4.0: merged improvement loop at
  `ed264988019aab41f3630cfc5b172b926e1536fe`. Android package
  `com.andrefiker.quietsolitaire`, versionCode 15; APK
  `Quiet-Solitaire-v1.4.0.apk`, SHA-256
  `816b32cab8f1cf57fbffac621fb3966ba3c014b8d6b255eebb8427c8fd7e9a98`.
  Actions run `37035979734` passed 36 tests, phone-sized rendered gameplay,
  offline asset and APK verification. Six iterations attempted, five retained:
  hint stock priority, King empty-column tap, forgiving long-column drop,
  browser gameplay QA, and portrait tableau spacing. Emulator device did not
  connect; Android install/resume QA remains unverified. Test APK uses temporary
  signing. Rollback: `b67116fe70298cfe7da80734c1f54339faaa0f92`.

- Quiet Solitaire v1.3.0: source and Android workflow at `10c697349963bc6a2a598050508a2bfb2a099713`; APK `Quiet-Solitaire-v1.3.0.apk` built and structurally verified in Actions run `37031039995`. Package `com.andrefiker.quietsolitaire`, versionCode 14. Offline PWA and rules/interaction tests passed. Android device install/play QA unavailable. Temporary test signing means in-place upgrades from other temporary-key builds may fail. Rollback: `57526788ff6abf1a8cd771111a288aaa5d0a7a7f`.

- Settlement Zero / Android packaging baseline: `4dc5aaa0bfb60f118055370483c8b3471ecbf940`.
- Quiet Video Poker v1.3.0: current main source commit `20db9fc85e0b204c830b213b171e36d30377be09`, package `com.appfarm.quietvideopoker`, version code 4. Fresh bankroll: 1,000 credits; untouched v1.2 100,000-credit opening balances migrate to 1,000 while played balances/stats remain intact. Bets unchanged: 100, 200, 500, 1,000, 5,000. GitHub Actions run `36446596437` passed 22 tests, APK structure/signature, emulator install/play/resume/reopen/offline QA, and phone screenshots. APK: `Quiet-Video-Poker-v1.3.0.apk` in Library. Rollback: `4d7e1fb5375db5f996e82d3c0fc7b61f256ed7ab` (v1.2.0); v1.1: `7a2d3978156a61cf444a4b605432f5c774e8e839`; v1.0: `2026ab088ff01eb3c2bc0ab27413aa77a26fcf43`.
- Quiet Knight most recent default-branch game change found: `ebaf078f1148b764f1da013b7c2f7871ec76f9c6` (`fix(quiet-knight): smooth strong difficulty ladder`, 2026-09-24).
- Older Quiet Knight production release reports exist in Project/Library history, but provider deployment state must be rechecked before using them as current runtime truth.

## Important lessons to preserve

- A GitHub push and a provider deployment are separate facts; verify the deployed commit/runtime.
- Missing local Android SDK is not a stop condition; GitHub Actions is an established fallback.
- Prefer one diagnosed repair over blind CI retry loops.
- Build success is not gameplay verification.
- Emulator/device QA can fail independently from APK compilation; report verification level precisely.
- For local web games, bundled WebView assets avoid localhost/dev-server dependency and unnecessary backend infrastructure.
- Keep mobile UI dense and readable; do not solve polish by inflating everything.
- Andre prefers Quiet Solitaire's portrait table design over Quiet Video Poker v1.0: brighter green felt, legible classic cards, clear hierarchy, compact controls, and a left-handed primary action. Apply the principle where it fits, rather than copying Solitaire's exact layout into every app.
- Use actual playtesting for controls, responsiveness, safe areas, resume behavior, sound/haptics, fairness, and fast restart.

## Current app releases

- QUIET ATC v1.1.1: current touch-control release at `8551b19aa527eed280d24d6f237ee54728bd9a81`; package `com.andrefiker.quietatc`, versionCode 3/versionName 1.1.1. Real-device feedback on v1.1.0 reported poor finger response. v1.1.1 enlarges aircraft grab targets to ~54–72 px, makes the HUD touch-through except buttons, slows simulation while drawing, trims stale route-start points, increases steering/waypoint responsiveness, and enlarges runway/helipad snapping. Actions run `37618273520` passed deterministic engine tests, JS syntax checks, offline scan, Android build, package/version check, v2 signature verification, no-Internet-permission check, and bundled-asset verification. APK `Quiet-ATC-v1.1.1.apk`, SHA-256 `53795050b4804408aeff3b0ecbabc2361b0571f3f53ab181d2726c9f3212b74a`. Rollback: `fc2e6b98932616507e5653550a4ceb17228bb6b0` (v1.1.0).
- QUIET ATC v1.1.0: current release on `main` at `fc2e6b98932616507e5653550a4ceb17228bb6b0`; package `com.andrefiker.quietatc`, versionCode 2/versionName 1.1.0. Redesign replaces radar-console controls with bright top-down airfield gameplay: finger-drawn aircraft routes, runway approach snapping from either end, helipad routing, visible paths, traffic warnings/collisions, progressive levels, pause and 1x/2x speed. Actions run `37565879578` passed 32 deterministic engine assertions, JS syntax checks, offline scan, Android build, package/version check, v2 signature verification, no-Internet-permission check, and bundled-asset verification. APK `Quiet-ATC-v1.1.0.apk`, SHA-256 `33cbc215ac16f86a3be631f010220dd1a9d217009ffd316c36e76a346afb9946`. Physical-device play QA remains pending. Rollback to v1.0.0: `9818effadd6bc6eb78d514bd59432fe8f2c2d2e6`.
- QUIET ATC v1.0.0: source on `main`; release-state commit `9c407ada3210503fcffc397951d00318ea930257`, game merge `6c624410a55333a625242f7f775f1123550ed8a1`; package `com.andrefiker.quietatc`, versionCode 1. Actions run `37564785401` passed 28 deterministic engine assertions, offline bundle scan, Android build, aapt package/version check, v2 signature verification, no-Internet-permission check, and bundled-asset verification. APK `Quiet-ATC-v1.0.0.apk`, SHA-256 `df775ca38f6a63ec0f08477d80f2f531c96cc77a3f0ea82c29b617e27da7a9ec`. Physical-device install/play/resume QA not performed. Rollback before app merge: `ca2def9b969f54f3265519b0a0af0a33344fd34f`.
- Daily Home Training v1.4.1: source commit `d85fee87968e38d04dce1d7c1de818eeaab73777` on `main`; package `com.andrefiker.dailyhometraining`, version code 6. User screenshot showed date header under Android status icons and exercise management inaccessible. Native WindowInsets now pad the WebView clear of status/navigation bars. `Edit list` is directly in the date bar; inline rows provide Edit/Remove, with Add and Restore below the list. GitHub Actions run `36753731964` passed 18 tests, Android build, package/version, v2 signature, and no Internet permission. Final APK was re-signed with a persistent dedicated key (SHA-256 `73f7eb2bb272534cf7fca1157e8d36afd8f584304f15cd7db3e40845369bbe01`), stored privately in Library as `libfile_925ed92a0c888191809f8b391c357cb7`; alias `dailyhome`, PKCS12 password `android`. Re-sign future CI APKs with this same key; do not commit it publicly. Earlier v1.4/v1.3 builds used different ephemeral debug keys, so in-place update from those APKs is impossible; their `allowBackup=false` means uninstalling loses local training data. The source migration is tested but cannot bypass Android's signature check. Mobile visual QA awaits device confirmation. Rollback source: `73baf33db2a3528d90397bf3d796feff648204a1` (v1.4.0).
- Daily Home Training v1.4.0: source commit `73baf33db2a3528d90397bf3d796feff648204a1` on `main`; package `com.andrefiker.dailyhometraining`, version code 5. Per-exercise baselines, actual +1 goals, persistent drafts, one-tap goal logging, FINISH, locked historical results, blocked future dates, compact dark UI, and add/edit/remove/restore in `⋮ → Manage exercises`. GitHub Actions run `36751138500` passed 18 tests, APK assembly, package/version and v2 signature checks, and no Internet permission. APK and source archived as v1.4.0 deliverables. Emulator/physical-device visual QA was unavailable; scripted UI flow and static layout checks passed. APK is signed with a new ephemeral CI debug key (SHA-256 `9ceb0aa88de6695acfb59322778dd311815288c7db0855bf52c8e60a7e249a41`), unlike v1.3 (`76cc6c2f15306a92ad2b6031df6300bb9ca0883293de51bdfa790a944eb2b913`); Android cannot install it over v1.3, and the old APK has `allowBackup=false`. Migration is tested in code but existing installed app data cannot be preserved through a normal update without the old signing key. Rollback: `246d27a8982f088b7e3e70358f37f31686798e75` (v1.3.0).

## Unresolved blockers / next reconciliation work

1. Locate or recover canonical source for late-September apps that were reported built but are absent from current GitHub default-branch evidence.
2. Confirm whether their APK artifacts/workflow branches still exist before resuming them.
3. Complete or explicitly cancel the pending Railway/Lovable cleanup in its own execution task.
4. Update this file only when meaningful state changes.

## Clinical Cockpit — current Android alpha 0.3.0 (2026-10-07)

- Branch clinical-cockpit-android-v0-3; draft PR #20 based on v0-2; main unchanged.
- Runtime build source 924e47bc8b68dd3c6d24a800775e0cf4623941c0;
  signed source/binary checkpoint b3598c33649402207fbb0ea9315a1fa3d646b72e;
  verified source/test head e373cfffb01b03b0190c3e2dff9a40d37f352369.
- Package com.andrefiker.clinicalcockpit; Android 11+; version 0.3.0/code 3.
- APK dl/Clinical-Cockpit-v0.3.0.apk, 103,103 bytes; SHA-256
  4254ec4bb341fa265cb40ea726d6d924fe024ef3a6d7d063d2c3687fd07c21b7.
- Daily password removed; Android Keystore wraps vault keys. Existing vaults need
  the original password once to migrate; wrong passwords preserve old records.
  Pausar/Continuar is unauthenticated; phone lock is the access barrier.
- Portable encrypted backups retain a separate password and work independently
  of device keys. Validated restoration, encrypted prior snapshot/undo retained.
- Local CSV/JSON roster import via paste/file, field validation, review/confirmation,
  duplicate suppression, source reference and optional per-patient Notebook link.
  No real patients bundled/fetched; no automatic Notebook account synchronization.
  Original documents and reviewed records are authoritative; model output is a proposal.
- 40 core + 64 synthetic offline Android integration checks; build/lint; native
  screen review; physical PDF/DOCX; signed payload/certificate verification passed.
- Native CI 37689950910; exact signed production CI 37689950693: 16 checks passed,
  including signed 0.2→0.3 migration, password-free reopen, physical portable backup
  independent decryption, real CSV picker/dedup, old backup restore and password-free undo.
- Persistent certificate SHA-256
  60c09e631510afb847ccf08eb57c6ce3976082760140a9fb9b4f9c0014819fcf;
  signing key retained privately outside Git, unchanged since 0.1.
- Manual alpha: AI/audio/Google sync pending; no Internet permission/backend.
  Physical handset/Android 11 runtime acceptance pending. Use fictitious data first.
- Prior verified signed 0.2: cd97614880d88699205a5508289aa1d6f1cc703d,
  docs checkpoint 80cfbd8df010b0ceda38df4aa3df7559d54117a5; prior APK retained.
  Android downgrade is not recovery; preserve an external portable backup.
- Detailed current scope, recovery limits, CI and next work: clinical-cockpit/APP_STATE.md.
