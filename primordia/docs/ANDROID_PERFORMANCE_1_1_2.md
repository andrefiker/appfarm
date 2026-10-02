# Android performance update 1.1.2

This update retains package `com.andrefiker.primordia`, the same release
certificate and save schema. Version code 3 installs over 1.1.0 or 1.1.1
without clearing app data.

The Android render target is now 960x480 instead of 1440x720. UI geometry and
touch targets keep their previous size because both are scaled together; the
world camera compensates for the viewport change. Rendering at 960x480 trades
some visual sharpness for speed and lower graphics work. Animated background
elements and NPC body details redraw at 15 Hz; the player redraws at 30 Hz,
while touch events and player movement continue to process at 60 Hz. Offscreen
NPC timestep accounting was corrected for the existing reduced-frequency
simulation. Windows rendering and controls use their original scale.

## Host measurement

In an isolated Godot 4.4.1 software-rendered Xvfb session, the same
`tests/performance_probe.gd` sampled 600 manual simulation ticks, 45 warmup
frames and 150 rendered frames at a 1920x960 window using `--mobile`.
Both captures used the same machine and engine. The procedurally populated
scene varied slightly between runs (about 68-69 agents, 622-643 food items).

| Metric | 1.1.1 | 1.1.2 |
| --- | ---: | ---: |
| Frames per second | 24.28 | 38.30 |
| Average frame interval | 41.19 ms | 26.11 ms |
| 95th-percentile frame interval | 61.38 ms | 36.87 ms |

The 1.1.2 capture preceded a timestep correction for medium-distance NPCs and
the version-number update; neither changes the render resolution or redraw
rate. This is a relative comparison on a host CPU renderer, not a measured FPS
or battery estimate on an Android phone. Andre reported that 1.1.1 still felt
heavy on his Poco X7 Pro; the phone cannot be profiled from this environment.

## Regression evidence

- 25 mobile gameplay and touch checks passed at 960x480 and at 1280x640.
- Five separate-process mobile save-resume checks passed at 1280x640.
- 31 rules/save checks and 16 desktop interaction checks passed.
- The screenshots in the source archive show the title, gameplay and editor
  at the lower render resolution.

The Android release uses the standard Godot 4.4.1 ARM64 and x86_64 templates.
The signed `Primordia-1.1.2-Android.apk` is 51,996,446 bytes, SHA-256
`28d1b2374739abe2ce1bd461533b104ee33f71e064415dc55f2959c81f2eec48`.
Android package version is 1.1.2 / code 3, minimum API 21 and target API 34.
It requests no permissions. `apksigner` verified v1, v2 and v3 schemes, and
the certificate SHA-256
`cdec6027804b655af5ab0d547621f4f77524aed3a010228e5a5943e525a614c7`
matches version 1.1.1. `zipalign -c -p 4` and the ZIP CRC check passed.
The earlier release's evidence remains in `docs/ANDROID_PERFORMANCE_1_1_1.md`
and `docs/ANDROID_RELEASE.md`.
