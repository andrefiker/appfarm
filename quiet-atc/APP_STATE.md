# APP STATE

## Identity
Display name: QUIET ATC
Directory: quiet-atc
Package ID: com.andrefiker.quietatc
Current version: 1.1.1
Version code: 3

## Current verified release
Git branch: main
Release commit: 8551b19aa527eed280d24d6f237ee54728bd9a81
APK: Quiet-ATC-v1.1.1.apk
APK SHA-256: 53795050b4804408aeff3b0ecbabc2361b0571f3f53ab181d2726c9f3212b74a
GitHub Actions run: 37618273520
Artifact ID: 11480453728
Web build: static bundled source
Backend deployment: none
Production URL: none

## Gameplay
- Bright top-down airfield with finger-drawn routes.
- Planes route to either runway approach; helicopters route to the helipad.
- Visible flight paths, traffic warnings/collisions, scoring, progressive levels, pause, and 1x/2x speed.
- Three missed aircraft end a shift; one collision ends it immediately.

## v1.1.1 touch-control repair
- Aircraft grab target is pixel-based and enlarged to roughly 54–72 px on phones.
- HUD is touch-through except for its actual buttons, so aircraft beneath it remain controllable.
- Simulation slows to 42% while the user is actively drawing a route.
- Stale points near the aircraft's old position are trimmed when a route is committed, preventing the immediate backward/U-turn response.
- Aircraft turn rate and waypoint capture were increased for closer tracking of the drawn line.
- Runway and helipad endpoint snapping radii were increased.
- Pointer release always adds the final finger location so landing-zone snaps are not lost at the end of a gesture.

## Architecture
Frontend: HTML/CSS/JavaScript Canvas
Persistence: localStorage
Backend: none
Realtime: none
Database: none
Android wrapper: minimal Java WebView with bundled local assets
Artwork: original procedural/vector map and aircraft drawings

## Verified
- GitHub Actions build from canonical main: success
- deterministic engine tests: passed
- JavaScript syntax checks: engine.js and game.js passed
- offline bundle scan: passed
- APK package/version: com.andrefiker.quietatc / versionCode 3 / versionName 1.1.1
- APK signature: one signer; APK Signature Scheme v2 verified
- Internet permission: absent
- bundled assets: index.html, engine.js, game.js, style.css verified inside APK
- APK file: structurally valid Android package with APK Signing Block
- physical-device touch feel: pending Andre's v1.1.1 test

## Known issues
- CI uses test/debug signing; an installed build signed by a different previous CI key may require uninstall before installing this APK.

## Rollback
Previous release v1.1.0 source target: fc2e6b98932616507e5653550a4ceb17228bb6b0
