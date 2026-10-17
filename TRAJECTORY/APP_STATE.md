# APP STATE — TRAJECTORY

## Identity
Directory: TRAJECTORY
Package ID: com.andrefiker.trajectory
Version: 1.0.0 / code 1
Branch: feat/trajectory-20261017

## Current verified release
APK: TRAJECTORY-v1.0.0.apk (direct deliverable; not committed as a binary)
SHA-256: 78c14c362f36b8800bd8e5b6e5fed29156da17f6cf76fa3b12bd17e1d39f2ec4
Source commit: recorded after canonical upload.
Android debug certificate: 39bd289abd6f0415fe88afb31d491374356d0002ef24a48100e0f1849bd88e1c
Preserved private key: TRAJECTORY-v1.0.0-signing.p12; alias androiddebugkey, standard debug password android. Kept separately from public source.

## Architecture
Dependency-free Canvas/DOM ES modules; deterministic 1/120 s physics, local progress, procedural art and synthesized sound. Classic production bundle in dist; native Java WebView loads bundled assets. No backend, no network permission. VIBRATE only. Android 26–35, portrait; Java JDK 17, Gradle 8.10.2, build-tools 35.0.0 / AGP 8.7.3.

## Verified
22 Node tests pass. Three mobile touch browser viewports pass (360×640, 390×844, 412×915). Offline file:// production launch/play passes. APK built, structurally valid, correct package/version/launcher, portrait, v2/v3 signed, aligned, bundled assets byte-identical, permission audit passed.
Native installation, physical-device gameplay, safe-area behavior, hardware haptics/audio and sustained frame rate are unverified. No attached device or accelerated emulator available.

## Next
Install and play on André's Android; collect actual control, difficulty and pacing feedback. Reuse the preserved signing key for updates. No further feature expansion before this feedback.

## Rollback
Initial playable source: 2c15242662efb41b849b7c85a8246af2e79fb5e6.
Before TRAJECTORY: 0db2815c14b727031d63e7c14ef0a75255690e90.
