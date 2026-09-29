# Impact Lab: Core 1.0.0

Offline anatomical visualization toy. One adult torso, three fictional blunt intensities, one fictional projectile, five anatomical views. Drag to orbit, pinch to zoom, tap to select, then Apply. Undo removes the latest event; Reset restores geometry and appearance. Up to twelve events per session. Only view/tool/intensity settings persist.

## Build
Node 22.14.0 or compatible Node >=22.12. `npm ci`, `npm test`, `npm run build`. Open using Vite (`npm run dev`); do not open index.html directly as a file. All runtime assets are bundled; no CDN/backend/accounts/analytics.

Android: `node scripts/bundle-android.mjs`, then Java 17, Gradle 8.10.2, Android SDK 35/build-tools 35.0.0: `gradle --no-daemon -p android :app:assembleDebug`. GitHub workflow `impact-lab-core-apk.yml` performs packaging and bounded emulator checks. Package `com.andrefiker.impactlabcore`, version 1.0.0/code 1, Android 8+. Separate installation from old Impact Lab. No requested permissions.

The delivered build uses the Android debug certificate. No private key is committed. A future build made with a different key cannot update this installation in place. Session damage is intentionally not persistent; local settings survive restarts.

## Implementation and limits
Anatomy metadata, rendering, interaction and damage calculation are separated. Shared coordinates: X anatomical left, Y superior, Z anterior. Geometry is in meters for alignment; no real-world medical calibration is claimed. Actual two-sided mesh intersections are sorted and deduplicated, paired into tissue intervals, with thin skin boundaries and empty cavity gaps. Overlaps use the maximum fictional resistance, not an additive count of shells. Hidden/clipped layers still participate in calculations.

Blunt impact uses bounded local displacement and mottled discoloration, with depth falloff and local illustrative bone fissures. Projectile depth is an invented resistance budget and distance cap; only an actual skin exit produces an exit opening. Small closed inset patches line surface openings; capped section faces and a dark internal tract explain depth. This is not live mesh surgery, soft-body physics or an injury predictor. Bruises are visible immediately, with no healing timeline.

Known visual limits: simplified uniform cross-sections; stylized muscle fibers and organ surfaces; flat cropped neck/shoulder/pelvis faces; no vascular microstructure. The tract is an illustrative mark, not an embedded projectile. Extreme grazing/overlapping contacts are less convincing than the verified upper-chest examples. Section caps are triangulated per closed contour; complex nested cavities are simplified.

## Evidence and recovery
`npm test` exercises actual bundled geometry, side/visibility independence, path/exit rules, bounds, exact undo/reset and gestures. `scripts/acceptance.mjs` captures and checks the production build on 390×844, 360×640 and 844×390 viewports, including gesture separation, settings and exact canvas reset. Run with `PLAYWRIGHT_MODULE` and `CHROME_PATH` pointing to installed tools if defaults differ. `qa/browser-report.json` records the measured environment; screenshots are delivered separately.

Rollback to inspected anatomy: `53c556dd8bbb902562038bb9ef985367b3a9a99d`. Recovered interaction checkpoint: `450060ec77533807d632d00137f13496684036b9`. See `VERIFICATION.md` for current acceptance and Android status.

Application code: MIT (`LICENSE`). Anatomy: CC BY-SA 4.0, separate from code. See `CREDITS.md`, bundled upstream notice, `ASSET_PROCESSING.md`, and `RESEARCH.md`.
