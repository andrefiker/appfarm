#!/usr/bin/env bash
set -euo pipefail
mkdir -p dist
adb shell svc wifi disable
adb shell svc data disable
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell am instrument -w com.andrefiker.clinicalcockpit.test/com.andrefiker.clinicalcockpit.SmokeRunner | tee dist/android-qa.txt
grep -q 'Android checks passed' dist/android-qa.txt
! grep -q 'FAIL:' dist/android-qa.txt
adb exec-out run-as com.andrefiker.clinicalcockpit cat files/synthetic.pdf > dist/synthetic-test.pdf
adb exec-out run-as com.andrefiker.clinicalcockpit cat files/saf-test.docx > dist/synthetic-export.docx
for name in patient roadmap dossier locked recovery roster roster-preview; do adb exec-out run-as com.andrefiker.clinicalcockpit cat "files/$name.png" > "dist/$name.png"; done
adb shell am force-stop com.andrefiker.clinicalcockpit
adb shell am start -n com.andrefiker.clinicalcockpit/.MainActivity
adb shell uiautomator dump /sdcard/cockpit.xml
adb pull /sdcard/cockpit.xml dist/relaunch-locked.xml
grep -q 'Antes da próxima sessão' dist/relaunch-locked.xml
! grep -q 'Notas inteiramente' dist/relaunch-locked.xml
