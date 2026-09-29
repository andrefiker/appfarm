# Impact Lab Physics — 2.0.0

Offline adult synthetic anatomy sandbox. Impact and fictional projectile; skin, muscle, skeleton, organs and movable cutaway. Tap selects, Apply triggers, drag orbits, pinch zooms. Undo/reset remain immediate. Damage and settings now survive reopening.

This pass adds state-aware bent projectile paths, actual locally displaced bone fragments/colliders, bounded coupled tissue response, persistent geometric history, recorded slow replay, event inspection and four section orientations. It preserves the existing source/assets and Android identity. No real firearm calibration or medical prediction.

## Run and build
Node 22.14 or >=22.12; `npm ci`, `npm test`, `npm run build`. `npm run dev` serves the app. All runtime assets/licenses are local.

`node scripts/bundle-android.mjs`; Java 17, Gradle 8.10.2, Android SDK/build-tools 35; `gradle --no-daemon -p android :app:assembleRelease`. The established GitHub workflow compiles and verifies an unsigned APK; release signing happens locally with Andre's privately retained key. Never commit the key/password. The recovery archive is named Impact-Lab-Core-Signing-PRIVATE.zip.

Package `com.andrefiker.impactlabcore.next`, versionCode 5; same signing certificate as 1.2/1.3, so this is an in-place update. Minimum Android 8. No requested permissions. No emulator build gate.

## Use
Select a layer; select a surface contact; apply Impact or Projectile. Head/Torso focus and Home adjust the camera. After an event: Replay/Pause, speed selector, Step and timeline inspect the latest recorded motion while orbiting. Events opens the persistent contact history. Cutaway offers Axial, Coronal, Sagittal or Free; move Offset or align Free to the camera. Mobile/Balanced/Ultra change rendering resolution only. Thirty events and twelve fragment clusters maximum; undo/reset free the affected resources.

## Evidence and limits
`npm test`: geometry/state/system regression tests. `scripts/physics-qa.mjs`: production browser interaction, replay identity, reload persistence, quality equivalence and actual screenshots. `scripts/stability-physics.ts`: thirty mixed-location events, bounded allocations, finite geometry and exact reset. See VERIFICATION.md, ARCHITECTURE.md and qa/v2.0 reports for measured environment and limitations.

The solver is local, deterministic and constrained; it is not FEM, fluid simulation or real ballistics. The inherited neck seam and rough cranial sections remain. Fractures are clearer under rotation than in a single anterior image. Native phone installation, FPS, offline relaunch and resume remain unverified.

Rollback: c6bbcac49971ccd3734b500701c0c2638b778227. Application code MIT; anatomy licenses remain separate: CC BY-SA 4.0 adaptations, original BodyParts3D CC BY 4.0. Credits, exact provenance and processing recipes are bundled.

### Gel update 2.1.0
Default view is now translucent amber synthetic gel with visible embedded anatomy. Continuous gel resistance, merged persistent cavities and deterministic temporary expansion accompany the existing bone failure/path/replay system. No real-ammunition calibration. Run `npm test`, `npm run build`, and `node scripts/gel-qa.mjs` for the gel pass. See RESEARCH.md and VERIFICATION.md for evidence and limitations.

### Gel Exhibition 2.2.0
Gel-only interface; Pistol, Rifle and Shotgun fictional equivalents. Default ¼-speed approach/entry/travel/cavity/settling animation, grouped scatter undo/reload, persistent channels and recorded replay. `node scripts/exhibition-qa.mjs` exercises the actual interface. No real-ammunition calibration. Rollback 47ceccb479e150bb25c99dffc8706ef86720edd9.

### Rifle reference update 2.2.1
Rifle now uses published S&B V340842 7.62×39 FMJ launch mass/velocity to derive initial energy. Gel/bone resistance remains uncalibrated; see RESEARCH.md for the exact evidence boundary. Energy-aware replay and cavity arrival share one timing model. Actual exits animate outside the specimen. Existing damage saves, package and signing identity are preserved. Rollback: 923ca5980835bb0b7cd75cde726fc79783c2b7b5 (2.2.0). Tests: `npm test`; browser regression: `node scripts/exhibition-qa.mjs` and `node scripts/rifle-reference-qa.mjs` with Playwright/Chrome paths supplied as needed.
