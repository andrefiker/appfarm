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
        info.compress_type=zipfile.ZIP_DEFLATED
        dst.writestr(info,data,compress_type=zipfile.ZIP_DEFLATED,compresslevel=9)
