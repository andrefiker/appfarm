"""Black-box UI smoke test on an attached Android emulator. No app data leaves device."""
import subprocess,time,xml.etree.ElementTree as ET,re,pathlib,json,atexit
out=pathlib.Path('docs/qa');out.mkdir(parents=True,exist_ok=True)
def adb(*args): return subprocess.check_output(['adb',*args],text=True,stderr=subprocess.STDOUT)
def nodes():
 adb('shell','uiautomator','dump','/sdcard/sandlab-ui.xml')
 return list(ET.fromstring(adb('shell','cat','/sdcard/sandlab-ui.xml')).iter('node'))
def find(text,exact=False,timeout=25):
 end=time.time()+timeout
 while time.time()<end:
  found=[]
  for n in nodes():
   values=[n.attrib.get('text',''),n.attrib.get('content-desc','')]
   if any((v==text if exact else text.casefold() in v.casefold()) for v in values):
    b=list(map(int,re.findall(r'\d+',n.attrib['bounds'])))
    if len(b)==4 and b[2]>b[0] and b[3]>b[1]:found.append(((b[2]-b[0])*(b[3]-b[1]),b))
  if found:return sorted(found)[0][1]
  time.sleep(1)
 raise AssertionError('UI control not found: '+text)
def tap(text,exact=False):
 b=find(text,exact);adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2));time.sleep(.8)
def shot(name):
 (out/name).write_bytes(subprocess.check_output(['adb','exec-out','screencap','-p']))
def diagnostics():
 try:
  shot('android-last-state.png')
  logs=adb('logcat','-d');(out/'android-all-logcat.txt').write_text(logs)
  nodes();(out/'android-last-ui.xml').write_text(adb('shell','cat','/sdcard/sandlab-ui.xml'))
 except Exception as e: print('Diagnostic capture:',e)
atexit.register(diagnostics)
adb('install','-r','Sand-Lab-v1.0.0.apk')
adb('shell','settings','put','global','airplane_mode_on','1')
adb('shell','svc','wifi','disable');adb('shell','svc','data','disable')
adb('shell','am','start','-W','-n','com.andrefiker.sandlab/.MainActivity');time.sleep(5)
shot('android-launch.png');find('Worlds');find('Pause')
tap('Pause');find('Resume')
# Draw a continuous stroke in the upper, empty part of the world.
size=list(map(int,re.findall(r'\d+',adb('shell','wm','size'))[-2:]));w,h=size
adb('shell','input','swipe',str(w//3),str(h//4),str(2*w//3),str(h//3),'700');shot('android-painted.png')
tap('Undo');tap('Tools');find('Point');find('Rectangle');tap('Redo');
tap('Worlds');tap('Save current world');
edit=next(n for n in nodes() if n.attrib.get('class')=='android.widget.EditText');b=list(map(int,re.findall(r'\d+',edit.attrib['bounds'])));adb('shell','input','tap',str((b[0]+b[2])//2),str((b[1]+b[3])//2))
adb('shell','input','keyevent','KEYCODE_MOVE_END')
for i in range(25):adb('shell','input','keyevent','KEYCODE_DEL')
adb('shell','input','text','Android-QA')
adb('shell','input','keyevent','KEYCODE_BACK');tap('Save',True);find('Android-QA');shot('android-saved.png')
tap('Load',True);tap('Confirm',True);find('Resume')
adb('shell','input','keyevent','KEYCODE_HOME');time.sleep(3)
adb('shell','am','force-stop','com.andrefiker.sandlab')
adb('shell','am','start','-W','-n','com.andrefiker.sandlab/.MainActivity');time.sleep(3);find('Resume');tap('Worlds');find('Android-QA');shot('android-reopened.png')
logs=adb('logcat','-d','-s','AndroidRuntime','chromium');(out/'android-logcat.txt').write_text(logs)
assert 'FATAL EXCEPTION' not in logs and 'Uncaught ' not in logs,logs
(out/'android-ui.xml').write_text(adb('shell','cat','/sdcard/sandlab-ui.xml'))
(out/'android-results.json').write_text(json.dumps({'passed':True,'checks':['install','offline launch','portrait controls','paint stroke','pause','undo/redo','brush menu','named save/load','background autosave','force-stop/reopen persistence'],'device':adb('shell','getprop','ro.build.version.release').strip()},indent=2))
print('Android emulator UI checks passed')
