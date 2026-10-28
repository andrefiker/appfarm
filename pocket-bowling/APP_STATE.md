# Pocket Bowling — app state

Identity: Pocket Bowling 1.0.0 (version code 1), `com.andrefiker.pocketbowling`.
Branch: `codex/pocket-bowling-v1.0.0`. Main unchanged.
Architecture: dependency-free canvas + fixed 120 Hz planar physics; deterministic scoring; localStorage transaction; bundled offline Java WebView. No backend, analytics, ads or runtime network.

## Verified locally
- 13 automated test groups pass, including exhaustive legal final-frame triples and two complete deterministic physics games.
- APK built; ZIP/DEX/resources, package/version, launcher, portrait declaration, exact bundled asset equivalence checked.
- zipalign passes; v2/v3 signature passes; standard RSA 2048 Android Debug certificate.
- Only VIBRATE permission; no Internet permission.
- Browser launch was blocked locally (process socket restriction); no local visual or device QA claim.

## Release gate
`pocket-bowling-release.yml` requires browser gameplay QA, candidate verification and an API 35 offline emulator smoke test before tagging/publishing. Candidate lives under release/; checksums and signature evidence accompany it. Check the run's actual result before treating the release as published or emulator-tested.

## Recovery
Interruption during motion restores the pre-throw rack with no awarded roll. Settled roll + stats save as one localStorage record. Remaining standing pin positions survive second throws. Backgrounding pauses play.

## Limitations
Physics uses planar circles plus tilt; not full 3D. No AI opponents. No physical-phone QA yet. Standard debug signing, not production signing. Browser screenshot/device gates may need ordinary repair; they are not waived.

## Rollback
Pre-project commit: `0db2815c14b727031d63e7c14ef0a75255690e90`. No existing game changed.
