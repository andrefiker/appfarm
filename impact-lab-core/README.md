# Impact Lab: Core 4 — 1.3.0

Offline anatomical visualization toy. One adult head and torso, three fictional blunt intensities, one fictional projectile, five anatomical views. Drag to orbit, pinch to zoom, tap to select, then Apply. Undo removes the latest event; Reset restores geometry and appearance. Up to thirty events per session. Only view/tool/intensity settings persist.

## Build
Node 22.14.0 or compatible Node >=22.12. `npm ci`, `npm test`, `npm run build`. Open using Vite (`npm run dev`); do not open index.html directly as a file. All runtime assets are bundled; no CDN/backend/accounts/analytics.

Android: `node scripts/bundle-android.mjs`, then Java 17, Gradle 8.10.2, Android SDK 35/build-tools 35.0.0: `gradle --no-daemon -p android :app:assembleRelease`. GitHub workflow `impact-lab-core-apk.yml` performs packaging and structural verification only. Emulator diagnostics are manual-only and are not a delivery gate. Package `com.andrefiker.impactlabcore.next`, version 1.3.0/code 4, Android 8+. Separate installation from Impact Lab Core 1.0 and older Impact Lab; the old signing key is unavailable. No requested permissions.

The release APK is signed locally with a private AppFarm release certificate. The key is kept outside Git and must be retained for future updates. CI produces an unsigned package and never receives the private key. This package coexists with older installations whose debug keys were not retained. Session damage is intentionally not persistent.

## 1.3 visible tissue disruption
Internal damage now uses structure-specific lined openings and larger local discoloration, visible in isolated muscle, skeleton and organ views. Crossed bone has a bounded opening and branching fissure marks. Skin wounds grow further with repeated nearby shots. Penetration uses a stronger fictional budget; exits still require actual skin intersections. No real weapon performance is encoded. This release updates 1.2 in place using the same package and privately retained release certificate.

## 1.2 projectile and head pass
Repeated nearby shots enlarge the same lined entry wound, add surface-following blood trails, and strengthen the matching segmented internal track. Local tissue deformation and shader effects remain bounded; thirty events maximum. The original BodyParts3D 4.0 head, skull and brain are aligned with the existing torso; Torso/Head focus controls keep inspection practical. Effects are fictional visual approximations, not rifle ballistics or bleeding physiology.

## 1.1 responsiveness pass
Actual-mesh BVH picking/penetration, refitted after local deformation; changed-structure updates; cached, spatially pruned cutaway geometry; early-rejected and shared damage shader noise. Demand-only rendering sleeps when still and pauses when hidden. DPR is capped at 1.25, without a real-time shadow pass. Compact controls, stronger bruising, a front-view/zoom reset button, and return-to-camera after cutaway. Projectile mode hides irrelevant intensities. No new tools or infrastructure.

`qa/benchmark-before.json` and `qa/benchmark-after.json` record seven-sample CPU medians in the same Node 24 Linux container. These are not phone FPS.

## Implementation and limits
Anatomy metadata, rendering, interaction and damage calculation are separated. Shared coordinates: X anatomical left, Y superior, Z anterior. Geometry is in meters for alignment; no real-world medical calibration is claimed. Actual two-sided mesh intersections are sorted and deduplicated, paired into tissue intervals, with thin skin boundaries and empty cavity gaps. Overlaps use the maximum fictional resistance, not an additive count of shells. Hidden/clipped layers still participate in calculations.

Blunt impact uses bounded local displacement and mottled discoloration, with depth falloff and local illustrative bone fissures. Projectile depth is an invented resistance budget and distance cap; only an actual skin exit produces an exit opening. Small closed inset patches line surface openings; capped section faces and a dark internal tract explain depth. This is not live mesh surgery, soft-body physics or an injury predictor. Bruises are visible immediately, with no healing timeline.

Known visual limits: simplified uniform cross-sections; stylized muscle fibers and organ surfaces; visible neck transition, simplified eyes, rough cranial cutaway sections and flat cropped shoulder/pelvis faces; no vascular microstructure. The tract is an illustrative mark, not an embedded projectile. Extreme grazing/overlapping contacts are less convincing than the verified upper-chest examples. Section caps are triangulated per closed contour; complex nested cavities are simplified.

## Evidence and recovery
`npm test` exercises actual bundled geometry, side/visibility independence, path/exit rules, bounds, exact undo/reset and gestures. `scripts/acceptance.mjs` captures and checks the production build on 390×844, 360×640 and 844×390 viewports, including gesture separation, settings and exact canvas reset. Run with `PLAYWRIGHT_MODULE` and `CHROME_PATH` pointing to installed tools if defaults differ. `scripts/projectile-qa.mjs` adds the current projectile/head acceptance captures. `qa/v1.3/browser-report.json` records the measured environment; screenshots are delivered separately.

Rollback to inspected anatomy: `53c556dd8bbb902562038bb9ef985367b3a9a99d`. Recovered interaction checkpoint: `450060ec77533807d632d00137f13496684036b9`. See `VERIFICATION.md` for current acceptance and Android status.

Application code: MIT (`LICENSE`). Anatomy: CC BY-SA 4.0, separate from code. See `CREDITS.md`, bundled upstream notice, `ASSET_PROCESSING.md`, and `RESEARCH.md`.
