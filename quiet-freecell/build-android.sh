#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
SDK="${ANDROID_HOME:?Set ANDROID_HOME to an Android SDK with platform and build tools 35}"
BT="$SDK/build-tools/35.0.0"; JAR="$SDK/platforms/android-35/android.jar"; OUT=android-build-v1.0.1
mkdir -p "$OUT"
rm -rf "$OUT/assets" "$OUT/classes" "$OUT/dex"
mkdir -p "$OUT/assets" "$OUT/classes" "$OUT/dex"
cp index.html style.css app.js engine.js statistics.js challenges.js clock.js storage.js "$OUT/assets/"
"$BT/aapt2" compile --dir android/res -o "$OUT/compiled.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$JAR" --manifest android/AndroidManifest.xml --min-sdk-version 26 --target-sdk-version 34 -A "$OUT/assets" "$OUT/compiled.zip"
javac -source 8 -target 8 -bootclasspath "$JAR" -d "$OUT/classes" android/src/com/andrefiker/quietfreecell/MainActivity.java
mapfile -d '' CLASSES < <(find "$OUT/classes" -name '*.class' -print0)
"$BT/d8" --lib "$JAR" --min-api 26 --output "$OUT/dex" "${CLASSES[@]}"
cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT/dex" && zip -q ../unsigned.apk classes.dex)
"$BT/zipalign" -f 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"
# Use the existing local Android debug key; never create or upload a key here.
DEBUG_KEYSTORE="${ANDROID_DEBUG_KEYSTORE:-$HOME/.android/debug.keystore}"
test -f "$DEBUG_KEYSTORE" || { echo "Android debug keystore not found" >&2; exit 1; }
"$BT/apksigner" sign --ks "$DEBUG_KEYSTORE" --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out "$OUT/Quiet-FreeCell-test.apk" "$OUT/aligned.apk"
"$BT/apksigner" verify --min-sdk-version 26 --verbose --print-certs "$OUT/Quiet-FreeCell-test.apk"
"$BT/aapt" dump badging "$OUT/Quiet-FreeCell-test.apk" | head -10
"$BT/aapt" dump permissions "$OUT/Quiet-FreeCell-test.apk"
sha256sum "$OUT/Quiet-FreeCell-test.apk"
