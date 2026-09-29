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

- Settlement Zero / Android packaging baseline: `4dc5aaa0bfb60f118055370483c8b3471ecbf940`.
- Quiet Video Poker v1.2.0: main commit `4d7e1fb5375db5f996e82d3c0fc7b61f256ed7ab`, package `com.appfarm.quietvideopoker`, version code 3. Bets: 100, 200, 500, 1,000, 5,000; old local balances and credit statistics scale by 100 once. GitHub Actions run `36443575044` passed 22 tests, APK structure/signing, emulator install/play/resume/reopen/offline QA, and phone screenshots. Rollback: `7a2d3978156a61cf444a4b605432f5c774e8e839` (v1.1.0); earlier v1.0: `2026ab088ff01eb3c2bc0ab27413aa77a26fcf43`.
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

## Unresolved blockers / next reconciliation work

1. Locate or recover canonical source for late-September apps that were reported built but are absent from current GitHub default-branch evidence.
2. Confirm whether their APK artifacts/workflow branches still exist before resuming them.
3. Complete or explicitly cancel the pending Railway/Lovable cleanup in its own execution task.
4. Update this file only when meaningful state changes.

## Impact Lab: Core 1.0.0 — 2026-09-29

- Isolated branch `impact-lab-core-2026-09-28`; app directory `impact-lab-core`.
- APK/source build commit `1520d6c1fab67b91b4fc852a166681460ddccf17`; anatomy rollback `53c556dd8bbb902562038bb9ef985367b3a9a99d`; recovered interaction checkpoint `450060ec77533807d632d00137f13496684036b9`.
- Local-only Three.js/Vite app with licensed aligned Z-Anatomy torso GLB, restrained procedural materials, local blunt/projectile approximations, capped cutaway, rotate/zoom, separate tap/apply, undo/reset and persisted settings. No server, analytics or provider deployment.
- Fresh production-browser visual acceptance and 13 deterministic geometry/state tests pass. Actual rendered screenshots delivered. Reset canvas matches baseline byte for byte; section geometry allocation remains stable across view cycles.
- APK BUILT / PACKAGE VERIFIED: `com.andrefiker.impactlabcore`, 1.0.0/code 1; debug signed; no requested permissions; all bundled assets match tested production. SHA256 `e21f38c107281cba23efc12b599f5dd67205263eecc963d93045fbfe39ac8382`.
- GitHub Actions run `36565972980`; Initial emulator automation timed out during the projectile/cutaway stage; its DevTools captures showed a blank canvas, so Android visual acceptance is NOT established. Diagnostic run 36566694511 was still active when Andre directed abandoning the emulator route. Do not wait/retry emulator jobs as a delivery gate. Packaging now runs without an emulator; the diagnostic workflow is manual-only. Later user-supplied phone screenshot confirms 1.0 anatomy rendering; full physical behavior/performance remain untested.
- Visual limits: stylized fibers/organ surfaces, simplified solid section faces, flat cropped torso boundaries and less convincing extreme grazing contacts. No validated tissue mechanics or injury scores.
- Recovery lesson: commit each working stage promptly; temporary workspace pruning removed earlier uncommitted work. Reconstructed source is now durable. Reuse the optimized licensed GLB; do not reload the full atlas during normal builds.

## Impact Lab Core+ 1.1.0 performance pass — 2026-09-29

- Latest user request: substantially improve and make nimbler; no emulator waits/retries. Preserve the verified atlas and app scope.
- Source checkpoint: BVH actual-mesh picking/intersections and slicing, refit after deformation, unchanged-cutaway cache, demand-only idle rendering, shared/local damage shader noise, DPR cap 1.25 and static contact shadow. Compact controls; projectile hides irrelevant intensities; home view; camera restored after cutaway; softer muscle fibers and clearer bruising.
- 14 geometry/state tests and production-browser interaction/visual acceptance; CPU benchmarks in `impact-lab-core/qa/benchmark-{before,after}.json`. No physical-phone FPS claim.
- Packaging target `com.andrefiker.impactlabcore.fast`, 1.1.0/code 2, Impact Lab Core+, separate from 1.0 because its debug signing key was not retained. No backend/deployment/permissions. APK BUILT / PACKAGE VERIFIED: source commit `774de4e4a426d8e0f54a53f138f5abeebb827855`, workflow `36568549017` succeeded without emulator. SHA256 `7aeabcdddb6acaf7b2b16ee99b2a71ae44fc6f68b09ff1ca2ebbef231d0f661d`; v2 debug signature; ten bundled files match tested production. Physical 1.1 performance/resume/offline relaunch remain untested.
- Rollback: `dccdcf1ed3b9cc8ad69dfdf209582e2a9abfcae0`; older APK source `1520d6c1fab67b91b4fc852a166681460ddccf17`.

## Impact Lab Core 3 / 1.2.0 — 2026-09-29

- Current checkpoint: cumulative projectile wounds, closed lining, surface-following blood trails, geometry-aligned internal tracks and bounded tissue deformation; 30-event cap. Added original licensed BodyParts3D 4.0 head/skull/brain and focus controls. No real rifle calibration or injury prediction.
- 17 tests and production browser QA pass; screenshots inspected. Head remains visually provisional: neck seam, simplified eyes and rough cranial sections. No emulator work; no physical-device claim.
- Packaging target com.andrefiker.impactlabcore.next, 1.2.0/code 3. New release signing key outside repository; privately retain for update continuity. CI builds unsigned, local signing keeps secrets out of CI/Git. APK BUILT / PACKAGE VERIFIED: source 40c6d052c85abd473b3f14b329ef803dfce8da67, run 36577005538; SHA256 2af052d855838281f92ee60a64efb39fc9f812b9abd1c02adeae0f2653a0efac. v2/v3 release signature, zero permissions, fourteen bundled files match tested production. Private signing recovery archive saved as Impact-Lab-Core-Signing-PRIVATE.zip; never commit its contents.
- Rollback d1b74dac2f35ebd44c4ac20e71dc40dfe3d888f3; prior APK source 774de4e4a426d8e0f54a53f138f5abeebb827855.
- Dataset lesson: BodyParts3D skin includes a thin double surface. Use validated outer envelope before pairing entry/exit; otherwise the projectile falsely exits before skull.

## Impact Lab Core 4 / 1.3.0 — 2026-09-29

- Andre's phone screenshot confirms 1.2 rendered but damage was still too superficial. Focused correction: visible lined tissue openings in isolated layers/cutaway, branching bone fissures, larger cumulative wounds and stronger fictional penetration. No real weapon calibration.
- 18 tests and production-browser checks pass. Actual phone-size renders inspected; 1.3 physical testing outstanding. Head/neck visual defects remain.
- Same package com.andrefiker.impactlabcore.next and retained private certificate as 1.2; versionCode 4 permits update. Package verification pending at this checkpoint. No emulator, backend or deployment.
- Rollback 98a9dba25765d998bd2c6a8a9f613d13daa023d6; previous APK source 40c6d052c85abd473b3f14b329ef803dfce8da67.
