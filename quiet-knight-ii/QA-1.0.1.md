# QUIET KNIGHT II 1.0.1 — ending corrections and Android qualification

Date: 22 October 2026. This report supersedes the current-release portions of `QA.md`; the older report remains the v1.0.0 record.

## Changes

1. A pawn blocked by its own king was incorrectly treated as permanently frozen in the locked-pawn dead-position proof. The counterexample `k7/8/8/p1p1p1p1/P1P1P1P1/1K6/1P6/8 w - - 0 1` was wrongly drawn in v1.0.0. `Ka3 Kb8 b4 axb4+` demonstrably opens the barrier. The proof now requires another pawn immediately ahead of every pawn; temporary king blockers cannot establish a dead position.
2. Resignation against a bare king now produces a draw, consistent with [FIDE Article 5.1.2](https://handbook.fide.com/chapter/e012023). Both colors, persistence and PGN results are covered. A minor piece with possible help from the other army is not simplistically treated as incapable of mate.
3. The build script now reads the PKCS12 password file once. Supplying it as both store/key password consumed a second missing line in apksigner. A real release signing run now passes from the preserved private identity.

## Verified evidence

| Layer | Result | Evidence |
|---|---|---|
| Rules/source | 25 groups passed, including six perft comparisons and 32 seeded games | `evidence/rules-1.0.1.txt` |
| Targeted browser | 16 checks passed: live barrier continuation, real fortress, resignation UI, save/reload, completed-game score, themes, 320px layout, offline engine smoke, no JS errors/external requests | `evidence/endings-browser-1.0.1.json` |
| Signed build | Compiles, packages, aligns and signs with the existing dedicated identity | `evidence/build-1.0.1.txt` |
| APK inspection | Correct package/code/version; zero permissions; valid v2/v3 signatures; all 48 assets match source | `evidence/apk-1.0.1.json`, `tools/verify-apk.py` |
| Previous engine coverage | The vendor engine files and engine adapter are unchanged from v1.0.0, whose five levels × six FENs passed | `evidence/browser-tests.json` from v1.0.0 |

This is the intermediate v1.0.1 checkpoint. The later en-passant regression, final release and emulator outcome are recorded in QA-1.0.2.md. No physical-device testing has been performed.

## Release identity

Package: `com.andrefiker.quietknightii`. Version name: **1.0.1**. Version code: **2**. Minimum API 28, target 35. APK size: **5,750,526 bytes**.

APK SHA-256: `5f2e2e09599186ba0f151a8d321fa6a798306f30e46014fb85febd2cd48c5d99`

Certificate SHA-256: `7eb3b3247c42e8ade034263b1bbfcce2e5e54baab7d5c82aa958e58ff55f8017`

The dedicated identity was recovered from its private durable backup and used successfully; no private signing material is in this repository. Version 1.0.0 remains preserved as the previous release. Updating is intended to retain local games; uninstalling removes them.

## Remaining scope

The dead-position recognizer remains conservative and does not solve every exotic blocked position involving non-pawn pieces. This patch prevents an incorrect automatic draw; it does not claim universal dead-position solving. Curated tactics and automated full-game review remain omitted. Physical phone, native audio/haptics, battery/thermal and prolonged device sessions remain unverified.
