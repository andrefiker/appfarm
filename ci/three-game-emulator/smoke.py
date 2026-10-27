import subprocess,time,re,xml.etree.ElementTree as ET
def adb(*args): return subprocess.check_output(['adb',*args],text=True)
def dump():
    time.sleep(1)
    raw=adb('exec-out','uiautomator','dump','/dev/tty')
    return ET.fromstring(raw[raw.index('<?xml'):raw.rindex('</hierarchy>')+12])
def click(pattern):
    for node in dump().iter():
        text=' '.join([node.get('text',''),node.get('content-desc','')])
        if re.search(pattern,text,re.I):
            bounds=re.findall(r'\d+',node.get('bounds',''))
            if len(bounds)==4:
                x1,y1,x2,y2=map(int,bounds);adb('shell','input','tap',str((x1+x2)//2),str((y1+y2)//2));return
    raise AssertionError('UI target not found: '+pattern)
def launch(pkg):
    adb('shell','am','start','-n',pkg+'/.MainActivity');time.sleep(3)
    assert pkg in adb('shell','dumpsys','activity','activities')
def background(pkg):
    adb('shell','input','keyevent','HOME');time.sleep(1);launch(pkg)
adb('shell','wm','size','393x852');adb('shell','wm','density','160')
for name,pkg in [('mines','com.andrefiker.minesweeper'),('bubbles','com.andrefiker.quietbubbles'),('snake','com.andrefiker.quietsnake')]:
    adb('install','-r','ci/three-game-emulator/'+name+'.apk');launch(pkg)
    if name=='mines':
        adb('shell','input','tap','196','300');time.sleep(1);background(pkg);click(r'New game');print('Mines: tile input, background/relaunch, restart')
    elif name=='bubbles':
        click(r'^PLAY$');adb('shell','input','tap','196','350');time.sleep(2);click(r'Ⅱ|Pause');click(r'RESTART');background(pkg);print('Bubbles: play, shot, pause/restart, background/relaunch')
    else:
        click(r'^Play');time.sleep(1);click(r'Pause|Ⅱ');click(r'Resume');background(pkg);print('Snake: play, pause/resume, background/relaunch')
    adb('shell','am','force-stop',pkg)
