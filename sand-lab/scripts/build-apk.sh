#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${ANDROID_HOME:?Set ANDROID_HOME to SDK with platform/build-tools 35}"
BT="$ANDROID_HOME/build-tools/35.0.0"
JAR="$ANDROID_HOME/platforms/android-35/android.jar"
OUT="$PWD/android-build"
npm run build
rm -rf "$OUT"
mkdir -p "$OUT/classes" "$OUT/dex"
python3 - <<'PY'
from pathlib import Path
s=Path('android/app/src/main/AndroidManifest.xml').read_text().replace('<manifest ', '<manifest package="com.andrefiker.sandlab" android:versionCode="1" android:versionName="1.0.0" ')
Path('android-build/AndroidManifest.xml').write_text(s)
PY
"$BT/aapt2" compile --dir android/app/src/main/res -o "$OUT/res.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$JAR" --manifest "$OUT/AndroidManifest.xml" --min-sdk-version 26 --target-sdk-version 35 -A dist "$OUT/res.zip"
SRC=android/app/src/main/java/com/andrefiker/sandlab/MainActivity.java
if command -v javac >/dev/null; then javac -source 8 -target 8 -bootclasspath "$JAR" -d "$OUT/classes" "$SRC"; else java -jar "${ECJ_JAR:?Set ECJ_JAR or install javac}" -1.8 -classpath "$JAR" -d "$OUT/classes" "$SRC"; fi
mapfile -d '' CLASSES < <(find "$OUT/classes" -name '*.class' -print0)
"$BT/d8" --lib "$JAR" --min-api 26 --output "$OUT/dex" "${CLASSES[@]}"
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT/dex" && zip -q "$OUT/unsigned.apk" classes.dex)
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
# First release uses a test key. Keep it private for in-place upgrades.
KEY="${SANDLAB_KEYSTORE:-$OUT/test-key.p12}"
if [ ! -f "$KEY" ]; then keytool -genkeypair -noprompt -keystore "$KEY" -storetype PKCS12 -storepass android -keypass android -alias sandlab -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=SAND LAB Test,O=Andre Fiker,C=BR'; fi
"$BT/apksigner" sign --ks "$KEY" --ks-key-alias sandlab --ks-pass pass:android --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out Sand-Lab-v1.0.0.apk "$OUT/aligned.apk"
"$BT/apksigner" verify --verbose --print-certs Sand-Lab-v1.0.0.apk | tee "$OUT/signature.txt"
"$BT/zipalign" -c 4 Sand-Lab-v1.0.0.apk
"$BT/aapt" dump badging Sand-Lab-v1.0.0.apk | tee "$OUT/badging.txt"
"$BT/aapt" dump permissions Sand-Lab-v1.0.0.apk | tee "$OUT/permissions.txt"
! grep -q uses-permission "$OUT/permissions.txt"
grep -q "package: name='com.andrefiker.sandlab' versionCode='1' versionName='1.0.0'" "$OUT/badging.txt"
python3 scripts/verify-apk.py
sha256sum Sand-Lab-v1.0.0.apk | tee "$OUT/SHA256SUMS.txt"
