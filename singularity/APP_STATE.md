# APP STATE — SINGULARITY

## Identity
- Name: SINGULARITY
- Directory: `singularity/`
- Package: `com.andrefiker.singularity`
- Version: `1.0.0`; versionCode 1

## Architecture
- Static HTML/CSS/JS, procedural WebGL2 + Canvas2D fallback
- Local physics, localStorage personal best, synthesized audio
- Java 17 Android WebView wrapper with bundled `web/` assets, no network permissions
- Backend: none; database: none; paid services: none

## Verified locally
- Node physics tests (8): PASS
- JS syntax: PASS
- Headless Chromium Canvas2D fallback: renders, start button works, launch decreases ammo, scoring updates, no JavaScript page errors
- WebGL2 path: NOT VERIFIED (sandbox GPU unavailable)
- GitHub Actions run #41482719311 succeeded (APK v1.0.0, build, signature, package/version, assets, no Internet permission): PASS
- APK build SHA-256 (first candidate): `80cb4fd353c23447b6ead8392919dd18653a60846f3bd2b72a075268877cf178`
- Full six-shot browser round completion and restart: PASS
- Physical-device install, launch, background/resume and GPU shader: NOT VERIFIED
- GPU resolution-cap repair added after first CI run; rebuild pending

## Recovery and rollback
- Preserve latest verified source; if packaging fails, repair build only.
- Baseline commit: `fbf14672d9cb06ff6a06db7912ee575f90ccc762` (branch `feature/singularity-showcase`); rebuild commit pending.
