# Verification — Impact Lab Core 3 / 1.2.0

2026-09-29. SOURCE / WEB tested: 17 actual-geometry and interaction tests pass; TypeScript and Vite production build pass.

Actual production renders inspected at phone size: skin, head front/side, skull/brain, torso projectile surface/muscle/cutaway, one/six/thirty shots, rotated damage, reset, small phone and landscape. Zero browser/shader errors; offline assets only; reset canvas byte-identical to baseline. See qa/v1.2/browser-report.json and scripts/projectile-qa.mjs. Prior gesture/picking/state tests remain in the suite.

Repeated local shots expand one lined lesion and matching internal involvement. Six-shot entry radius 0.01633 versus 0.0085 initially, in model coordinates; these are fictional graphics parameters. Thirty-shot bound passes. CPU apply median 36.2 ms, maximum 56.9 ms in Chrome 138, SwiftShader software rendering, Linux, 390×844 DPR1. These are NOT phone FPS. Idle frame count remains 68 across the observation; reset releases damage resources (176 to 172 geometries).

## Visual limits
Projectile graphics visibly improve on the tiny previous mark, with depth, restrained trails and matching internal paths. No fluid, finite-element or validated ballistics simulation. Head added from licensed original BodyParts3D; neck transition remains visible, eyes are simplified, cranial cutaway sections can look fragmented. Combined skin has small nonmanifold neck joins; extreme neck/grazing contacts are not fully accepted. Do not claim the head passed the complete anatomy quality gate. Nineteen cranial structures are watertight after processing; recipe and provenance retained.

## Android
Packaging checkpoint: com.andrefiker.impactlabcore.next, 1.2.0/code 3, label Impact Lab Core 3. Separate installation preserves older apps. CI packages without emulator; signing occurs locally with retained private certificate. APK BUILT / PACKAGE VERIFIED. First CI attempt passed (run 36577005538). Source commit 40c6d052c85abd473b3f14b329ef803dfce8da67. Signed v2/v3 with retained RSA3072 release certificate; SHA256 2af052d855838281f92ee60a64efb39fc9f812b9abd1c02adeae0f2653a0efac. Size 9,778,968 bytes. All fourteen bundled files exactly match tested production and build-manifest hashes. Correct package/version/launch activity; no requested permissions. See qa/v1.2/apk-report.json. No emulator or physical-device testing for this release. Offline native relaunch, resume and phone performance remain untested. Andre's screenshot establishes older-version rendering only.

Rollback: d1b74dac2f35ebd44c4ac20e71dc40dfe3d888f3. Prior APK source: 774de4e4a426d8e0f54a53f138f5abeebb827855. Older APKs/data preserved.
