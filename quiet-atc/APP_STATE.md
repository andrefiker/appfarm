# APP STATE

## Identity
Display name: QUIET ATC
Directory: quiet-atc
Package ID: com.andrefiker.quietatc
Current version: 1.0.0
Version code: 1

## Current verified release
Git branch: main
Git commit: ee2ad5691a44a096629d0c9aa54d016327561664
Release merge commit: 6c624410a55333a625242f7f775f1123550ed8a1
APK: Quiet-ATC-v1.0.0.apk
APK SHA-256: df775ca38f6a63ec0f08477d80f2f531c96cc77a3f0ea82c29b617e27da7a9ec
GitHub Actions run: 37564785401
Artifact ID: 11458517547
Web build: static bundled source
Backend deployment: none
Production URL: none

## Architecture
Frontend: HTML/CSS/JavaScript Canvas
Persistence: localStorage
Backend: none
Realtime: none
Database: none
Android wrapper: minimal Java WebView with web/ bundled directly as local assets

## Verified
- build: GitHub Actions success on main
- tests: 28 deterministic engine assertions passed
- gameplay: heading/altitude commands, separation/collision, ILS capture, landing, departures/handoffs, seeded spawning, scoring, and difficulty progression covered
- mobile viewport: static safe-area, touch/zoom, portrait, and background-pause checks passed
- offline: CI scan passed; APK contains bundled index.html, engine.js, game.js, style.css; no Internet permission
- background/resume: WebView state save/restore plus automatic game pause on visibility change
- APK structure: Android package with APK Signing Block; aapt package/version check passed
- signing: one signer; APK Signature Scheme v2 verified
- package/version: com.andrefiker.quietatc / versionCode 1 / versionName 1.0.0
- install/launch: not device-tested in this execution environment
- device tested: no

## Known issues
- Physical Android device install/play/resume QA remains unverified.
- Local headless Chromium screenshot attempt was blocked by the execution environment; this did not affect engine tests or Android packaging.

## Next recommended work
- Install on Andre's Android phone and play several shifts; adjust traffic density/ILS feel only if real-device play reveals a control or pacing issue.

## Rollback
Commit/tag: ca2def9b969f54f3265519b0a0af0a33344fd34f
Provider rollback target: none
