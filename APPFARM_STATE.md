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
- main now includes the Quiet Video Poker v1.1.0 release at `7a2d3978156a61cf444a4b605432f5c774e8e839` (2026-09-28);
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
- Quiet Video Poker v1.1.0: main commit `7a2d3978156a61cf444a4b605432f5c774e8e839`, package `com.appfarm.quietvideopoker`, version code 2. GitHub Actions run `36441954849` passed tests, APK verification, emulator install/play/resume/reopen/offline QA, and WebView screenshot capture. Rollback: `2026ab088ff01eb3c2bc0ab27413aa77a26fcf43` (v1.0).
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
