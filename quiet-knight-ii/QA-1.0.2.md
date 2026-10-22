# QUIET KNIGHT II 1.0.2 — ending corrections and qualification

Date: 22 October 2026. This is the current release report. `QA.md` and `QA-1.0.1.md` retain the preceding milestones.

## Corrected behavior

- A king temporarily blocking a pawn no longer proves that a pawn barrier is permanently frozen. The legal continuation `Ka3 Kb8 b4 axb4+` opens the regression position that v1.0.0 incorrectly declared drawn.
- An immediate en-passant capture now prevents the same dead-position shortcut. In `k7/8/2p1p3/p1PpP1p1/P2P2P1/8/1K6/8 w - d6 0 20`, both `cxd6` and `exd6` can open the barrier. The same position without en-passant rights is genuinely frozen. Both cases are tested.
- Resigning against a bare king records a draw for either color, including after save/reopen and PGN export/import. This follows [FIDE 5.1.2](https://handbook.fide.com/chapter/e012023). Minor pieces are not generically treated as incapable of mating with help from the opposing army.
- The release build successfully uses the private PKCS12 password file once; it no longer tries to read a nonexistent second line for the key password.

## Evidence

| Layer | Result | Files |
|---|---|---|
| Rules/source | 26 groups passed, zero failures; six perft comparisons; 32 seeded games | `evidence/rules-1.0.2.txt`, `tests/endings.test.mjs`, `tests/rules.test.mjs` |
| Browser interaction | 18 targeted checks passed, including four tap moves opening a barrier, en passant via touch, true dead position, resignation result/history/reload, three themes, 320px fit, engine smoke and no JS errors/external requests | `evidence/endings-browser-1.0.2.json` |
| Engine | Vendor engine and adapter unchanged; prior 30 real searches across all five levels remain recorded; a fresh bundled offline search passed | `evidence/browser-tests.json`, current browser report |
| Packaging | Android source compilation, resources, D8, zipalign and signing passed | `evidence/build-1.0.2.txt` |
| APK | Correct package/version/code, valid v2/v3 signatures with the existing certificate, zero permissions, all 48 bundled assets byte-identical to source | `evidence/apk-1.0.2.json` |

Android emulator qualification is pending the bounded warm-start diagnostic. No physical device has been tested.

## Exact release

- Package `com.andrefiker.quietknightii`; version **1.0.2**, code **3**; minimum API 28, target 35.
- APK size **5,750,526 bytes**.
- APK SHA-256: `449c80fbdef1e05793a14468eee06aca7421a417f61c433a47f1f8e1c3bb2bb1`.
- Signing certificate SHA-256: `7eb3b3247c42e8ade034263b1bbfcce2e5e54baab7d5c82aa958e58ff55f8017`.
- Same dedicated signing identity as 1.0.0 and 1.0.1. The private backup was actually restored and successfully used. No keystore/password is in this repository.
- Previous signed APKs remain preserved. The separate source branch is `work/quiet-knight-ii-20261022`; no main merge or original app changes.

## Limits and next device check

Universal dead-position solving for exotic blocked positions involving other pieces remains incomplete. These fixes prevent premature draws; they do not claim a full cooperative-mate solver. Curated tactics and automatic full-game review remain omitted. Physical installation, device-specific safe areas, native haptics/audio/clipboard, battery/thermal behavior and prolonged phone sessions remain unverified.

Install over the existing app with the same identity; do not uninstall if retaining local games. On the Poco X7 Pro, test airplane-mode engine play, force-stop/reopen, all five levels, tap/drag, promotion and tactical layers. Confirm the same game survives the update and reopening.
