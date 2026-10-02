#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Prefer an explicitly configured SDK; otherwise reuse the verified SDK cache
# and ECJ compiler that produced the earlier local WebView game APKs.
SDK="${ANDROID_HOME:-/workspace/scratch/d7c2015d01f9/tools/sdk}"
ECJ_JAR="${ECJ_JAR:-/workspace/scratch/d7c2015d01f9/desktop-disaster-kit/tools-ecj.jar}"
BT="$SDK/build-tools/35.0.0"
[[ -d "$BT/android-15" ]] && BT="$BT/android-15"
ANDROID_JAR="$SDK/platforms/android-35/android.jar"
[[ -f "$ANDROID_JAR" ]] || ANDROID_JAR="$SDK/platforms/android-35/android-35/android.jar"

[[ -x "$BT/aapt2" && -x "$BT/aapt" && -x "$BT/d8" && -x "$BT/zipalign" && -x "$BT/apksigner" ]] || { echo "Android Build Tools 35.0.0 are missing under $SDK" >&2; exit 2; }
[[ -f "$ANDROID_JAR" ]] || { echo "Android platform 35 android.jar is missing under $SDK" >&2; exit 2; }
if ! command -v javac >/dev/null 2>&1 && [[ ! -f "$ECJ_JAR" ]]; then
  echo 'Java compiler unavailable: install javac or set ECJ_JAR to an Eclipse ECJ compiler jar.' >&2
  exit 2
fi

npm run build
OUT="$ROOT/android-build"
rm -rf "$OUT"
mkdir -p "$OUT/assets" "$OUT/compiled" "$OUT/classes" "$OUT/dex"
cp -R "$ROOT/dist/." "$OUT/assets/"

"$BT/aapt2" compile --dir "$ROOT/android/res" -o "$OUT/compiled.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$ANDROID_JAR" \
  --manifest "$ROOT/android/AndroidManifest.xml" \
  --min-sdk-version 26 --target-sdk-version 34 \
  -A "$OUT/assets" "$OUT/compiled.zip"

JAVA_SOURCE="$ROOT/android/src/com/andrefiker/quietsolitaire/MainActivity.java"
if command -v javac >/dev/null 2>&1; then
  javac -source 8 -target 8 -bootclasspath "$ANDROID_JAR" -d "$OUT/classes" "$JAVA_SOURCE"
else
  java -jar "$ECJ_JAR" -1.8 -classpath "$ANDROID_JAR" -d "$OUT/classes" "$JAVA_SOURCE"
fi
mapfile -d '' CLASS_FILES < <(find "$OUT/classes" -name '*.class' -print0)
"$BT/d8" --lib "$ANDROID_JAR" --min-api 26 --output "$OUT/dex" "${CLASS_FILES[@]}"
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT/dex" && zip -q "$OUT/unsigned.apk" classes.dex)
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

# This is a local installable test signature. The private key is intentionally
# temporary and is removed after signing; no signing secret enters the source.
KEYSTORE="$OUT/temporary-test-key.p12"
KEY_PASS="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(24).toString("hex"))')"
keytool -genkeypair -noprompt -keystore "$KEYSTORE" -storetype PKCS12 \
  -storepass "$KEY_PASS" -keypass "$KEY_PASS" -alias quietsolitaire \
  -keyalg RSA -keysize 3072 -validity 10000 \
  -dname 'CN=Quiet Solitaire Local Test,O=Andre Fiker,C=BR' >/dev/null 2>&1
"$BT/apksigner" sign --ks "$KEYSTORE" --ks-key-alias quietsolitaire \
  --ks-pass "pass:$KEY_PASS" --key-pass "pass:$KEY_PASS" \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$ROOT/Quiet-Solitaire.apk" "$OUT/aligned.apk"
rm -f "$KEYSTORE"
unset KEY_PASS

"$BT/apksigner" verify --min-sdk-version 26 --verbose --print-certs "$ROOT/Quiet-Solitaire.apk" > "$OUT/apk-signature.txt"
"$BT/zipalign" -c -v 4 "$ROOT/Quiet-Solitaire.apk" > "$OUT/apk-alignment.txt"
"$BT/aapt" dump badging "$ROOT/Quiet-Solitaire.apk" > "$OUT/apk-badging.txt"
"$BT/aapt" dump permissions "$ROOT/Quiet-Solitaire.apk" > "$OUT/apk-permissions.txt"

python3 - "$ROOT" "$OUT" <<'PY'
from pathlib import Path
import hashlib,sys,zipfile
root,out=Path(sys.argv[1]),Path(sys.argv[2]); apk=root/'Quiet-Solitaire.apk'
with zipfile.ZipFile(apk) as z:
    assert z.testzip() is None, 'APK ZIP integrity check failed'
    names=set(z.namelist())
    required={'AndroidManifest.xml','classes.dex','resources.arsc','assets/index.html','assets/manifest.webmanifest','assets/service-worker.js','assets/src/app.js','assets/src/engine.js','assets/src/style.css','assets/public/icon.svg'}
    assert required <= names, f'Missing packaged files: {sorted(required-names)}'
    for path in (root/'dist').rglob('*'):
        if path.is_file():
            entry='assets/'+path.relative_to(root/'dist').as_posix()
            assert z.read(entry)==path.read_bytes(), f'Packaged asset differs from current PWA: {entry}'
    assert not any(name.startswith(('res/raw/','assets/vendor/')) for name in names), 'Unexpected unrelated/vendor assets found'
print('APK_SHA256='+hashlib.sha256(apk.read_bytes()).hexdigest())
print('PWA_INDEX_SHA256='+hashlib.sha256((root/'dist/index.html').read_bytes()).hexdigest())
print('PACKAGED_PWA_ASSETS_MATCH=PASS')
print('APK_ZIP_INTEGRITY=PASS')
PY

grep -F "package: name='com.andrefiker.quietsolitaire'" "$OUT/apk-badging.txt" >/dev/null
grep -F "application-label:'Quiet Solitaire'" "$OUT/apk-badging.txt" >/dev/null
if grep -q 'android.permission.INTERNET' "$OUT/apk-permissions.txt"; then
  echo 'Unexpected INTERNET permission in APK.' >&2; exit 3
fi
printf '%s\n' 'PACKAGE_ID=com.andrefiker.quietsolitaire' 'APPLICATION_NAME=Quiet Solitaire' 'INTERNET_PERMISSION=absent' >> "$OUT/apk-badging.txt"
cat "$OUT/apk-badging.txt"
cat "$OUT/apk-alignment.txt"
cat "$OUT/apk-signature.txt"
echo "Built and verified: $ROOT/Quiet-Solitaire.apk"
cp "$ROOT/Quiet-Solitaire.apk" "$ROOT/Quiet-Solitaire-v1.3.0.apk"
echo "Release APK: $ROOT/Quiet-Solitaire-v1.3.0.apk"
