# QUIET KNIGHT II — verification record

Date: 22 October 2026. Owner: André Fiker. Package `com.andrefiker.quietknightii`, version 1.0.0 / code 1. This is a signed Android build with source/browser/APK validation; native installation and physical-device qualification are not claimed.

## Current reproducible evidence

| Layer | Result | Evidence |
|---|---|---|
| Rules/source tests | 20 groups passed; zero failures | `evidence/rules-tests.txt`, `tests/rules.test.mjs` |
| Perft | Six established comparisons passed: 197281, 97862, 43238, 9467, 62379, 89890 | Same rule log; FENs/depths in test source |
| Representative legal play | 32 seeded games, 5,977 plies, 6 natural terminals, 200-ply cap | Rule log; these are rule-validation games, not engine strength claims |
| Browser tests | 47 checks passed; zero JS errors or external requests | `evidence/browser-tests.json`, `tools/browser-qa.cjs` |
| Actual engine | 30 legal searches: all five profiles × six FENs; Master finds mate in one | Browser JSON includes SAN and measured durations |
| Mobile interaction | Tap, drag, promotion picker, underpromotion, reload persistence, overlay/reduced-motion controls; board fits 320/360/393/430px | Browser JSON and `recovery-phone-*.png` |
| Source packaging | Recovered Java compiles; aapt packaging, D8 and zipalign complete | `evidence/source-build.txt` |
| APK inspection | Package/version/launcher correct, zero permissions, v2 and v3 signatures valid, zip alignment valid | `aapt-badging.txt`, `aapt-permissions.txt`, `apksigner.txt` |
| Runtime identity | All 48 recovered runtime assets equal the delivered APK bytes | `evidence/apk-verification.json` |
| Emulator | Not run; no available emulator/device/KVM | No emulator success claimed |
| Physical device | Not run; no connected device | Remaining owner QA below |

Rule fixtures explicitly cover castling through attack, en passant exposing a king, all pawn promotions, pins/geometric attacks, mate/stalemate, standard dead material, claimable versus automatic draw thresholds, declared-move claims, repetition, save/undo, FEN/PGN round trips and malformed inputs. Perft comparisons verify broad legal-move generation, rather than relying on plausible-looking play.

Browser networking was disabled while a local interception harness supplied bundled assets. This proves the engine uses local files in the browser harness; it is not a physical airplane-mode test. Native lifecycle callbacks were simulated; real Android process death has not been exercised here.

## Earlier observations and recovery boundary

Before automated workspace pruning, the development run observed 21 rule groups (20 plus a separate history-validation group), 81 browser checks, and a 12.2-minute soak comprising 10 games, 754 plies and 754 real engine searches across all levels. The soak had zero observed JavaScript errors; three games ended naturally, the others reached an 80-ply cap. Those raw logs were removed with the first checkout. They are retained here only as historical observations from the development checkpoint, **not as independently reviewable surviving test evidence**. The table above uses fresh, committed evidence instead.

Original gameplay screenshots survived as Git blobs and were recovered without editing their pixels. They show actual browser-rendered runtime gameplay, not Android screenshots or generated concept art. The initial local milestone APK and local Git objects were lost; only the final signed APK, private signing identity and uploaded binary objects survived. The recovery commits now preserve the source remotely.

The exact delivered APK SHA-256 is:

`722c25de8e72e773e1f27a7c50da6bec599a5f8d901287b21ff0d75bc5a01ce9`

Signing certificate SHA-256 (RSA 4096):

`7eb3b3247c42e8ade034263b1bbfcce2e5e54baab7d5c82aa958e58ff55f8017`

The APK is 5,754,622 bytes. It passed apksigner verification using `--min-sdk-version 24` to exercise both its v2 and v3 signing blocks; its actual declared minimum remains API 28. The dedicated keystore and password have a private durable owner backup. No signing secrets are published here.

## Repository inspection and safeguards

The original inspection covered AppFarm's main tree, branch inventory, releases, existing Quiet Knight client/engine integration, multiplayer source references, licenses and build workflows. The original Quiet Knight client used a remote engine route and a shallow fallback, and its archived small wrapper depended on remote content. These were not reused. Quiet Knight Lite's README described network multiplayer. Brick Breaker's native wrapper and README were inspected for the packaging pattern; this wrapper was written separately.

At inspection, repository package search returned no use of `com.andrefiker.quietknightii`; this establishes repository uniqueness, not global Play Store ownership. No original package, multiplayer server, production service or key was changed. Existing workflows' branch/path filters did not target this isolated branch/directory. No new backend, paid service, analytics, advertisement or production deployment was created.

## Remaining gaps

- Dead-position detection does not solve every exotic blocked position with non-pawn pieces. It recognizes standard insufficient material and proven locked pawn-only fortresses. This remains a core completeness limitation.
- No curated tactics pack or automated game review. Actual engine hints and analysis are included.
- No physical audio/haptic/clipboard, Android install, force-stop, low-memory, battery/thermal or older-WebView qualification. Long-session browser observations do not establish all-day Android stability.
- Native source was recovered from the APK, repaired for compilation and packaged successfully; no byte-identical native rebuild or semantic-equivalence proof is claimed.

## Smallest next device test

On the Poco X7 Pro: install the signed APK, enable airplane mode, start one game at each difficulty, and confirm the engine replies. Make a move, background the app, return, then force-stop and reopen to verify the same position. Check tap and drag, promotion, tactical layers, safe areas under gesture navigation, clipboard, sound and haptics. Play one longer session and record Android/WebView versions and any failure. No account or network permission should be requested.
