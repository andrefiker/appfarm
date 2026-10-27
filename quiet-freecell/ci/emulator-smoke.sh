#!/usr/bin/env bash
set -euo pipefail
APK=quiet-freecell/ci/Quiet-FreeCell-v1.0.1.apk
adb install -r "$APK"
adb shell am force-stop com.andrefiker.quietfreecell
adb shell am start -W -n com.andrefiker.quietfreecell/.MainActivity
adb shell pidof com.andrefiker.quietfreecell >/dev/null
# Wait for the WebView menu, then activate Continue via its accessibility bounds.
for i in $(seq 1 30); do
  adb shell uiautomator dump /sdcard/qf-window.xml >/dev/null 2>&1 || true
  adb exec-out cat /sdcard/qf-window.xml > /tmp/qf-window.xml 2>/dev/null || true
  if python3 - <<'PY'
import re,sys,xml.etree.ElementTree as ET
try:
 root=ET.parse('/tmp/qf-window.xml').getroot()
 for node in root.iter('node'):
  if node.get('text')=='Continue' or node.get('content-desc')=='Continue':
   v=list(map(int,re.findall(r'\d+',node.get('bounds','')))); assert len(v)==4
   print((v[0]+v[2])//2,(v[1]+v[3])//2);sys.exit(0)
except (ET.ParseError,FileNotFoundError,AssertionError):pass
sys.exit(1)
PY
  then break; fi
  sleep 1
done > /tmp/qf-continue-coordinates
test -s /tmp/qf-continue-coordinates
read -r x y < /tmp/qf-continue-coordinates
adb shell input tap "$x" "$y"
adb shell pidof com.andrefiker.quietfreecell >/dev/null
for i in $(seq 1 15); do
  adb shell uiautomator dump /sdcard/qf-board.xml >/dev/null 2>&1 || true
  adb exec-out cat /sdcard/qf-board.xml > /tmp/qf-board.xml 2>/dev/null || true
  if grep -qi '0 moves' /tmp/qf-board.xml; then break; fi
  sleep 1
done
grep -qi '0 moves' /tmp/qf-board.xml
mkdir -p quiet-freecell/ci-output
adb exec-out screencap -p > quiet-freecell/ci-output/board.png
test -s quiet-freecell/ci-output/board.png
