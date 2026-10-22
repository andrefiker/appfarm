#!/usr/bin/env python3
"""Verify a signed APK against this checkout. Usage: python3 tools/verify-apk.py APK"""
import hashlib,json,os,subprocess,sys,zipfile
from pathlib import Path
root=Path(__file__).resolve().parent.parent
apk=Path(sys.argv[1]).resolve()
bt=Path(os.environ.get('QK_BUILD_TOOLS',root/'.toolchain/android-15'))
def run(tool,*args):
    return subprocess.check_output([str(bt/tool),*map(str,args)],text=True)
cert=run('apksigner','verify','--min-sdk-version','24','--verbose','--print-certs',apk)
assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in cert
assert 'Verified using v3 scheme (APK Signature Scheme v3): true' in cert
assert '7eb3b3247c42e8ade034263b1bbfcce2e5e54baab7d5c82aa958e58ff55f8017' in cert
badging=run('aapt','dump','badging',apk)
assert "package: name='com.andrefiker.quietknightii' versionCode='3' versionName='1.0.2'" in badging
permissions=run('aapt','dump','permissions',apk)
assert 'uses-permission' not in permissions
run('zipalign','-c','-p','4',apk)
assets=[]
with zipfile.ZipFile(apk) as z:
    assert z.testzip() is None
    assert not any(n.endswith(('.p12','.jks','.keystore')) for n in z.namelist())
    for n in z.namelist():
        if n.startswith('assets/'):
            data=z.read(n)
            assert data==(root/'web'/n[7:]).read_bytes(),n
            assets.append({'path':n,'sha256':hashlib.sha256(data).hexdigest()})
print(json.dumps({'apk':apk.name,'bytes':apk.stat().st_size,'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),'permissions':[],'assetsVerified':len(assets),'assets':assets},indent=2))
