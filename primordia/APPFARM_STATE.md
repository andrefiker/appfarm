# Primordia state

Current branch: `primordia-android`. Android version 1.1.0 / code 1.
Package: `com.andrefiker.primordia`. Native Godot 4.4.1, offline, landscape.
Release APK: `build/Primordia-1.1.0-Android.apk` (ARM64 + x86_64).

Android work adds a dedicated 1440x720 phone UI, a finger-tracked swim pad,
independent primary/secondary touches, handedness settings, a touch evolution
editor, and Android Back/background lifecycle handling. The desktop UI remains
available on desktop. Save schema 1 and checksum/backup recovery are retained.

Validation: 31 rules/save checks, 25 phone interaction checks at each of
1280x640 and 960x480, 5 separate-process phone save checks, and 16 desktop
regression checks. Signature v1/v2/v3, APK alignment, package, launcher,
landscape orientation, ABIs and no requested permissions were verified.
See `docs/ANDROID_RELEASE.md` for final Android runtime evidence and limits.

Windows baseline / Android rollback: `7091b1d9c6a9aca43989d9487c45a4784dd62603`
on `primordia-v1`; desktop game-code `8319c1bb03598a6d0e36408e34a82a9635f0d96b`.
Earlier first-playable checkpoint: `411cc86d6c5a987d4105f9398200dd7ad62ed13c`.
Desktop release evidence remains in `docs/RELEASE.md`.

Future Ghost: preserve the working Godot game, local saves and rollback
checkpoints. Reuse the private Android release key for updates and increment
version/code. It is supplied separately to the owner, never in this repository.
Do not add services to address packaging. Keep changes inside `primordia/`.
