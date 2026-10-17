# TRAJECTORY Implementation Plan

Goal: deliver APK + complete source + reproducible tests.
Architecture: shared pure simulation, renderer, controller, audio, persistence, Android shell.
Spec: DESIGN.md and André's implementation brief.
Global constraints: com.andrefiker.trajectory, 1.0.0/code 1, portrait, offline, left-handed default, no costs/production changes, scoped branch only.

1. Engine — web/src/physics.js, terrain.js, weapons.js, ai.js, challenges.js, game.js. Write and run failing Node tests; implement deterministic integration, swept collision, craters, settling, damage, three weapons, bounded AI solver and 15 validated scenarios; pass tests and checkpoint.
2. Product — web/src/{render,audio,storage,main}.js, web/index.html, style.css. Write persistence/scoring tests first. Build title, three modes, tutorial, touch deck, settings, pause/results and progress. Test browser controls, render readability, background/resume, offline requests and rapid restart; repair then checkpoint.
3. Package — Android WebView and app icon, production copy tool, isolated CI workflow. Java 17, SDK 35, Gradle 8.10.2/AGP 8.7.3. Build locally if tooling downloadable, otherwise sanitized branch CI. Inspect package/version, signatures, alignment, permissions, local assets and checksum. Preserve signing continuity information. Commit state, source, evidence and deliver actual APK.

Review focus: small viewport controls; background during AI/flight; malformed storage; cluster damage and collision; all challenge moving-target solutions. Whole-branch review after QA. No merge or deployment.
