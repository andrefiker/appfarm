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
- GitHub Actions run #41483325797 succeeded (APK v1.0.0, build, signature, package/version, assets, no Internet permission): PASS
- APK build SHA-256: `3056d4e50b4555cdfe602ab4d65a805aadbf41bd82664c750b7cebdf2a7038fd`
- Full six-shot browser round completion and restart: PASS
- Physical-device install, launch, background/resume and GPU shader: NOT VERIFIED
- GPU resolution-cap repair is present in APK and structurally checked in second successful CI run

## Recovery and rollback
- Preserve latest verified source; if packaging fails, repair build only.
- Source build commit: `a8b9d60b29749a00853b8c47ad1c0b7739733619` on branch `feature/singularity-showcase`.
- Rollback source commit: `fbf14672d9cb06ff6a06db7912ee575f90ccc762` (first working APK); pre-feature main: `0db2815c14b727031d63e7c14ef0a75255690e90`.
