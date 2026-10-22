"""Regression coverage for the v1.0.0 Android installation failure."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
from apk_layout import verify_resource_table


class ResourceTableLayout(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name)

    def fixture(self, compression, prefix=False):
        apk = self.path / "fixture.apk"
        with zipfile.ZipFile(apk, "w") as archive:
            if prefix:
                archive.writestr("prefix", b"x")
            archive.writestr("resources.arsc", b"table", compress_type=compression)
        return apk

    def test_rejects_compressed_table_even_if_aligned(self):
        with self.assertRaisesRegex(ValueError, "is compressed"):
            verify_resource_table(self.fixture(zipfile.ZIP_DEFLATED))

    def test_rejects_uncompressed_but_misaligned_table(self):
        with self.assertRaisesRegex(ValueError, "not 4-byte aligned"):
            verify_resource_table(self.fixture(zipfile.ZIP_STORED, prefix=True))

    def test_accepts_uncompressed_aligned_table(self):
        result = verify_resource_table(self.fixture(zipfile.ZIP_STORED))
        self.assertEqual(result["dataOffset"], 44)

    def test_normalization_does_not_recompress_resource_table(self):
        base = self.fixture(zipfile.ZIP_STORED)
        dex = self.path / "classes.dex"
        dex.write_bytes(b"dex\n")
        output = self.path / "normalized.apk"
        subprocess.run([sys.executable, str(ROOT / "tools/normalize-apk.py"),
                        str(base), str(dex), str(output)], check=True)
        with zipfile.ZipFile(output) as archive:
            self.assertEqual(archive.getinfo("resources.arsc").compress_type,
                             zipfile.ZIP_STORED)
            self.assertEqual(archive.read("classes.dex"), dex.read_bytes())


if __name__ == "__main__":
    unittest.main(verbosity=2)
