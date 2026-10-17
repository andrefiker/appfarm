# TRAJECTORY 1.0.0

Goal: a fair, readable, offline pocket artillery game with deliberate shots and quick restarts.
Binding brief: André's TRAJECTORY implementation request, 2026-10-17.
Architecture: dependency-free ES modules, Canvas 2D renderer and DOM touch controls; a minimal Java WebView bundles the production tree. No backend or network access.

Coordinates: 1000 by 600 world, x right, y down. Gravity 100 world units/s²; wind is horizontal acceleration. Exact constant-acceleration integration at 1/120 s with swept samples no farther than 2 world units. Heightfield terrain sampled every 2 units; circular excavation removes only ground. Units settle to the highest support under their footprint. AI evaluates the same simulation, adds seeded difficulty error and improves its estimate after each shot.

Modes: quick duel (three difficulties), five-target practice rounds (optional full guide), fifteen authored challenges including wind, elevation, walls, narrow/moving targets and fog. Fixed seeds and bounded solver checks prove reachability. Three weapons: standard, slow heavy, apex-splitting cluster. Duel has no hidden physics or unlimited trajectory preview.

Visual system: procedural atmospheric dusk, navy surfaces, rust/ochre hills, pale typography, amber player shots, coral rival. Procedural art intentionally follows the user's lightweight art requirement. Portrait HUD + battlefield + bottom controls. Left FIRE default, reversible in settings. Sliders plus 1-unit step buttons, keyboard and battlefield drag aiming. System fonts keep the bundle self-contained.

Persistence: versioned validated local JSON, counters, achievements, practice record, challenge stars and settings. Bad/missing/unavailable storage falls back safely. Background pauses the simulation and sound; resuming requires deliberate input. Native bars/insets remain safe.

Verification: Node tests for physics, collisions, damage/settling, weapons, AI, terrain seeds, all challenges, scoring, persistence and replay; browser touch gameplay at small/tall phone sizes and offline checks; APK package/signature/alignment/assets/permissions verification. Device testing reported only if actually performed.
