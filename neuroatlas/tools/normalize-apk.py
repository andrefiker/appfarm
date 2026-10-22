"""Fix ZIP order/metadata before alignment and signing for deterministic rebuilds."""
from pathlib import Path
import sys, zipfile
base, dex, output = map(Path, sys.argv[1:])
with zipfile.ZipFile(base) as src, zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as dst:
    entries={n:src.read(n) for n in src.namelist() if not n.endswith('/')}
    entries['classes.dex']=dex.read_bytes()
    for name,data in sorted(entries.items()):
        info=zipfile.ZipInfo(name,(2026,10,22,0,0,0))
        info.create_system=3
        info.external_attr=0o100644<<16
        # Android 11+ rejects a compressed resource table for target API 30+.
        # zipalign runs after this step and can only align stored ZIP entries.
        info.compress_type=zipfile.ZIP_STORED if name=='resources.arsc' else zipfile.ZIP_DEFLATED
        dst.writestr(info,data,compress_type=info.compress_type,compresslevel=9)
