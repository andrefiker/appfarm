#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
: "${BT:?Set BT to Android Build Tools 35.0.0}"
: "${ANDROID_JAR:?Set ANDROID_JAR to platform 35 android.jar}"
: "${NEURO_KEYSTORE:?Set NEURO_KEYSTORE to the private dedicated PKCS12 file}"
: "${NEURO_PASS_FILE:?Set NEURO_PASS_FILE to a private file containing its password}"
OUT="$ROOT/build"
rm -rf "$OUT/classes" "$OUT/dex"
mkdir -p "$OUT/classes" "$OUT/dex"
"$BT/aapt2" compile --dir "$ROOT/android/res" -o "$OUT/res.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$ANDROID_JAR" --manifest "$ROOT/android/AndroidManifest.xml" --min-sdk-version 26 --target-sdk-version 35 -A "$ROOT/web" "$OUT/res.zip"
if [[ -n "${ECJ_JAR:-}" ]]; then
 java -jar "$ECJ_JAR" -1.8 -classpath "$ANDROID_JAR" -d "$OUT/classes" "$ROOT/android/src/com/andrefiker/neuroatlas/MainActivity.java"
else
 javac -source 8 -target 8 -bootclasspath "$ANDROID_JAR" -d "$OUT/classes" "$ROOT/android/src/com/andrefiker/neuroatlas/MainActivity.java"
fi
mapfile -t classes < <(find "$OUT/classes" -name '*.class' | sort)
"$BT/d8" --release --thread-count 1 --lib "$ANDROID_JAR" --min-api 26 --output "$OUT/dex" "${classes[@]}"
python3 "$ROOT/tools/normalize-apk.py" "$OUT/base.apk" "$OUT/dex/classes.dex" "$OUT/unsigned.apk"
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
"$BT/apksigner" sign --ks "$NEURO_KEYSTORE" --ks-key-alias neuroatlas --ks-pass "file:$NEURO_PASS_FILE" --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out "$OUT/NEUROATLAS-v1.0.0.apk" "$OUT/aligned.apk"
"$BT/apksigner" verify --verbose --print-certs "$OUT/NEUROATLAS-v1.0.0.apk" > "$OUT/signature.txt"
"$BT/aapt" dump badging "$OUT/NEUROATLAS-v1.0.0.apk" > "$OUT/package.txt"
"$BT/aapt" dump permissions "$OUT/NEUROATLAS-v1.0.0.apk" > "$OUT/permissions.txt"
"$BT/zipalign" -c 4 "$OUT/NEUROATLAS-v1.0.0.apk"
sha256sum "$OUT/NEUROATLAS-v1.0.0.apk"
