from pathlib import Path
import zipfile
apk=Path('Pocket-Bowling-v1.0.0.apk')
with zipfile.ZipFile(apk) as z:
 assert z.testzip() is None
 assert {'AndroidManifest.xml','classes.dex','resources.arsc'}<=set(z.namelist())
 for p in Path('dist').rglob('*'):
  if p.is_file(): assert z.read('assets/'+str(p.relative_to('dist')))==p.read_bytes(),str(p)
badging=Path('android-build/badging.txt').read_text()
assert "package: name='com.andrefiker.pocketbowling' versionCode='1' versionName='1.0.0'" in badging
assert "launchable-activity: name='com.andrefiker.pocketbowling.MainActivity'" in badging
assert "android.permission.INTERNET" not in Path('android-build/permissions.txt').read_text()
print('APK structure, identity, bundled asset equivalence and no Internet permission: PASS')
