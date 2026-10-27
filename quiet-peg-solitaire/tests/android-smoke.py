import re, subprocess, sys, time, xml.etree.ElementTree as ET

def adb(*args):
    return subprocess.check_output(['adb', *args], text=True)

def snapshot():
    for attempt in range(10):
        result = adb('shell', 'uiautomator', 'dump', '/sdcard/peg-window.xml')
        # uiautomator can exit zero even when its accessibility root is null.
        # Do not read the previous successful dump in that case.
        if 'UI hierchary dumped to:' in result or 'UI hierarchy dumped to:' in result:
            return ET.fromstring(adb('exec-out', 'cat', '/sdcard/peg-window.xml'))
        time.sleep(2)
    raise SystemExit('Unable to capture a fresh Android UI hierarchy')

def text(root):
    return ' '.join((node.get('text', '') + ' ' + node.get('content-desc', '')) for node in root.iter())

def tap(root, label):
    node = next((n for n in root.iter() if n.get('text') == label or n.get('content-desc') == label or (label in ('Undo', 'Redo') and (n.get('text', '').strip().endswith(label) or n.get('content-desc', '').strip().endswith(label)))), None)
    if node is None:
        raise SystemExit(f'Element not found: {label}; UI: {text(root)}')
    coords = list(map(int, re.findall(r'\d+', node.get('bounds', ''))))
    if len(coords) != 4:
        raise SystemExit(f'Bounds missing: {label}')
    adb('shell', 'input', 'tap', str((coords[0]+coords[2])//2), str((coords[1]+coords[3])//2))
    time.sleep(1)

def require(root, value):
    if value not in text(root):
        raise SystemExit(f'Expected {value!r}, UI: {text(root)}')

def wait_for(value):
    for attempt in range(10):
        root = snapshot()
        if value in text(root):
            return root
        time.sleep(1)
    raise SystemExit(f'Expected {value!r}, UI: {text(root)}')

root = ET.parse(sys.argv[1]).getroot()
for attempt in range(12):
    if any(n.get('text') == 'Play' or n.get('content-desc') == 'Play' for n in root.iter()):
        break
    if "isn't responding" in text(root):
        tap(root, 'Close app')
        adb('shell', 'am', 'start', '-W', '-n', 'com.andrefiker.quietpegsolitaire/.MainActivity')
    time.sleep(5)
    root = snapshot()
tap(root, 'Play')
root = wait_for('32 pegs')
tap(root, 'Row 4, hole 2, peg')
root = snapshot()
tap(root, 'Row 4, hole 4, empty, legal destination')
root = wait_for('31 pegs')
tap(root, 'Undo')
root = wait_for('32 pegs')
tap(root, 'Redo')
root = wait_for('31 pegs')
adb('shell', 'am', 'force-stop', 'com.andrefiker.quietpegsolitaire')
adb('shell', 'am', 'start', '-W', '-n', 'com.andrefiker.quietpegsolitaire/.MainActivity')
time.sleep(5)
root = snapshot(); tap(root, 'Resume game')
root = wait_for('31 pegs')
print('Android: installed, launched, played a legal jump, undid, redid and restored the saved board')
