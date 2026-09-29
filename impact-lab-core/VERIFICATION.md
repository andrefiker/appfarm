# Verification — 1.0.0 candidate, 2026-09-29

- SOURCE / WEB: production build succeeds; 13 actual-geometry and interaction-state tests pass.
- RENDERED: inspected undamaged front/side/back/three-quarter, muscle, skeleton, organs; blunt surface and muscle; repeated/rotated damage; projectile entry, rotated entry and capped internal path; reset; small-phone and landscape layouts.
- BROWSER: acceptance script passes with zero page/shader errors; all requests local to test origin. Tap/apply, miss, drag/pinch separation, undo, view changes, settings reload checked. Reset canvas is byte-identical to baseline.
- PERFORMANCE: Chrome 138 headless, Linux, SwiftShader software renderer, 390×844, DPR 1. Scripted orbit sampling (two requestAnimationFrames per sample): median 36.8 ms, p95 299.8 ms. This is not physical-phone FPS or a display-frame benchmark. Render-on-demand with approximately 30 Hz ceiling, DPR cap 1.5 and 12-event cap. Section/wound resources disposed on rebuild/reset; rendering pauses when hidden.
- ANDROID: wrapper and bounded build workflow prepared; package/emulator results pending. No physical device has been tested.

See README for remaining visual approximations. Original anatomy checkpoint is preserved; no prior Impact Lab package or data is modified.
