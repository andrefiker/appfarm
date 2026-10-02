# Primordia 1.0.0 — release evidence

Date: 2026-10-02. Windows x64. Godot 4.4.1 stable official, OpenGL compatibility rendering.

Source repository: `andrefiker/appfarm`, branch `primordia-v1`, directory `primordia/`.
Verified game-code commit: `8319c1bb03598a6d0e36408e34a82a9635f0d96b`.
First playable checkpoint / rollback: `411cc86d6c5a987d4105f9398200dd7ad62ed13c`.
Pre-project baseline: `00b33d9` (remove the isolated project directory to roll back its introduction; no other applications changed).

## Artifacts

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| Primordia-Windows-v1.0.0.zip | 33261083 | e53c99ae8808b2e5721efe46430a34f4309bd935eae1ac3ad6919265f7c2ed1e |
| Primordia-Setup-v1.0.0.exe | 23827013 | 831b91c1fdbc904b2b1ab8f12072a9cc44724bd9cc37659ded3f725b4c61bb3b |
| Primordia.exe | 97520128 | b493c1d53fb915f7805f360cfe42d1c3126e720dfc234a4b0f2feb99200f9a4b |
| Primordia.pck | 90464 | f35fbc4addaf0cfc9353b35c834911b7c9d58971dc16e1ef0a5ecfc1ef87631d |

The portable ZIP contains the executable, game pack, player README and Godot/third-party license notices. ZIP CRC verification passed, and its embedded PCK matches the tested PCK byte for byte. PE headers identify the game executable as x86-64. NSIS setup compiles without warnings and requests only per-user privileges. Both binaries are unsigned.

## Actually run and visually inspected

- Godot source ran with rendered UI in a virtual X11 display, Mesa llvmpipe.
- The exported **Windows executable** ran under Wine 9, with the actual production PCK.
- 16 scripted interaction checks passed: title, new organism, physical-key movement, primary ability, natural feeding to reproduction, editor entry, structure placement and resizing, mature-body canvas bounds, reproduction, retained anatomy, species index, lineage, map and saving.
- 9 checks passed across a separate Windows process launch: save presence, Continue, generation, genome, ecosystem, position, fullscreen, windowed mode and pause.
- Screenshots of title, swimming, editor, offspring, species, lineage, map, pause, resumed play and fullscreen were inspected. Editor controls fit at 1280 × 800; mature anatomy scales to the available canvas.
- Direct external window input was also used to continue a saved Windows game, swim in two directions and burst; the resulting gameplay screen was inspected.
- All gameplay assets are local or procedurally generated. No server, dev-server URL, HTTP client, analytics or login exists in the game scripts. No network account was used for gameplay.

## Deterministic / simulation evidence

- **31 rules and persistence checks passed**. Includes costs, invalid genomes, trait tradeoffs, damage, reproduction boundaries, seeded species, selection under hunting pressure, predator decline without prey, events, diversification, swimming, feeding, save roundtrip, backup recovery and lineage survival.
- **600 simulated seconds** of the actual ecosystem loop at 30 simulation steps/second passed: 18 player generations, zero deaths for the automated forager, 74 regional updates, 12 species, maximum 85 active organisms and 710 food particles. All state remained finite and within limits.
- The ten-minute headless run averaged about **2.52 ms per simulation step** in this build environment. This is simulation timing, not a frame-rate claim for Andre's laptop. Rendered Windows QA also used software graphics and ran while packaging work was active.
- Exact result JSON and the rules-test output are in `docs/qa/`.

## Bounded improvement passes retained

1. Made title/editor backgrounds quieter; corrected the test harness's window-to-canvas input scaling, then reran the full interaction flow.
2. Staggered NPC food contact checks instead of scanning every particle every physics tick.
3. Spread initial nutrients over area, added subtle player and selected-part markers, and verified natural first reproduction.
4. Fitted mature bodies and thumbnails to their canvases, made trait previews include offspring growth, and gave cold currents actual movement/metabolic/population effects.
5. Direct play revealed food depletion and overlapping grazers. Phototrophs now live on light, fixed habitat patches replenish to a cap, and soft separation prevents piles. The ten-minute simulation and Windows loop passed afterward.

Packaging repairs were confined to matching export templates and NSIS uninstall-path quoting. Audio players are explicitly stopped on exit. The quality loop stopped after five useful gameplay/presentation passes rather than adding low-value content to reach ten.

## Limits of verification

- No physical Windows 10/11 PC, integrated-GPU benchmark or audible speaker test was available. Windows runtime evidence is from Wine with dummy audio.
- The optional setup executable was built and checked structurally, **not install-tested**. Wine could launch the x64 game, but the 32-bit NSIS installer could not launch: the initial Wine profile lacked WoW64 DLLs, and the environment rejected the installed 32-bit Linux Wine loader with an executable-format error. The tested portable ZIP is the direct launch route.
- Some Wine/Godot shutdown runs emit an ObjectDB/audio-resource cleanup warning after all assertions pass. No script errors or state loss were seen during gameplay. This remains a compatibility-environment limitation to check on a physical Windows PC.
- This is the bounded first release described in README.md, not an implementation of every optional example in the original ambition brief. The ecology is a game model, the player ancestry screen follows one surviving branch, and body/world complexity is capped.

No paid infrastructure, public hosting, telemetry, Android package, external account or unrelated AppFarm change was introduced. Windows was explicitly the requested finish line.
