#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${GODOT_BIN:=godot}"
: "${GODOT_ANDROID_KEYSTORE_RELEASE_PATH:?Set your private release keystore path}"
: "${GODOT_ANDROID_KEYSTORE_RELEASE_USER:?Set your private release alias}"
: "${GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD:?Set your private release password}"
export GODOT_ANDROID_KEYSTORE_RELEASE_PATH GODOT_ANDROID_KEYSTORE_RELEASE_USER GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD
mkdir -p build
"$GODOT_BIN" --headless --editor --import --quit
"$GODOT_BIN" --headless --export-release Android build/Primordia-1.1.0-Android.apk
