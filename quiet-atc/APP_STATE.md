# APP STATE

## Identity
Display name: QUIET ATC
Directory: quiet-atc
Package ID: com.andrefiker.quietatc
Current version: 1.0.0
Version code: 1

## Current verified release
Git branch: quiet-atc-v1.0.0
Git commit: pending
APK: pending
Web build: static bundled source
Backend deployment: none
Production URL: none

## Architecture
Frontend: HTML/CSS/JavaScript Canvas
Persistence: localStorage
Backend: none
Realtime: none
Database: none
Android wrapper: minimal Java WebView, bundled local assets

## Verified
- build: source created
- tests: 28 engine assertions passed locally
- gameplay: deterministic simulation paths tested
- mobile viewport: static safe-area/touch checks passed
- offline: no remote references in web source
- background/resume: Android WebView state + automatic pause on visibility change
- APK structure: pending
- install/launch: pending
- device tested: no

## Known issues
- Physical Android device QA has not yet been performed.
- Local headless Chromium screenshot attempt was blocked by the execution environment; Android package QA remains authoritative.

## Next recommended work
- Build APK in GitHub Actions and verify artifact/package/signature/assets.

## Rollback
Commit/tag: branch base before QUIET ATC
Provider rollback target: none
