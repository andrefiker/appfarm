import re, subprocess, sys, xml.etree.ElementTree as ET
root = ET.parse(sys.argv[1]).getroot()
play = next((n for n in root.iter() if n.get('text') == 'Play' or n.get('content-desc') == 'Play'), None)
if play is None:
    raise SystemExit('Play button not found in Android accessibility tree')
coords = list(map(int, re.findall(r'\d+', play.get('bounds', ''))))
if len(coords) != 4:
    raise SystemExit('Play button bounds missing')
subprocess.run(['adb', 'shell', 'input', 'tap', str((coords[0]+coords[2])//2), str((coords[1]+coords[3])//2)], check=True)
subprocess.run(['adb', 'shell', 'uiautomator', 'dump', '/sdcard/after.xml'], check=True)
after = subprocess.check_output(['adb', 'exec-out', 'cat', '/sdcard/after.xml'], text=True)
if 'English' not in after or 'pegs' not in after:
    raise SystemExit('Game screen not found after Play')
print('Android: APK installed, launched and Play opened the English board')
