#!/usr/bin/env bash
set -euo pipefail

REPORT=android-build/emulator-qa.txt
if [[ ! -e /dev/kvm ]]; then
  printf '%s\n' 'EMULATOR_STATUS=unavailable: /dev/kvm absent on runner' > "$REPORT"
  cat "$REPORT"
  exit 0
fi
sudo chmod 666 /dev/kvm

SDKMANAGER="$(find "$ANDROID_HOME/cmdline-tools" -path '*/bin/sdkmanager' -type f | sort -V | tail -n 1)"
AVDMANAGER="$(find "$ANDROID_HOME/cmdline-tools" -path '*/bin/avdmanager' -type f | sort -V | tail -n 1)"
yes | "$SDKMANAGER" 'emulator' 'system-images;android-35;google_apis;x86_64' >/dev/null || [[ "${PIPESTATUS[1]}" -eq 0 ]]
echo no | "$AVDMANAGER" create avd -n quiet_solitaire_qa -k 'system-images;android-35;google_apis;x86_64' --force >/dev/null
"$ANDROID_HOME/emulator/emulator" -avd quiet_solitaire_qa -no-window -no-audio -no-boot-anim \
  -no-snapshot -gpu swiftshader_indirect > android-build/emulator.log 2>&1 &
EMULATOR_PID=$!
trap 'kill "$EMULATOR_PID" 2>/dev/null || true' EXIT

adb wait-for-device
timeout 180 bash -c 'until [[ "$(adb shell getprop sys.boot_completed | tr -d "\r")" == "1" ]]; do sleep 3; done'
adb shell wm size 393x852
adb shell wm density 160
adb shell svc wifi disable
adb shell svc data disable
adb install -r Quiet-Solitaire-v1.4.0.apk
adb shell am start -n com.andrefiker.quietsolitaire/.MainActivity
sleep 5
adb shell pidof com.andrefiker.quietsolitaire >/dev/null
adb shell screencap -p /sdcard/quiet-solitaire-launch.png
adb pull /sdcard/quiet-solitaire-launch.png android-build/emulator-launch.png >/dev/null

adb shell input keyevent KEYCODE_HOME
adb shell am start -n com.andrefiker.quietsolitaire/.MainActivity
sleep 2
adb shell pidof com.andrefiker.quietsolitaire >/dev/null
adb shell screencap -p /sdcard/quiet-solitaire-resume.png
adb pull /sdcard/quiet-solitaire-resume.png android-build/emulator-resume.png >/dev/null
printf '%s\n' 'EMULATOR_STATUS=installed, launched offline, backgrounded, resumed' > "$REPORT"
cat "$REPORT"
