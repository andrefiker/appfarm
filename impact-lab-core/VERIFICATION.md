# Verification — Impact Lab Physics 2.0.0

2026-09-29. This is an in-place offline update to package com.andrefiker.impactlabcore.next, versionCode 5. Prior 1.3 source/rollback: c6bbcac49971ccd3734b500701c0c2638b778227. Intermediate physics checkpoint: 2051abe5797118834086e5435c90190abc2c4f78.

## Three core acceptance checks

| Check | Status | Actual evidence and limit |
|---|---|---|
| Bone fracture | PASS for the bounded illustrative mechanism | Rib and skull triangles become separate displaced, raycastable fragments; topology and positions remain changed. Inspected anterior/oblique skeleton and head renders. Skull panel displacement is obvious; rib separation is clearer in oblique view. Not a validated stress/fracture model. |
| Anatomy-aware path reaction | PASS | An actual rib strike bends the path; adjacent gap remains straight. Normalized energy decreases, subsequent rays use displaced bones and changed local resistance. Recorded path shown by the teal inspection line. No weapon calibration. |
| Persistent post-event cutaway | PASS | Four plane modes and offset reveal current deformed/split geometry; inspected after repeated events and reload. Section caps share actual geometry and damage records. Complex head caps remain visually rough. |

These statuses do not imply forensic realism, a perfect head model or accepted physical-phone performance.

## System and browser testing

25 tests pass. Covered: intersection ordering/deduplication, shell/gap rules, visibility independence, actual anatomy left/right, missed contacts, bounded cumulative deformation, refit picking, blunt localization, actual exits, continuous path deflection, state-aware resistance, fracture geometry/collider changes, repeated events, exact undo/reset, sparse replay reproducibility including fracture vertices, versioned serialization, four section orientations, head events and gesture separation.

Production browser: no page/shader errors or external asset requests. Captured and inspected actual phone-size skin/muscle/bone/organ/cutaway evidence, rib/skull failure, rotated anatomy, repeated five/ten events, replay, section modes/offsets, event inspector, quality modes, small portrait and landscape. Repeated replay seeks match canvas bytes. Damage and latest replay reconstruct after reload. Quality changes leave saved simulation data identical. Blunt and projectile both exercised. Idle renderer stops. See qa/v2.0/browser-report.json, final-regression.json, stability-report.json and supplied screenshots.

## Measured performance — do not interpret as phone FPS

Node 24 Linux, 30 mixed-location events: simulation plus sparse capture median 83.34 ms, max 113.91 ms; first-five median 79.12 ms, last-five 99.57 ms. Four fragments / 172 anatomy meshes. Whole settled cutaway build 42.60 ms. Sparse replay CPU sample mean 9.72 ms; latest replay buffers 702,772 bytes. All vertices finite; reset exactly restores originals.

Chrome 138 / SwiftShader software rasterizer / Linux / 390×844 CSS, DPR2: bounded sustained damaged-cutaway orbit averaged Mobile 2.98 RAF FPS, Balanced 2.64, Ultra 1.95. Software rendering is still slow and does NOT pass a smooth-motion performance target. These figures are not measurements of Andre's phone. Browser ten-hit event processing was approximately 57–131 ms. Dynamic replay caps now rebuild only affected structures; unaffected anatomy uses a clean shader, damage shader sizes are bounded, and damaged regions have an early bounds test. Demand rendering freezes settled scenes. See raw reports for exact samples and final head-cutaway replay CPU timing.

## Android verification

CI packaging and local signing pending this source checkpoint. Same privately retained v2/v3 certificate as 1.2/1.3; no new signing identity or requested permissions. No emulator used. No physical-device test of 2.0; native installation/update, offline relaunch, background/resume and physical FPS remain untested. Browser persistence/offline-assets evidence is separate from native-device acceptance.

## Remaining limitations / explicitly deferred

Anchored local contact-node mechanics and constrained bone fragments, not full volumetric/FEM/rigid-body/fluid physics. Fragment-to-organ collision is not independently solved. Soft displacement capped locally; torn tissue uses shader openings with geometric lining and state-aware channel resistance. Bone response below failure is a stressed state, without a full elastic bending model. Fracture shapes are coarse local partitions; skull panels and cut faces are simplified. Existing neck seam, simple face and rough cranial/brain topology remain; no head/neck remesh this pass. Quality modes change resolution, not simulation; no AO/bloom/reflection stack. Only the most recent event has recorded replay. No projectile fragmentation was added. No realistic ammunition data, diagnostic metrics or injury predictions.
