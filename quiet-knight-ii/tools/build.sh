#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
QK_BUILD_TOOLS="${QK_BUILD_TOOLS:-$PWD/.toolchain/android-15}"
QK_ANDROID_JAR="${QK_ANDROID_JAR:-$PWD/.toolchain/android-35/android.jar}"
QK_ECJ_JAR="${QK_ECJ_JAR:-$PWD/.toolchain/ecj.jar}"
mkdir -p build/classes build/generated build/dex
"$QK_BUILD_TOOLS/aapt" package -f -m -J build/generated -M android/AndroidManifest.xml -S android/res -A web -I "$QK_ANDROID_JAR" -F build/resources.apk
mapfile -t sources < <(find android/src build/generated -name '*.java' -type f | sort)
java -jar "$QK_ECJ_JAR" -source 1.8 -target 1.8 -bootclasspath "$QK_ANDROID_JAR:$QK_BUILD_TOOLS/core-lambda-stubs.jar" -d build/classes "${sources[@]}"
mapfile -t classes < <(find build/classes -name '*.class' -type f | sort)
"$QK_BUILD_TOOLS/d8" --release --min-api 28 --lib "$QK_ANDROID_JAR" --output build/dex "${classes[@]}"
python3 - <<'PY'
from pathlib import Path
import shutil,zipfile
shutil.copyfile('build/resources.apk','build/unsigned.apk')
with zipfile.ZipFile('build/unsigned.apk','a',compression=zipfile.ZIP_DEFLATED) as z:
 for p in sorted(Path('build/dex').glob('*.dex')):z.write(p,p.name)
PY
"$QK_BUILD_TOOLS/zipalign" -f -p 4 build/unsigned.apk build/aligned.apk
if [[ -n "${QK_KEYSTORE:-}" && -n "${QK_STOREPASS_FILE:-}" ]]; then
 # PKCS12 uses the keystore password for its key. Supplying the same password
 # file twice makes apksigner consume a second (missing) line from that file.
 "$QK_BUILD_TOOLS/apksigner" sign --ks "$QK_KEYSTORE" --ks-key-alias quiet-knight-ii --ks-pass "file:$QK_STOREPASS_FILE" --out build/Quiet-Knight-II-1.0.2.apk build/aligned.apk
 "$QK_BUILD_TOOLS/apksigner" verify --min-sdk-version 24 --verbose --print-certs build/Quiet-Knight-II-1.0.2.apk
 sha256sum build/Quiet-Knight-II-1.0.2.apk
else
 echo 'Unsigned compilation complete: build/aligned.apk. Set the two signing environment variables for an installable release.'
fi
