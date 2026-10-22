"""Audit the actual APK, not just source. Requires BT and an existing release build."""
from pathlib import Path
import hashlib,json,os,subprocess,sys,zipfile,xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'tools'))
from apk_layout import verify_resource_table
manifest=ET.parse(root/'android/AndroidManifest.xml').getroot()
version=manifest.get('{http://schemas.android.com/apk/res/android}versionName')
code=int(manifest.get('{http://schemas.android.com/apk/res/android}versionCode'))
apk=root/f'build/NEUROATLAS-v{version}.apk'
bt=Path(os.environ['BT'])
def run(tool,*args):return subprocess.check_output([str(bt/tool),*map(str,args)],text=True)
sig=run('apksigner','verify','--verbose','--print-certs',apk)
pkg=run('aapt','dump','badging',apk)
perms=run('aapt','dump','permissions',apk)
run('zipalign','-c','4',apk)
assert f"name='com.andrefiker.neuroatlas' versionCode='{code}' versionName='{version}'" in pkg
assert "sdkVersion:'26'" in pkg and "targetSdkVersion:'35'" in pkg
assert 'uses-permission' not in perms
assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in sig
assert 'Verified using v3 scheme (APK Signature Scheme v3): true' in sig
assets=[]
layout=verify_resource_table(apk)
with zipfile.ZipFile(apk) as z:
 assert z.testzip() is None
 for f in sorted((root/'web').rglob('*')):
  if f.is_file():
   n='assets/'+str(f.relative_to(root/'web'));a=z.read(n);assert a==f.read_bytes(),n
   assets.append({'path':n,'bytes':len(a),'sha256':hashlib.sha256(a).hexdigest()})
 assert sorted(n for n in z.namelist() if n.startswith('assets/'))==sorted(x['path'] for x in assets)
 assert 'classes.dex' in z.namelist()
 assert not any(n.endswith(('.p12','.jks','.keystore')) or 'password' in n for n in z.namelist())
fingerprint=next(s.split(': ',1)[1]for s in sig.splitlines()if 'certificate SHA-256 digest' in s)
assert fingerprint=='d68626fa70e1de06bdc47dbcb969e8f00f7d0ce7923614ef715eb0797b58e54a','Release certificate continuity failed'
report={'apk':apk.name,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'bytes':apk.stat().st_size,'package':'com.andrefiker.neuroatlas','versionName':version,'versionCode':code,'minSdk':26,'targetSdk':35,'certificateSha256':fingerprint,'signatureSchemesVerified':['v2','v3'],'permissionCount':0,'zipAlignment':'4-byte verified','resourceTable':layout,'assets':assets,'checks':['Package/version checked from compiled manifest','No requested permissions','RSA signing verified; original release certificate preserved','ZIP integrity verified','resources.arsc uncompressed and its actual data offset 4-byte aligned','Every offline web asset matches source bytes','No signing secrets in APK'],'emulatorInstall':'NOT RUN — no emulator available','physicalPhone':'v1.0.0 installation failed in owner screenshot; v1.0.1 awaiting owner confirmation','note':'Package checks pass, including the Android API 30+ resource-table installation rule missed in v1.0.0. This is not an emulator or physical-phone installation result.'}
(root/'qa/package-results.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
(root/'qa/signature.txt').write_text(sig)
(root/'qa/permissions.txt').write_text(perms)
print(json.dumps({k:v for k,v in report.items()if k!='assets'},indent=2))
