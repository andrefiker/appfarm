import zipfile,pathlib
with zipfile.ZipFile('Sand-Lab-v1.0.0.apk') as z:
 assert z.testzip() is None
 for f in pathlib.Path('dist').glob('*'):
  if f.is_file(): assert z.read('assets/'+f.name)==f.read_bytes(), f.name
 assert 'classes.dex' in z.namelist()
 assert 'AndroidManifest.xml' in z.namelist()
print('ZIP integrity and all bundled web assets match: PASS')
