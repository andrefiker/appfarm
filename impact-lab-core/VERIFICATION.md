# Gel Exhibition 2.2.0 — verification

2026-09-29. Gel-only product UI with Pistol, Rifle and Shotgun fictional profiles. Default ¼-speed shot animation; 1×/0.05×, pause/resume, scrub, step, orbit/zoom, whole-shot undo and reset. Package com.andrefiker.impactlabcore.next, code 7; rollback 47ceccb479e150bb25c99dffc8706ef86720edd9 (2.1.0).

34 deterministic tests pass, including actual anatomy traversal differences between profiles, independent scatter contacts, event-group persistence, recorded path sampling, progressive cavity arrival, stable repeated seeks, prior-channel retention, resource disposal and wall-time replay. Existing fracture, state, miss, gesture, reset and intersection tests remain passing. The old test's opaque-skin visibility expectation was updated for the gel exhibition.

Browser QA uses the production bundle in Chrome138 / SwiftShader Linux / 390×844 DPR1. See qa/v2.2/browser-report.json for final results: all three styles, three separate pellet paths, byte-identical repeated replay frames, whole-group undo/reload, repeated scatter, head interaction, quality-state equality, actual pause/scrub/resume controls, reset, small portrait and landscape. No page/shader errors or external asset requests. Screenshots are actual rendered views. Their anatomy/entry/motion/cavity states were inspected at phone size.

The temporary cavity uses a contrasting cool tint and see-through depth overlay during replay; embedded organs fade so the motion remains legible. Settled cavities return to normal depth testing. This is a deliberate exhibition convention, not an optically accurate prediction. Geometry/ray intersections remain stateful and independent of the presentation. The staged arrival/expansion/collapse timing and all profile values are fictional. Three pellets represent the shotgun class, not any real load. Older head/neck seam and skull banding remain.

Event processing measurements and endpoints are retained in the browser report. No physical-phone FPS claim; no emulator used. APK BUILT / PACKAGE VERIFIED: CI 36590317747 succeeded first run. Source 8792e9fcbda88550577f2d39468016f114c9a5c8. Correct package/version/launcher, zero permissions, v2/v3 signature with retained certificate, aligned stored entries, all 14 bundled files byte-identical to tested production. SHA256 c11a2e4f3b0c35a96331552acb58dfd835835b60a51f2b2aa12a367ef1acac9f. See qa/v2.2/apk-report.json. Native installation/offline relaunch/resume on a physical phone remains untested here.

---

## Earlier release verification

# Verification — Impact Lab Gel 2.1.0

2026-09-29. Package com.andrefiker.impactlabcore.next, versionCode 6. Rollback: 0a727de6d12e1644d7d595c4d5583dfc93063bc4 (2.0.0). This update changes the default presentation to a synthetic amber gel specimen; it does not claim calibrated gelatin physics.

29 automated tests pass. Includes original anatomy/path/bone/persistence tests plus continuous host resistance, weakened previous channels, merged cavity bends, bounded replay and disposal, and rendering-independent entry/exit queries. Initial transparency regression was caught and repaired: visual face discard no longer removes physics backfaces.

Actual browser renders inspected at phone size: intact front/back/head, oblique repeated events, temporary cavity, persistent section, baseline reset. Browser suite also exercised four section modes, five/ten repeated events, head/abdomen, quality state equivalence, small portrait and landscape. Final production regression passed: five events, one retained bone fragment, six merged channel segments, deterministic gel replay image bytes, reload, undo, reset and zero page/shader errors or external asset requests. Reports/screenshots in qa/v2.1. browser-report.json is the broader pre-final visual regression; final-report.json covers the final host-medium and material refinements.

Three inherited acceptance mechanisms remain working: **bone fracture PASS**, **anatomy-aware path reaction PASS**, **persistent post-event cutaway PASS** for the bounded illustrative implementation. Gel cavities follow recorded bent paths and stops. Their temporary radial expansion is a deterministic visual envelope, not solved fluid dynamics.

Performance: final Chrome138/SwiftShader Linux, 390×844 DPR1, five events took 125.2, 71.8, 89.8, 67.3 and 59.0 ms CPU for event processing. Intact gel scene used 144 geometry allocations and two textures. Short RAF samples were misleadingly near 60 Hz; completed-frame probes varied widely (approximately 1.5–60), so they are **not accepted as a steady FPS measurement**. Software rendering remains slow; no phone speedup or physical-device FPS is claimed. Raw timing samples remain available in performance.json. No emulator used.

Remaining visual limits: stylized material rather than accurate volume refraction; head/skull banding and neck seam are visible in close-up; coarse local bone pieces and entry rims; opaque organ inserts can hide a channel until sectioned. No full gel fluid/elastic-volume solver. No new commercial assets or clinical images. Current working anatomy, source licenses and signing identity retained.

Android: **APK BUILT / PACKAGE VERIFIED**. First CI run 36587343865 succeeded. Source 2d4f6efccb856e5cf17d164a7016a7c131a31ddd. Version/package/launcher, zero permissions, stored-entry alignment and v2/v3 signature verified. Same update certificate; all 14 bundled files match the browser-tested production build byte for byte. SHA256 2b1ec955f5e85000ed612359edf7128b20aaa827d68b3f44d61a6ad470b1e71a. Physical-device installation, offline relaunch/resume and actual phone performance remain untested in this environment.

---

## Previous release record

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

APK BUILT / PACKAGE VERIFIED: first CI run 36583553583 passed, source 033c27bfe5ee784dca5fb79c4eacbf003ebce1c5. Signed APK SHA256 d6516ccda5d11c509b3e0391e3e69d0c2f3fa918b9fc9f9998253d28c5dbd843, 9787160 bytes. All fourteen bundled production files match browser-tested assets byte for byte. Correct package/version/launcher, zero permissions, four-byte-aligned stored entries, v2/v3 signature. Same package/certificate as 1.3; versionCode increased 4→5. Same privately retained v2/v3 certificate as 1.2/1.3; no new signing identity or requested permissions. No emulator used. No physical-device test of 2.0; native installation/update, offline relaunch, background/resume and physical FPS remain untested. Browser persistence/offline-assets evidence is separate from native-device acceptance.

## Remaining limitations / explicitly deferred

Anchored local contact-node mechanics and constrained bone fragments, not full volumetric/FEM/rigid-body/fluid physics. Fragment-to-organ collision is not independently solved. Soft displacement capped locally; torn tissue uses shader openings with geometric lining and state-aware channel resistance. Bone response below failure is a stressed state, without a full elastic bending model. Fracture shapes are coarse local partitions; skull panels and cut faces are simplified. Existing neck seam, simple face and rough cranial/brain topology remain; no head/neck remesh this pass. Quality modes change resolution, not simulation; no AO/bloom/reflection stack. Only the most recent event has recorded replay. No projectile fragmentation was added. No realistic ammunition data, diagnostic metrics or injury predictions.
