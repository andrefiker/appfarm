# Verification — 1.0.0 candidate, 2026-09-29

- SOURCE / WEB: production build succeeds; 13 actual-geometry and interaction-state tests pass.
- RENDERED: inspected undamaged front/side/back/three-quarter, muscle, skeleton, organs; blunt surface and muscle; repeated/rotated damage; projectile entry, rotated entry and capped internal path; reset; small-phone and landscape layouts.
- BROWSER: acceptance script passes with zero page/shader errors; all requests local to test origin. Tap/apply, miss, drag/pinch separation, undo, view changes, settings reload checked. Reset canvas is byte-identical to baseline.
- PERFORMANCE: Chrome 138 headless, Linux, SwiftShader software renderer, 390×844, DPR 1. Scripted orbit sampling (two requestAnimationFrames per sample): median 36.8 ms, p95 299.8 ms. This is not physical-phone FPS or a display-frame benchmark. Render-on-demand with approximately 30 Hz ceiling, DPR cap 1.5 and 12-event cap. Section/wound resources disposed on rebuild/reset; rendering pauses when hidden.
- ANDROID PACKAGE VERIFIED: GitHub Actions run 36565972980 built the APK and passed aapt package/version/zero-permission checks and apksigner verification. Downloaded APK SHA256 e21f38c107281cba23efc12b599f5dd67205263eecc963d93045fbfe39ac8382; 5,580,999 bytes. All 9 bundled files match both the build manifest and locally tested production output. Debug signed; source commit 1520d6c1fab67b91b4fc852a166681460ddccf17. Initial emulator run installed/launched and exercised one impact, then timed out during projectile/cutaway evaluation. DevTools captures showed blank anatomy; capture-vs-rendering cause remains unresolved. Android visual acceptance, resume and offline relaunch are NOT verified. Diagnostic run 36566694511 was still active when Andre requested stopping this route; no further emulator wait/retry is a delivery gate. No physical device tested.

See README for remaining visual approximations. Original anatomy checkpoint is preserved; no prior Impact Lab package or data is modified.

Additional browser checks: picking/applying after rotated zoom succeeds; four cutaway cycles hold GPU geometry count at 225; a missing GLB produces the explicit loading-error message.

Delivery route after Andre's instruction: verified signed package plus matching tested production assets and actual browser renders. Physical-phone rendering remains a distinct open check. The APK is a test candidate, not a fully Android-accepted release.
