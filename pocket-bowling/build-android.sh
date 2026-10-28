#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$PWD"
: "${ANDROID_HOME:?Set ANDROID_HOME to an Android SDK with platform 35 and build tools 35.0.0}"
BT="$ANDROID_HOME/build-tools/35.0.0"
[[ ! -d "$BT/android-15" ]] || BT="$BT/android-15"
AJ="$ANDROID_HOME/platforms/android-35/android.jar"
[[ -f "$AJ" ]] || AJ="$ANDROID_HOME/platforms/android-35/android-35/android.jar"
npm test
npm run build
OUT="$ROOT/android-build"
mkdir -p "$OUT/classes" "$OUT/dex"
"$BT/aapt2" compile --dir android/res -o "$OUT/compiled.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$AJ" --manifest android/AndroidManifest.xml --min-sdk-version 26 --target-sdk-version 34 -A dist "$OUT/compiled.zip"
if command -v javac >/dev/null; then
 javac -source 8 -target 8 -bootclasspath "$AJ" -d "$OUT/classes" android/src/com/andrefiker/pocketbowling/MainActivity.java
else
 java -jar "${ECJ_JAR:?Set ECJ_JAR when javac is unavailable}" -1.8 -classpath "$AJ" -d "$OUT/classes" android/src/com/andrefiker/pocketbowling/MainActivity.java
fi
mapfile -d '' CLASSES < <(find "$OUT/classes" -name '*.class' -print0)
"$BT/d8" --lib "$AJ" --min-api 26 --output "$OUT/dex" "${CLASSES[@]}"
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT/dex" && zip -q "$OUT/unsigned.apk" classes.dex)
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
# Standard, explicitly non-production debug signature. Key stays outside source.
KEY="${POCKET_DEBUG_KEYSTORE:-$HOME/.android/debug.keystore}"
if [[ ! -f "$KEY" ]]; then
 mkdir -p "$(dirname "$KEY")"
 keytool -genkeypair -noprompt -keystore "$KEY" -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Android Debug,O=Android,C=US'
fi
"$BT/apksigner" sign --ks "$KEY" --ks-pass pass:android --key-pass pass:android --ks-key-alias androiddebugkey --v1-signing-enabled true --v2-signing-enabled true --v3-signing-enabled true --out Pocket-Bowling-v1.0.0.apk "$OUT/aligned.apk"
"$BT/apksigner" verify --verbose --print-certs Pocket-Bowling-v1.0.0.apk > "$OUT/signature.txt"
"$BT/zipalign" -c -v 4 Pocket-Bowling-v1.0.0.apk > "$OUT/alignment.txt"
"$BT/aapt" dump badging Pocket-Bowling-v1.0.0.apk > "$OUT/badging.txt"
"$BT/aapt" dump permissions Pocket-Bowling-v1.0.0.apk > "$OUT/permissions.txt"
python3 scripts/verify-apk.py
sha256sum Pocket-Bowling-v1.0.0.apk | tee "$OUT/SHA256SUMS.txt"
