"""Check the resource-table installation rule for NEUROATLAS (target API 35).

zipalign alone does not reject a compressed resources.arsc. Android 11+ does:
https://developer.android.com/about/versions/11/behavior-changes-11#compressed-resource-files
"""
import json
from pathlib import Path
import struct
import sys
import zipfile


def inspect_resource_table(apk):
    with zipfile.ZipFile(apk) as archive, Path(apk).open("rb") as stream:
        if archive.namelist().count("resources.arsc") != 1:
            raise ValueError("APK must contain exactly one resources.arsc")
        entry = archive.getinfo("resources.arsc")
        stream.seek(entry.header_offset)
        header = stream.read(30)
        if len(header) != 30 or header[:4] != b"PK\x03\x04":
            raise ValueError("Invalid resources.arsc local ZIP header")
        flags, method = struct.unpack_from("<HH", header, 6)
        if flags & 1 or method != entry.compress_type:
            raise ValueError("Encrypted or inconsistent resource-table ZIP entry")
        name_length, extra_length = struct.unpack_from("<HH", header, 26)
        offset = entry.header_offset + 30 + name_length + extra_length
        return {
            "entry": entry.filename,
            "compressionMethod": method,
            "uncompressed": method == zipfile.ZIP_STORED,
            "dataOffset": offset,
            "aligned4Bytes": offset % 4 == 0,
        }


def verify_resource_table(apk):
    result = inspect_resource_table(apk)
    failures = []
    if not result["uncompressed"]:
        failures.append("resources.arsc is compressed")
    if not result["aligned4Bytes"]:
        failures.append("resources.arsc is not 4-byte aligned")
    if failures:
        raise ValueError("Android API 30+ installation rule: " + "; ".join(failures))
    return result


if __name__ == "__main__":
    try:
        print(json.dumps(verify_resource_table(sys.argv[1]), indent=2))
    except (ValueError, zipfile.BadZipFile, OSError) as error:
        sys.exit(str(error))
