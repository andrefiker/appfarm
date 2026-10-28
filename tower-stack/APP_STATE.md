# Tower Stack — app state

## Identity
- Tower Stack 1.0.0 / version code 1 / com.andrefiker.towerstack / Android 8+.
- Directory: tower-stack/; development branch: tower-stack-v1.0.0.

## Release identity
- Release and immutable source: tag tower-stack-v1.0.0 (same repository visibility).
- Exact commit, APK SHA-256 and successful CI run are recorded in GitHub Release
  notes and attached SHA256SUMS.txt. Tag is created only after all gates pass.
- Assets: Tower-Stack-v1.0.0.apk, complete source ZIP, QA ZIP, production HTML.
- No merge into main. No website/backend/database deployment.

## Architecture
Canvas + vendored MIT Matter.js 0.20.0; fixed 60 Hz simulation with rendering
interpolation; minimal Android WebView; local deterministic drop/tick replay;
original procedural artwork and synthesized sound; no network permission.
Endless, Precision, Time Attack, Zen, Sandbox. Classic, Minimal, Neon palettes.

## Verification
- Local: 19 rules/physics/persistence tests; production bundle; actual APK build;
  package/version/permission/signature/alignment/offline bundle checks pass.
- Mobile browser: placement, all modes/themes, tall tower/overview, reload,
  offline and small viewport passed; screenshots inspected.
- Release workflow additionally gates on offline Android emulator install,
  native touch, score, process-death saves, collapse, restart and statistics.
- See QA.md and release QA ZIP. No physical-device testing claimed.

## Limits and next work
Debug signing; Android 8+; long replay may delay Continue; abrupt death may
restore the latest saved event. Validate feel, haptics and performance on André's
phone. Preserve the published APK; independent debug builds can have a different key.

## Rollback
Pre-project main: 0db2815c14b727031d63e7c14ef0a75255690e90.
All work isolated on the development branch; unrelated AppFarm apps preserved.
