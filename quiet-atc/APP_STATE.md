# APP STATE

## Identity
Display name: QUIET ATC
Directory: quiet-atc
Package ID: com.andrefiker.quietatc
Current version: 1.1.0
Version code: 2

## Current verified release
Git branch: main
Release commit: fc2e6b98932616507e5653550a4ceb17228bb6b0
APK: Quiet-ATC-v1.1.0.apk
APK SHA-256: 33cbc215ac16f86a3be631f010220dd1a9d217009ffd316c36e76a346afb9946
GitHub Actions run: 37565879578
Artifact ID: 11458614135
Web build: static bundled source
Backend deployment: none
Production URL: none

## Gameplay
- Bright top-down illustrated airfield.
- Touch an aircraft and draw its route directly.
- Planes snap to either runway approach gate and land across the runway.
- Helicopters route to the helipad.
- Visible dotted flight paths, traffic warnings, collisions, scoring, progressive levels, pause, and 1x/2x speed.
- Three missed aircraft end a shift; one collision ends it immediately.

## Architecture
Frontend: HTML/CSS/JavaScript Canvas
Persistence: localStorage
Backend: none
Realtime: none
Database: none
Android wrapper: minimal Java WebView with bundled local assets
Artwork: original procedural/vector map and aircraft drawings; no copied game assets

## Verified
- GitHub Actions build from canonical main: success
- tests: 32 deterministic engine assertions passed
- JavaScript syntax checks: engine.js and game.js passed
- gameplay rules tested: route simplification, runway snap from both ends, helipad snap, conflict/collision thresholds, route following, deterministic spawning, difficulty progression, scoring, missed-aircraft game over, collision game over
- offline bundle scan: passed
- APK package/version: com.andrefiker.quietatc / versionCode 2 / versionName 1.1.0
- APK signature: one signer; APK Signature Scheme v2 verified
- Internet permission: absent
- bundled assets: index.html, engine.js, game.js, style.css verified inside APK
- APK file: structurally valid Android package with APK Signing Block
- physical-device install/play/resume QA: not performed in this execution environment
- phone-sized Chromium render smoke: attempted from extracted APK assets, but the local Chromium environment hung on DBus/zygote startup; no screenshot result was claimed

## Known issues
- The final visual/feel check still needs to happen on Andre's Android phone.
- CI uses test/debug signing; future upgrade compatibility requires preserving or standardizing the signing key.

## Rollback
Previous QUIET ATC v1.0.0 source/main target: 9818effadd6bc6eb78d514bd59432fe8f2c2d2e6
