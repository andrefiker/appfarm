from pathlib import Path
import xml.etree.ElementTree as ET
root = Path(__file__).resolve().parents[1] / 'app/src/main'
ns = '{http://schemas.android.com/apk/res/android}'
manifest = ET.parse(root / 'AndroidManifest.xml').getroot().find('application')
assert manifest.get(ns+'icon') == '@mipmap/ic_launcher'
assert manifest.get(ns+'roundIcon') == '@mipmap/ic_launcher'
adaptive = ET.parse(root / 'res/mipmap-anydpi-v26/ic_launcher.xml').getroot()
assert adaptive.tag == 'adaptive-icon'
assert adaptive.find('foreground').get(ns+'drawable') == '@drawable/peg_icon_foreground'
assert adaptive.find('background').get(ns+'drawable') == '@color/peg_icon_background'
foreground = ET.parse(root / 'res/drawable/peg_icon_foreground.xml').getroot()
legacy = ET.parse(root / 'res/mipmap-anydpi/ic_launcher.xml').getroot()
assert foreground.get(ns+'viewportWidth') == foreground.get(ns+'viewportHeight') == '108'
assert len(foreground) >= 4 and len(legacy) == len(foreground)+1
assert [ET.tostring(e) for e in legacy][1:] == [ET.tostring(e) for e in foreground]
assert '#D45448' not in ET.tostring(foreground, encoding='unicode')
print('Launcher: adaptive and legacy peg icons use the same foreground and mask-safe 108dp design')
