# Android emulator attempt — blocked

This is failure evidence, not an Android gameplay pass. No physical device was connected.

Official Android emulator 37.2.12, platform-tools 37.0.1 and the Android 15/API 35 default x86_64 revision 2 image were downloaded. SHA-1 values matched Google's repository metadata; `downloads.json` records SHA-256 values too. The host has no `/dev/kvm`; the emulator used software CPU emulation, two cores, 2 GB RAM, a 720 × 1600 display at 320 dpi and SwiftShader.

The first managed boot did not complete within 480 seconds. One warm retry exposed Android's package service after 209 seconds. A provisional runner printed a boot-ready label at that point, but actual `sys.boot_completed` never became `1`; that label is **not accepted as evidence of a completed boot**. Installation of the preserved 1.0.0 APK failed inside Android PackageInstaller because StorageManager was not ready. No app process ran. WebView's bundled package existed, but the current provider was null.

Subsequent logs record a SystemUI startup ANR, then the Android system watchdog killing the system process after its main thread was blocked for 62 seconds. Android restarted its zygote; mount and WebView services disappeared. The attempt was stopped. These observations establish an environment blocker; they do not establish application compatibility or incompatibility.

- `result.json`: explicit status for installation, execution, resume and device qualification, plus the original install error.
- `system-errors.txt`: actual Android watchdog/ANR/crash logs.
- `webview-not-ready.txt`: provider state before the system restart.
- `cold-boot-timeout.json`: first boot timeout.
- `failed-boot-screen.png`: actual black OS screen, **not gameplay**.
- `downloads.json`: official tool/image provenance and hashes.

The emulator command used these options:

```sh
emulator -avd QuietKnight_API35 -no-window -no-audio -no-boot-anim \
  -no-snapshot -accel off -gpu swiftshader_indirect -memory 2048 \
  -cores 2 -port 5556 -no-metrics -feature -Vulkan
```

Before repeating on a host with hardware acceleration, require `adb shell getprop sys.boot_completed` to return `1`, verify the mount service and a selected WebView provider, and only then install. Run 1.0.0 first, make and save a game, then use `adb install -r Quiet-Knight-II-1.0.2.apk` to test update continuity. Follow the remaining device checks in `../../QA-1.0.2.md`. No native tests for 1.0.2 are claimed here.
