# Verification — Core+ 1.1.0, 2026-09-29

SOURCE / WEB verified: production build and 14 actual-geometry/interaction tests pass. BVH intersections match unaccelerated triangle scans, including face anchors after deformation/refit. Undo/reset restore exact geometry.

Rendered browser acceptance: actual 390×844, 360×640 and 844×390 screenshots; undamaged skin front/side/back/three-quarter, muscle, skeleton and organs; blunt surface/internal/repeated/rotated damage; projectile entry/internal path/rotation; reset. Zero page/shader errors, local assets only. Drag/pinch do not apply impacts. Canvas reset matches baseline byte for byte. Settings survive reload; session damage restarts intact.

Resilience checks: rotated/zoomed picking and apply work; four cutaway cycles keep GPU geometry count at 225. Idle render count stays at 13 across a 500 ms observation. Missing anatomy produces a loading error. Home view works; Projectile hides intensity controls.

## Measured CPU costs
Same Node 24 Linux container, same anatomy and contact, median of seven samples. These are CPU operation timings, **not phone FPS**. Baseline is dccdcf1 (1.0 source); raw measurements and reproducible benchmark are included.

| Operation | Before | After |
| --- | ---: | ---: |
| Pick contact | 14.67 ms | 0.22 ms |
| Calculate blunt event | 95.41 ms | 2.16 ms |
| Deform affected anatomy | 22.69 ms | 25.09 ms |
| Construct cutaway | 43.20 ms | 13.36 ms |
| Reopen unchanged cutaway | 45.18 ms | 0.04 ms |

Rendering: Chrome 138 headless / SwiftShader software renderer / Linux / DPR 1. GPU hardware speed is not measured. Demand-only rendering; DPR cap 1.25; no real-time shadow pass; local shader noise computed once only near a lesion. No Android emulator used for this release.

## Android status
APK BUILT / PACKAGE VERIFIED. GitHub Actions run 36568549017 succeeded on the first attempt, including package/version, zero requested permissions and v2 signature checks. Downloaded APK: 5,603,951 bytes; SHA256 `7aeabcdddb6acaf7b2b16ee99b2a71ae44fc6f68b09ff1ca2ebbef231d0f661d`. All ten bundled files match the build manifest and browser-tested production byte for byte. Debug-signed; no private key committed. APK source commit `774de4e4a426d8e0f54a53f138f5abeebb827855`. See `qa/apk-report.json`. Package `com.andrefiker.impactlabcore.fast`, version 1.1.0/code 2, label Impact Lab Core+. Separate installation because the 1.0 signing key is unavailable. No requested permissions; local assets served inside WebView; no development server.

Andre's supplied physical-phone screenshot establishes that **1.0 renders anatomy on his phone**. It does not establish performance, resume/offline relaunch, or 1.1 device acceptance. This release has not been physically device-tested. Native lifecycle behavior remains to be checked on a phone.

## Remaining visual approximations
Simplified solid section faces, stylized organs/fibers, flat cropped neck/shoulder/pelvis boundaries. Extreme grazing/overlapping lesions remain less convincing than front chest examples. Internal track is an illustrative tract. Damage intensity/resistance are fictional; anatomy is a cropped licensed atlas, not a medical injury model.

Rollback: dccdcf1ed3b9cc8ad69dfdf209582e2a9abfcae0 (last 1.0 source/docs); previous APK source 1520d6c1fab67b91b4fc852a166681460ddccf17. Older APK/data are preserved.
