#!/bin/sh
set -eu
# Usage: sign-apk.sh INPUT.apk PRESERVED-KEY.p12 OUTPUT.apk
: "${ANDROID_HOME:?Set ANDROID_HOME to an Android SDK with build-tools 35.0.0}"
"$ANDROID_HOME/build-tools/35.0.0/apksigner" sign \
 --ks "$2" --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android \
 --v1-signing-enabled false --v2-signing-enabled true --v3-signing-enabled true \
 --out "$3" "$1"
"$ANDROID_HOME/build-tools/35.0.0/apksigner" verify --verbose --print-certs "$3"
