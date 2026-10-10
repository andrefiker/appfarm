#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")/.."
if [ ! -f signing/debug.keystore ]; then
  mkdir -p signing
  keytool -genkeypair -keystore signing/debug.keystore -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Screen Time Widget Debug,O=Andre Fiker,C=BR'
fi
