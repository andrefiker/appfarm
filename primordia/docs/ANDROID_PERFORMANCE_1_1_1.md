# Android performance update 1.1.1

This release retains package `com.andrefiker.primordia` and its original release
signing certificate. Version code 2 can update the 1.1.0 installation in place.

The signed direct-install APK is `Primordia-1.1.1-Android.apk`, 51,996,446
bytes, SHA-256 `b22861ee5b19f4cd1435ac0b9c2db58d568ea6f07b866879cb3dca59c0`.
It is ARM64 + x86_64, Android API 21 minimum, landscape, offline and requests
no permissions. `apksigner` verified v1/v2/v3 signatures; its certificate
SHA-256 is `cdec6027804b655af5ab0d547621f4f77524aed3a010228e5a5943e525a614c7`,
identical to the 1.1.0 APK. `zipalign -c -p 4` and archive CRC checks passed.

On phones, Godot now draws into a 1440x720 viewport and scales that image to the
screen. The previous canvas-items mode drew at the phone's full physical pixel
resolution. Organism and background animation redraw at 30 Hz, NPC decisions
run at 30 Hz while player input and feeding remain at 60 Hz, the phone HUD
refreshes at 10 Hz, and nutrient contact checks avoid unnecessary square roots.
Suspended particles are bounded to the visible camera area. The evolution
preview also redraws at half frequency on Android.

## Reproducible host measurement

Using `tests/performance_probe.gd`, a solo Godot 4.4.1 software-rendered Xvfb
session at 1920x960 ran 600 fixed simulation ticks followed by 45 warmup and
150 measured rendered frames. Both builds used the same engine, machine and
`--mobile` layout. The world is procedurally generated, so food counts varied
slightly (635 before, 643 after; 68 agents each). No other GPU workload was run
during either captured measurement.

| Metric | 1.1.0 baseline | 1.1.1 optimized |
| --- | ---: | ---: |
| Frames per second | 11.70 | 24.28 |
| Average frame interval | 85.45 ms | 41.19 ms |
| 95th-percentile frame interval | 110.70 ms | 61.38 ms |
| Average manual simulation tick | 3.51 ms | 2.31 ms |

The 1.1.1 measurement preceded a minor editor-preview redraw change that does
not run during the measured gameplay scene. Software renderer FPS is a relative
comparison, not an expected FPS or battery estimate on Android hardware. A
physical Poco X7 Pro report of sluggishness motivated the change; that device
cannot be profiled by this build environment. Verify feel on the phone after
installing the update.

Release verification: 31 rules/save checks, 25 mobile touch/gameplay checks,
five separate-process mobile resume checks and 16 desktop regression checks
passed in the Godot desktop-hosted harness. Native install on the user's phone
has not been observed by this environment; the user can install the APK over
1.1.0 directly to assess responsiveness there.

Run the probe with an isolated XDG profile and graphical Godot session:

```sh
godot --path . --resolution 1920x960 --audio-driver Dummy \
  --script res://tests/performance_probe.gd -- --mobile
```
