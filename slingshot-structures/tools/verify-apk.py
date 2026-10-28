"""Verify release APK against the exact bundled web source and checksum."""
import hashlib
import pathlib
import subprocess
import sys
import zipfile
root=pathlib.Path(__file__).resolve().parents[1]
apk=root/'dist/Slingshot-Structures-v1.0.0.apk'
expected=(root/'dist/SHA256SUMS.txt').read_text().split()[0]
assert hashlib.sha256(apk.read_bytes()).hexdigest()==expected
with zipfile.ZipFile(apk) as z:
    assert z.testzip() is None
    assert 'classes.dex' in z.namelist()
    assert 'AndroidManifest.xml' in z.namelist()
    for p in (root/'web').rglob('*'):
        if p.is_file():
            assert z.read('assets/'+str(p.relative_to(root/'web')))==p.read_bytes(),str(p)
print('APK checksum, ZIP, classes, manifest and every offline asset match source.')
