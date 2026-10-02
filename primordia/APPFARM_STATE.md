# Primordia state

Version 1.0.0, Windows x64, Godot 4.4.1 stable. Branch `primordia-v1`.
Game-code commit: `8319c1bb03598a6d0e36408e34a82a9635f0d96b`.
Rollback checkpoint: `411cc86d6c5a987d4105f9398200dd7ad62ed13c`.

Built: `build/Primordia/Primordia.exe` + `Primordia.pck`, portable ZIP, per-user NSIS installer.
Game executable: PE x64, unsigned. Portable game launched and played under Wine.
Validation: 31 rules/save tests, 16 rendered gameplay/editor checks, 9 separate-process save/display checks, ten-minute ecosystem simulation.
Installer: compiles without warnings; installation not verified because 32-bit Wine cannot run in this kernel environment. Physical Windows/device testing and audible sound remain unverified.

Complete release hashes, evidence and limitations: `docs/RELEASE.md`.
Build instructions and controls: `README.md`.

Future Ghost: preserve the local save schema and backup fallback. Inspect real play before adding systems. Priorities for a next pass would be physical-PC feel/performance feedback, more legible biome identity and longer-session ecological balance. Do not add services or rewrite the working Godot game to address packaging.

This state note intentionally stays in `primordia/`: the task restricted writes to that project directory.
