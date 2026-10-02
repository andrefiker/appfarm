# Android release 1.1.0

Native offline Godot 4.4.1 release, built 2026-10-02.
Source branch: `primordia-android` in `andrefiker/appfarm`, under `primordia/`.
Rollback: `7091b1d9c6a9aca43989d9487c45a4784dd62603` (`primordia-v1`).

## Package

| Property | Verified value |
| --- | --- |
| File | Primordia-1.1.0-Android.apk |
| Bytes | 51,996,446 |
| SHA-256 | `77d7ffbced85d7b24654db820829262ae885f9c92d6ae5385e2e5f4b8ed2916d` |
| Package | `com.andrefiker.primordia` |
| Version | 1.1.0 / code 1 |
| ABIs | arm64-v8a, x86_64 |
| Minimum / target SDK | 21 / 34 |
| Graphics | OpenGL ES 3.0, compatibility renderer |
| Orientation | Landscape, immersive |
| Launcher | `com.godot.game.GodotApp` |
| Requested permissions | None; no Internet permission |
| Signature | RSA 3072; v1, v2 and v3 verified |
| Certificate SHA-256 | `cdec6027804b655af5ab0d547621f4f77524aed3a010228e5a5943e525a614c7` |
| Alignment | `zipalign -c -p 4` passes |
| Archive | CRC verified; both ABI libraries and 31 application asset entries included |

No keys, passwords, SDK paths or private data are committed. The signing key
backup is a separate private owner artifact. Preserve it for updates. This APK
is a direct-install release, not a Play Store publication.

## Verified behavior

- 31 core rules and save recovery checks: all pass.
- 25 mobile checks at 1280x640: all pass.
- 25 mobile checks at 960x480: all pass, repeated after correcting editor text.
- Five fresh-process phone launch/save checks: all pass.
- 16 desktop gameplay/editor regression checks: all pass.
- Visual review: phone title, gameplay, editor, index, lineage, map, pause,
  settings and mirrored controls. Long anatomy fits its editor area; traits
  and long adaptation labels fit without overlapping controls.
- Distinct touch IDs swim and activate primary/secondary abilities together.
  Dragging changes heading; cancellation and backgrounding clear movement.
- Natural feeding unlocks reproduction; the actual touch editor adds, rotates,
  resizes and commits anatomy. Descendants and ecosystem state survive a
  process restart. Phone QA does not inject reproduction resources.

The mobile rendering/input harness ran in native Linux Godot against the same
GDScript packaged in the APK, with generated screen-touch events for gameplay
and pointer events for menus/editor. Raw results and package checks are in
`docs/android-qa/`.

## Build and privacy

Use the standard prebuilt Android export template, OpenJDK 17, platform 34 and
build-tools 34.0.0. Enable Android texture imports. `tools/build_android.sh`
uses private signing environment variables; details are in the main README.
The game needs no network or downloaded content after installation. Saves and
settings live in Android private app data, with a last-good save backup.
Android backup is disabled. Uninstalling/clearing app data removes progress.

## Remaining device checks

Physical-phone performance, heat/battery, audio output and gesture/cutout behavior
have not been measured. The official Godot 4.4.1 ARM64 template uses 4 KiB ELF
load alignment; native 16 KiB page-size operation is not claimed for this build.
