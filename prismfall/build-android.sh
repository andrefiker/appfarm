#!/usr/bin/env bash
# Builds and verifies the Prismfall Android APK (offline WebView shell, no Gradle).
# Needs: Android SDK with platforms;android-35 and build-tools;35.0.0, plus a JDK.
# Usage: ANDROID_HOME=/path/to/sdk ./build-android.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
VERSION="1.0.0"
SDK="${ANDROID_HOME:?set ANDROID_HOME to an Android SDK}"
BT="$SDK/build-tools/35.0.0"
ANDROID_JAR="$SDK/platforms/android-35/android.jar"
for t in aapt2 aapt d8 zipalign apksigner; do [[ -x "$BT/$t" ]] || { echo "missing build tool: $BT/$t" >&2; exit 2; }; done
[[ -f "$ANDROID_JAR" ]] || { echo "missing $ANDROID_JAR" >&2; exit 2; }

OUT="$ROOT/android-build"
rm -rf "$OUT"
mkdir -p "$OUT/assets/assets" "$OUT/classes" "$OUT/dex" "$ROOT/dist"
# the game exactly as it ships on desktop: index.html + assets/
cp "$ROOT/index.html" "$OUT/assets/"
cp -R "$ROOT/assets/." "$OUT/assets/assets/"

"$BT/aapt2" compile --dir "$ROOT/android/res" -o "$OUT/compiled.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$ANDROID_JAR" \
  --manifest "$ROOT/android/AndroidManifest.xml" \
  --min-sdk-version 26 --target-sdk-version 34 \
  -A "$OUT/assets" "$OUT/compiled.zip"

javac -source 8 -target 8 -nowarn -Xlint:-options -bootclasspath "$ANDROID_JAR" -classpath "$ANDROID_JAR" \
  -d "$OUT/classes" "$ROOT/android/src/com/andrefiker/prismfall/MainActivity.java"
mapfile -d '' CLASS_FILES < <(find "$OUT/classes" -name '*.class' -print0)
"$BT/d8" --lib "$ANDROID_JAR" --min-api 26 --output "$OUT/dex" "${CLASS_FILES[@]}"
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT/dex" && zip -q "$OUT/unsigned.apk" classes.dex)
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

# Installable test signature: a throwaway key generated per build and deleted after signing.
# (Each build is signed differently, so uninstall the old build before installing a new one.)
KEYSTORE="$OUT/temporary-test-key.p12"
KEY_PASS="$(openssl rand -hex 24)"
keytool -genkeypair -noprompt -keystore "$KEYSTORE" -storetype PKCS12 \
  -storepass "$KEY_PASS" -keypass "$KEY_PASS" -alias prismfall \
  -keyalg RSA -keysize 3072 -validity 10000 \
  -dname 'CN=Prismfall Local Test,O=Andre Fiker,C=BR' >/dev/null 2>&1
APK="$ROOT/dist/Prismfall-v$VERSION.apk"
"$BT/apksigner" sign --ks "$KEYSTORE" --ks-key-alias prismfall \
  --ks-pass "pass:$KEY_PASS" --key-pass "pass:$KEY_PASS" \
  --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true \
  --out "$APK" "$OUT/aligned.apk"
rm -f "$KEYSTORE"
unset KEY_PASS

# ---- verification
"$BT/apksigner" verify --min-sdk-version 26 --verbose --print-certs "$APK" > "$OUT/apk-signature.txt"
"$BT/zipalign" -c -v 4 "$APK" > "$OUT/apk-alignment.txt"
"$BT/aapt" dump badging "$APK" > "$OUT/apk-badging.txt"
"$BT/aapt" dump permissions "$APK" > "$OUT/apk-permissions.txt"
python3 - "$ROOT" "$APK" <<'PY'
from pathlib import Path
import hashlib, sys, zipfile
root, apk = Path(sys.argv[1]), Path(sys.argv[2])
with zipfile.ZipFile(apk) as z:
    assert z.testzip() is None, 'APK ZIP integrity check failed'
    names = set(z.namelist())
    need = {'AndroidManifest.xml', 'classes.dex', 'resources.arsc', 'assets/index.html',
            'assets/assets/game.js', 'assets/assets/art.js', 'assets/assets/audio.js', 'assets/assets/style.css'}
    assert need <= names, f'missing: {sorted(need - names)}'
    files = [root / 'index.html'] + [p for p in (root / 'assets').rglob('*') if p.is_file()]
    for f in files:
        entry = 'assets/' + f.relative_to(root).as_posix()
        assert z.read(entry) == f.read_bytes(), f'packaged file differs: {entry}'
print('PACKAGED_GAME_FILES=' + str(len(files)) + ' MATCH=PASS')
print('APK_SHA256=' + hashlib.sha256(apk.read_bytes()).hexdigest())
PY
grep -F "package: name='com.andrefiker.prismfall'" "$OUT/apk-badging.txt" >/dev/null
grep -F "application-label:'Prismfall'" "$OUT/apk-badging.txt" >/dev/null
if grep -q 'android.permission.INTERNET' "$OUT/apk-permissions.txt"; then echo 'Unexpected INTERNET permission' >&2; exit 3; fi
echo 'INTERNET_PERMISSION=absent'
head -n 3 "$OUT/apk-badging.txt"
tail -n 1 "$OUT/apk-alignment.txt"
grep -E 'Verified using|Signer #1 certificate SHA-256' "$OUT/apk-signature.txt"
mkdir -p "$ROOT/dist/reports"
cp "$OUT"/apk-*.txt "$ROOT/dist/reports/"
ls -l "$APK"
echo "Built and verified: $APK"
