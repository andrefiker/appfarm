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
- Android build, signature, APK structure, install, physical-device QA: NOT VERIFIED until CI and mobile checks

## Recovery and rollback
- Preserve latest verified source; if packaging fails, repair build only.
- Git commit SHA and APK build run: pending GitHub synchronization.
