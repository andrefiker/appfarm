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
- GLSL ES vertex and fragment shader static compilation (glslangValidator on GitHub Actions): PASS
- WebGL2 visual execution on mobile GPU: NOT VERIFIED (sandbox GPU unavailable)
- GitHub Actions run #41483890028 succeeded (APK v1.0.0, build, signature, package/version, assets, no Internet permission): PASS
- APK build SHA-256: `7eb33794f37ceaff76322b57e6852935d24d176487322c7156aede890f3af31f`
- Full six-shot browser round completion and restart: PASS
- Physical-device install, launch, background/resume and GPU shader: NOT VERIFIED
- GPU resolution-cap repair and safer shader identifier are included in validated APK; GLSL static compilation in CI passed

## Recovery and rollback
- Preserve latest verified source; if packaging fails, repair build only.
- Source build commit: `9dc56848b27c03323b49df8b21438ecc3a421533` on branch `feature/singularity-showcase`.
- Rollback source commit: `fbf14672d9cb06ff6a06db7912ee575f90ccc762` (first working APK); pre-feature main: `0db2815c14b727031d63e7c14ef0a75255690e90`.
