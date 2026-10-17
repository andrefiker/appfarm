"""Verify public game source after removing documented Craftian wrapper injection."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import re
import subprocess

ROOT=Path(__file__).resolve().parent.parent
PROJECTS=json.loads((ROOT/'arcade-batch/projects.json').read_text())

def normalize(source):
    source=re.sub(r'<script>window\.__FOR_IO_APP_(?:INFO|MODEL)\s*=.*?</script>','',source,flags=re.S)
    source=re.sub(r'<script type="importmap">\{"imports":\{"@craftian/sdk":"https://craftian\.ai/dist/CraftianSDK\.js"\}\}</script>','',source)
    source=source.replace('<script defer src="https://craftian.ai/main/app-menu.js"></script>','')
    return re.sub(r'(<head\b[^>]*>)\s*',r'\1',source).strip()

def check(item):
    slug,metadata=item
    result=subprocess.run(['curl','-sS','--fail','--connect-timeout','15','--max-time','40',metadata['liveUrl']],capture_output=True,text=True)
    if result.returncode:
        raise RuntimeError(slug+': HTTP/TLS fetch failed')
    original=(ROOT/slug/'index.html').read_text()
    matched=normalize(result.stdout)==normalize(original)
    record={'game':slug,'url':metadata['liveUrl'],'tlsVerified':True,'servedGameSourceMatches':matched,'normalization':'Removed only Craftian app metadata, SDK import map, app-menu injection and leading head whitespace.','sourceSha256':hashlib.sha256(original.encode()).hexdigest(),'passed':matched}
    (ROOT/slug/'HOSTED_SOURCE_VERIFICATION.json').write_text(json.dumps(record,indent=2)+'\n')
    return record

if __name__=='__main__':
    with ThreadPoolExecutor(max_workers=4) as pool:
        records=list(pool.map(check,PROJECTS.items()))
    for record in records:print(json.dumps(record),flush=True)
    if not all(record['passed'] for record in records):raise SystemExit(1)
