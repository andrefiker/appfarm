"""Split the installer into small download artifacts without changing its bytes."""
import hashlib
from pathlib import Path

release = Path(__file__).with_name('release')
installer = release / 'Quiet-Solitaire-Windows-Setup-v1.4.0.exe'
data = installer.read_bytes()
(release / 'installer.sha256').write_text(f'{hashlib.sha256(data).hexdigest()}  {installer.name}\n')
chunks = release / 'chunks'
chunks.mkdir(exist_ok=True)
for index, start in enumerate(range(0, len(data), 24 * 1024 * 1024)):
    (chunks / f'part-{index:02d}').write_bytes(data[start:start + 24 * 1024 * 1024])
print(f'{installer.name}: {len(data)} bytes, {index + 1} parts')
