# TRAJECTORY v1.0.0 — release evidence

Package: com.andrefiker.trajectory · versionName 1.0.0 · versionCode 1
Android minSdk 26 / targetSdk 35 / compileSdk 35. Portrait launcher: com.andrefiker.trajectory.MainActivity.
Source branch: feat/trajectory-20261017. Canonical commit recorded in APP_STATE.md after upload.

APK: TRAJECTORY-v1.0.0.apk
SHA-256: 78c14c362f36b8800bd8e5b6e5fed29156da17f6cf76fa3b12bd17e1d39f2ec4
Signing: preserved Android debug certificate, RSA 2048, APK v2 + v3 verified.
Certificate SHA-256: 39bd289abd6f0415fe88afb31d491374356d0002ef24a48100e0f1849bd88e1c

## Verification

- Local Android build: BUILD SUCCESSFUL (JDK 17, Gradle 8.10.2, SDK/build-tools 35, AGP 8.7.3).
- Node suite: 22 passed, zero failed. Source tests included.
- Fifteen challenges each won in actual game simulation. Moving challenge also won at 16 firing times.
- 500 deterministic terrain seeds valid; 20 generated duel seeds had solutions from both sides.
- Browser touch QA: 360×640, 390×844 and 412×915. Tutorial controls, aiming, shot lock, flight, pause/resume, cluster and AI response, challenge win/next, restart, saved settings and handedness passed.
- Offline: production file:// bundle launches and starts practice with network disabled. Zero script errors and zero external requests during UI QA.
- APK archive tested, launcher/package/version checked, orientation portrait, alignment verified with zipalign -c -P 16 -v 4.
- Assets index.html/style.css/game.js byte-identical to production build; no remote/dev-server reference.
- Manifest permission audit: VIBRATE only. No Internet, storage, location, microphone, camera, advertising or notification permissions.
- Independent code review led to camera-off gating and physically accurate cluster preview fixes, each with failing then passing regressions. Cluster trails were separated and dialog headings correctly labelled. Rival rotation was retained after checking y-down trigonometry: PI + angle points up-left.
- Visual QA compared the concept and final implementation at phone sizes: HUD hierarchy, amber/navy palette, landscape/controls split, weapon selection, readable angle/power and left FIRE placement. Intentional deviations: procedural/vector landscapes and cannons, system typography, compact controls rather than raster concept artwork. No raster assets or remote fonts required.

## Testing limits

No native Android install/launch or physical-device playtest was performed. No attached Android device or /dev/kvm was available. Native safe-area handling, hardware haptics/audio, perceived fun and sustained device frame rate still require André's phone. Browser interactions and simulation tests are evidence of behavior, not physical-device performance or enjoyment.

## Recovery

Initial source checkpoint: 2c15242662efb41b849b7c85a8246af2e79fb5e6.
Pre-project rollback: 0db2815c14b727031d63e7c14ef0a75255690e90. Revert only the scoped TRAJECTORY changes; preserve unrelated AppFarm projects.
No merge, deployment, public release publication, paid service, production system or backend change.
