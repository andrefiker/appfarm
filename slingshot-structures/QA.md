# Verification — 1.0.0

## Passed

- 19 automated engine tests, including exact preview/free-flight agreement, launch limits, near-vertical shots, gravity, collisions, momentum, offset-body rotation, material thresholds, unique destruction, natural support collapse, objectives, shot lock/counting, loss, retry during collapse, scoring, records, save corruption/restoration and persistence.
- Every Classic level starts stable, remains stable after waking for seven seconds without a shot, and has a sampled one-shot physical solution. Exact sampled angles/powers are in validation.json. This is automated simulation coverage, not a claim that every level was manually played.
- 100-body simultaneous-contact stress: positions remain finite; the turn resolves within its bound, destruction does not exceed the original count.
- Browser gameplay with real CDP touch events at 390 × 844: drag/release, preview, second-finger cancel, rapid input lock, level 1 completion, score/unlock/result, reload persistence, interrupted-collapse rollback with refunded ammo.
- Mirrored touch completion of barrier level 20, and corbel-arch level 24 completion; Classic, Minimal and Dark Lab appearances inspected.
- Endless stability/solution gate, seed 43210 loading and reproducible restoration.
- Sandbox touch placement, saved design, reload and undo.
- Portrait layouts at 320 × 640, 360 × 740, 390 × 844 and 540 × 960; footer remains on-screen.
- Offline file-bundle play; browser context had networking disabled. No JavaScript runtime errors.
- Android pause event sets the paused state. Native wrapper pauses WebView timers.
- Local Android APK build, package/version/portrait/activity/permission/asset/signature and ZIP alignment checks.

Browser extension control was not exposed in the available tool registry. QA used local Playwright with Chrome headless shell. The regular Chrome binary failed because its process-singleton socket was blocked; headless shell worked. These are desktop-browser touch-emulation tests, not Android device tests.

## Not verified on hardware

No emulator or physical Android device was connected (`adb devices` was empty), and no /dev/kvm was available. APK install/launch, Android-specific touch feel, WebView audio/haptic behavior, background/resume on an actual device, and physical-device FPS/battery behavior remain untested. The APK is built and structurally verified; it is not represented as device-tested.

## Design boundaries

One consistent core-displacement objective is used throughout. Six procedural structural families are used, rather than an unconstrained building generator. The physics solver is deterministic for the same engine and inputs; cross-engine/runtime floating-point bit identity is not promised. Score prioritization differs intentionally between Precision and the other modes. Turn boundaries freeze residual physics, clear prior projectiles, and preserve a recoverable checkpoint rather than an approximate live replay.
