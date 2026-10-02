# Primordia 1.1.0

An original, offline Android and Windows evolution sandbox. Godot 4.4.1, GDScript, OpenGL compatibility renderer. No login, backend, telemetry, web service or downloaded assets.

## Android phone

Install `Primordia-1.1.0-Android.apk`. It is a signed ARM64 + x86_64 build, with Android API 21 minimum and an OpenGL ES 3.0 requirement. It runs in landscape, offline. The default left-handed layout places the swim pad on the right and ability buttons on the left; Settings can mirror them. Two fingers can swim and activate an ability simultaneously. Menus and the evolution editor have dedicated touch layouts. Android Back navigates menus and pauses gameplay; backgrounding saves and clears held touches.

Saves are private app data, with the same checksum and backup recovery as the desktop game. Uninstalling or clearing app data deletes progress. Updates must use the same package ID and private release key. See `docs/ANDROID_README.txt` for controls and `docs/ANDROID_RELEASE.md` for package details, evidence and remaining device checks.

To build, install Godot **4.4.1 stable**, the complete matching Android export templates, OpenJDK 17, Android SDK platform 34, build-tools 34.0.0 and platform-tools. In Godot Editor Settings > Export > Android, set the Java SDK and Android SDK paths. The standard prebuilt-template exporter is used; Gradle, the NDK and a network service are unnecessary. Android texture import is enabled in the project.

Set the following environment variables privately, then run `bash tools/build_android.sh` (set `GODOT_BIN` if Godot is not on PATH):

- `GODOT_ANDROID_KEYSTORE_RELEASE_PATH`: release keystore path.
- `GODOT_ANDROID_KEYSTORE_RELEASE_USER`: key alias.
- `GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD`: key password.

The private release key is supplied separately to the app owner. Never commit it or its password. A new key will not update installations signed with the original key. Increment `version/code` for subsequent releases.

Phone-layout QA on a desktop rendering display:

```sh
godot --path . --resolution 1280x640 -- --mobile --qa-mobile
godot --path . --resolution 960x480 -- --mobile --qa-mobile
godot --path . --resolution 960x480 -- --mobile --qa-mobile --qa-mobile-resume
```

Use an isolated profile/XDG data directory: QA exercises the real save slot. Evidence goes to `user://mobile-qa`. The Android release excludes the QA scripts.

## Windows play

Run the setup executable, or extract the entire portable ZIP and run `Primordia.exe`. Keep `Primordia.pck` next to it. Windows 10/11 x64 with OpenGL 3.3 support. No administrator access is needed. This independent build is not Authenticode signed.

WASD / arrows swim. Mouse orients the body. Space bursts, or bites with a jaw. Shift escapes, discharges a toxin vesicle, or attaches an anchoring hook to a nearby larger host. Move to detach. E opens evolution when energy is at least 60, mutation is at least 18, and the previous membrane has settled. I opens observed species, L ancestry, M the habitat map. Escape pauses. F11 switches fullscreen. Mouse aiming can be disabled in Settings.

Golden particles feed you automatically on contact. A filter crown attracts nearby nutrients. Orange remains are carrion. Chloroplasts produce energy in light; symbiotic chambers cooperate with peaceful hosts. Energy also powers movement, regeneration and abilities. Losing a life preserves established anatomy but loses 35% of loose mutation.

In the editor, select a structure in the scrollable palette and click by the membrane. Drag its attachment point to reposition it. The right panel rotates, resizes and removes the selected structure. Symmetry duplicates newly placed structures; existing parts can be moved individually. Body buttons adjust proportions. Pigment and pattern are free. Live traits show the consequences. A history-influenced adaptation discounts one newly added structure. Overspending prevents reproduction. Cancel discards the draft.

## What is implemented

- Ten starting species, with bounded diversification to sixteen.
- Six connected habitats in an 8400 × 6400 world.
- Fifteen anatomical structures with costs, physical placement and derived traits.
- Nutrient grazing, directional biting, carrion, poison, attachment, light harvesting and cooperation.
- Near physics, reduced-frequency medium simulation and regional population simulation. Active bodies are bounded; replacements materialize outside the viewport against a regional population budget.
- Inherited prey speed under hunting pressure; predator attack adaptation to regional defenses; population decline without prey; variants and extinction.
- Fixed nutrient patches with capped renewal, resource blooms, resource collapse, cold currents, toxic blooms and temporary darkness. This is an intentionally simplified ecology, not a biological research model.
- Procedural animated membranes, internal organelles and appendages; synthesized local audio.
- Local autosave with checksum, temporary-file validation and a last-good backup. Settings and world/lineage data persist locally.

The player follows one surviving ancestral branch. NPC variants retain parent links. This first release has no multicellular/land stages, freeform mesh sculpting, simulated fluid dynamics, or unlimited global organism physics. Size grows slowly through reproduction and is capped.

## Saves

Windows: `%APPDATA%\Godot\app_userdata\Primordia\`. `lineage.save`, `lineage.save.bak`, and `settings.cfg`. The installer does not remove saves when uninstalling. To keep a separate lineage, copy this directory while the game is closed. A failed/corrupt primary save falls back to the last good backup.

## Build and test

Install Godot **4.4.1 stable** and its matching official export templates. Open `project.godot`. Import first, then run:

```sh
godot --headless --path . --editor --import --quit
godot --headless --path . --script tests/rules_test.gd
godot --headless --path . --script tests/ecosystem_soak.gd
godot --path . -- --qa
godot --path . -- --qa-resume
mkdir -p build/Primordia
godot --headless --path . --export-release "Windows Desktop" build/Primordia/Primordia.exe
```

QA flags use the real local save slot; run them in an isolated OS profile or set isolated XDG directories on Linux. They generate screenshots and JSON in `user://qa`. Release builds include this opt-in harness for reproducible verification.

Copy `docs/PLAYER_README.txt` and `LICENSES.txt` into the portable folder as `README.txt` and `LICENSES.txt`. Run `makensis installer.nsi` for a per-user installer. Package the entire `build/Primordia` directory as a ZIP. See `docs/RELEASE.md` for exact validation evidence and limitations.

All project changes belong inside `primordia/`. Other AppFarm applications are untouched.
