from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
html=(root/'app/src/main/assets/index.html').read_text()
manifest=(root/'app/src/main/AndroidManifest.xml').read_text()
assert 'window.CLIENTS = []' in html
assert 'atendimentos_clients_v1' in html
assert 'clients_data.json' in html
assert not re.search(r'https://docs.google.com/document/d/[A-Za-z0-9_-]{20,}',html)
assert not re.search(r'https://drive.google.com/drive/folders/[A-Za-z0-9_-]{20,}',html)
assert 'android.permission.INTERNET' not in manifest
assert not list((root/'app/src/main/assets').glob('clients_data*.json'))
assert 'allowBackup="false"' in manifest
print('Static privacy, offline and bundled-asset checks passed')
