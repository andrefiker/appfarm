# Primordia state

Current branch: `primordia-android`. Android version 1.1.2 / code 3.
Package: `com.andrefiker.primordia`. Native Godot 4.4.1, offline, landscape.
Release APK: `build/Primordia-1.1.2-Android.apk` (ARM64 + x86_64).

Android work adds a dedicated 1440x720 phone UI, a finger-tracked swim pad,
independent primary/secondary touches, handedness settings, a touch evolution
editor, and Android Back/background lifecycle handling. The desktop UI remains
available on desktop. Save schema 1 and checksum/backup recovery are retained.

Validation on 1.1.1: 31 rules/save checks, 25 phone interaction checks at
960x480, 5 separate-process phone save checks, and 16 desktop regression
checks. The original 1.1.0 release also passed 25 phone checks at 1280x640.
Signature v1/v2/v3, APK alignment, package, launcher, landscape orientation,
ABIs and no requested permissions were verified. The new APK has the same
certificate as 1.1.0 and a higher version code. See `docs/ANDROID_RELEASE.md`
for original Android runtime evidence and limits.

Version 1.1.1 reduces the Android render resolution to a 1440x720 viewport,
updates HUD text ten times per second, draws organism animation and world
effects at half frequency, and runs NPC updates at 30 Hz while preserving
60 Hz player input and feeding. A software-rendered 1920x960 comparison rose
from 11.7 to 24.3 FPS on this build host; device FPS has not been measured.
See `docs/ANDROID_PERFORMANCE_1_1_1.md` for the benchmark method and limits.
Version 1.1.2 cuts the mobile viewport again to 960x480 while scaling the
interface and touches to preserve the same layout. Ambient world and NPC
animation redraw at 15 Hz, player animation at 30 Hz. The isolated
software-rendered comparison rose from 24.3 to 38.3 FPS at 1920x960;
physical-device FPS still requires a phone test. See
`docs/ANDROID_PERFORMANCE_1_1_2.md`.
Version 1.1.2 passed 25 mobile checks at both 960x480 and 1280x640,
five mobile resume checks, 31 rules/save checks and 16 desktop checks.

Windows baseline / Android rollback: `7091b1d9c6a9aca43989d9487c45a4784dd62603`
on `primordia-v1`; desktop game-code `8319c1bb03598a6d0e36408e34a82a9635f0d96b`.
Earlier first-playable checkpoint: `411cc86d6c5a987d4105f9398200dd7ad62ed13c`.
Desktop release evidence remains in `docs/RELEASE.md`.

Future Ghost: preserve the working Godot game, local saves and rollback
checkpoints. Reuse the private Android release key for updates and increment
version/code. A local backup is named `Primordia-Android-Signing-Key-PRIVATE.zip`.
Persistent saving of that credential backup was blocked by automatic approval
review and awaits explicit owner approval. Do not expose it or its password
in this repository. The APK and source contain no signing credentials.
Do not add services to address packaging. Keep changes inside `primordia/`.
