#!/usr/bin/env bash
set -euo pipefail
cc_root="$(cd "$(dirname "$0")" && pwd)"
cc_sdk="${CC_ANDROID_SDK:?Set CC_ANDROID_SDK to an installed SDK with platform35/build-tools35.0.0}"
cc_ecj="${CC_ECJ_JAR:?Set CC_ECJ_JAR to ecj3.38.0.jar}"
cc_tools="$cc_sdk/build-tools/35.0.0"
cc_jar="$cc_sdk/platforms/android-35/android.jar"
mkdir -p "$cc_root/build/classes" "$cc_root/build/generated" "$cc_root/build/dex" "$cc_root/build/assets" "$cc_root/delivery"
python3 "$cc_root/build-web.py"
cp "$cc_root/web/index.html" "$cc_root/build/assets/index.html"
"$cc_tools/aapt" package -f -M "$cc_root/android/AndroidManifest.xml" -S "$cc_root/android/res" -A "$cc_root/build/assets" -I "$cc_jar" -J "$cc_root/build/generated" -F "$cc_root/build/unsigned.apk"
java -jar "$cc_ecj" -8 -classpath "$cc_jar" -d "$cc_root/build/classes" "$cc_root/android/src/com/andrefiker/commandcenter/MainActivity.java"
python3 - "$cc_root" <<'PY'
import sys,zipfile,pathlib
r=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(r/'build/classes.jar','w') as z:
 for p in (r/'build/classes').rglob('*.class'):z.write(p,p.relative_to(r/'build/classes'))
PY
"$cc_tools/d8" --lib "$cc_jar" --min-api 28 --output "$cc_root/build/dex" "$cc_root/build/classes.jar"
(cd "$cc_root/build/dex" && "$cc_tools/aapt" add "$cc_root/build/unsigned.apk" classes.dex)
"$cc_tools/zipalign" -f -p 4 "$cc_root/build/unsigned.apk" "$cc_root/build/aligned.apk"
if [ ! -f "$cc_root/delivery/command-center-signing.p12" ]; then
 keytool -genkeypair -keystore "$cc_root/delivery/command-center-signing.p12" -storetype PKCS12 -storepass android -keypass android -alias commandcenter -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Andre Fiker Command Center,O=AppFarm,C=BR'
fi
"$cc_tools/apksigner" sign --v1-signing-enabled false --v2-signing-enabled true --v3-signing-enabled true --ks "$cc_root/delivery/command-center-signing.p12" --ks-pass pass:android --key-pass pass:android --ks-key-alias commandcenter --out "$cc_root/delivery/Command-Center-v1.0.0.apk" "$cc_root/build/aligned.apk"
"$cc_tools/apksigner" verify --verbose --print-certs "$cc_root/delivery/Command-Center-v1.0.0.apk" > "$cc_root/evidence/apk-signature.txt"
"$cc_tools/aapt" dump badging "$cc_root/delivery/Command-Center-v1.0.0.apk" > "$cc_root/evidence/apk-badging.txt"
"$cc_tools/zipalign" -c -p 4 "$cc_root/delivery/Command-Center-v1.0.0.apk"
printf 'Built %s\n' "$cc_root/delivery/Command-Center-v1.0.0.apk"
