# Verification record — Tower Stack 1.0.0

## Local evidence

- 19 automated tests pass, including gravity/collision, friction, rotation,
  centered/offset/narrow/heavy stacks, repeated input, real collapse, scoring,
  difficulty, pause/restart, deterministic replay, sandbox configurations,
  statistics, corrupt saves, and airborne-height regression.
- A 60-block simulation remains finite through an additional 3600 steps,
  with height above 54 metres and no lost blocks.
- Local Gradle Android build succeeds with JDK 17, SDK/build tools 35,
  Gradle 8.10.2 and Android Gradle Plugin 8.7.3.
- aapt confirms package/version/min SDK/launch activity. Only VIBRATE permission.
- apksigner verifies v2 RSA-2048 Android debug signing; zipalign passes.
- APK bundled HTML is byte-identical to production web build.
- Phone browser playthrough passes all modes, palettes, save/reload,
  touchscreen placement, fast-repeat guard, tall camera, overview and offline
  gameplay at 393×852 and 320×568. Screenshots visually inspected.

## Release gate and evidence

The workflow `.github/workflows/tower-stack-apk.yml` repeats tests and browser
playthrough against the release commit, builds and structurally verifies its APK,
then installs and plays that APK on an Android 35 Pixel 2 emulator with Wi-Fi
and mobile data disabled. It checks native touch placement, score, stable and
mid-fall process-death restoration, collapse, restart and persistent records.

The version tag and release are created only after every gate passes. A published
`tower-stack-v1.0.0` release therefore identifies the exact verified commit.
Its notes include that commit and the workflow run URL. Download the attached
QA ZIP for original phone screenshots, JSON reports, manifest badging,
permissions and signing-certificate details. The release SHA256SUMS.txt applies
to the attached APK; local candidate signing certificates may differ.

## Limits

No physical phone was available. Headless/emulator rendering measurements do not
establish frame rate or battery life on André's phone. Long replay restores can
briefly delay Continue. Sudden termination without background/page-exit callbacks
can return to the most recent saved drop or resolution. APK uses debug signing;
future APKs need the same certificate to update in place. No Google Play release.
