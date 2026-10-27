import subprocess,time,pathlib
def adb(*args): return subprocess.check_output(['adb',*args],text=True)
def capture(label):
    time.sleep(2)
    data=subprocess.check_output(['adb','exec-out','screencap','-p'])
    assert data.startswith(b'\x89PNG')
    pathlib.Path('ci/three-game-emulator/screens').mkdir(exist_ok=True)
    pathlib.Path('ci/three-game-emulator/screens/'+label+'.png').write_bytes(data)
def tap(x,y): adb('shell','input','tap',str(x),str(y));time.sleep(1)
def launch(pkg): adb('shell','am','start','-n',pkg+'/.MainActivity');time.sleep(3);assert pkg in adb('shell','dumpsys','activity','activities')
def background(pkg): adb('shell','input','keyevent','HOME');time.sleep(1);launch(pkg)
adb('shell','wm','size','393x852');adb('shell','wm','density','160')
for name,pkg in [('snake','com.andrefiker.quietsnake'),('bubbles','com.andrefiker.quietbubbles'),('mines','com.andrefiker.minesweeper')]:
    adb('install','-r','ci/three-game-emulator/'+name+'.apk');launch(pkg);capture(name+'-launch')
    if name=='mines': tap(196,300);capture(name+'-input');background(pkg);capture(name+'-resume');tap(75,815);capture(name+'-restart')
    elif name=='bubbles': tap(196,400);capture(name+'-play');tap(196,350);capture(name+'-input');background(pkg);capture(name+'-resume')
    else: tap(196,360);capture(name+'-play');tap(350,55);capture(name+'-pause');background(pkg);capture(name+'-resume')
    print(name+': install, launch, input and relaunch executed; screenshots saved for inspection',flush=True)
    adb('shell','am','force-stop',pkg)
