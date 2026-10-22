"""Audit the actual APK, not just source. Requires BT and an existing release build."""
from pathlib import Path
import hashlib,json,os,subprocess,zipfile
root=Path(__file__).resolve().parents[1]
apk=root/'build/NEUROATLAS-v1.0.0.apk'
bt=Path(os.environ['BT'])
def run(tool,*args):return subprocess.check_output([str(bt/tool),*map(str,args)],text=True)
sig=run('apksigner','verify','--verbose','--print-certs',apk)
pkg=run('aapt','dump','badging',apk)
perms=run('aapt','dump','permissions',apk)
run('zipalign','-c','4',apk)
assert "name='com.andrefiker.neuroatlas' versionCode='1' versionName='1.0.0'" in pkg
assert "sdkVersion:'26'" in pkg and "targetSdkVersion:'35'" in pkg
assert 'uses-permission' not in perms
assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in sig
assert 'Verified using v3 scheme (APK Signature Scheme v3): true' in sig
assets=[]
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
report={'apk':apk.name,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'bytes':apk.stat().st_size,'package':'com.andrefiker.neuroatlas','versionName':'1.0.0','versionCode':1,'minSdk':26,'targetSdk':35,'certificateSha256':fingerprint,'signatureSchemesVerified':['v2','v3'],'permissionCount':0,'zipAlignment':'4-byte verified','assets':assets,'checks':['Package/version checked from compiled manifest','No requested permissions','RSA signing verified','ZIP integrity verified','Every offline web asset matches source bytes','No signing secrets in APK'],'emulatorInstall':'NOT RUN — no emulator available','physicalPhone':'NOT RUN — no attached phone','note':'Package integrity is verified. Installation and native WebView behavior have not been exercised on Android hardware.'}
(root/'qa/package-results.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
(root/'qa/signature.txt').write_text(sig)
(root/'qa/permissions.txt').write_text(perms)
print(json.dumps({k:v for k,v in report.items()if k!='assets'},indent=2))
