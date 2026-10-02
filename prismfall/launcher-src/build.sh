#!/usr/bin/env bash
# Builds Prismfall.exe (Windows x64, no console window) with the game embedded.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
game="$(cd "$here/.." && pwd)"
rm -rf "$here/game" && mkdir -p "$here/game/assets"
cp "$game/index.html" "$here/game/"
cp -r "$game/assets/." "$here/game/assets/"
cd "$here"
if command -v go-winres >/dev/null 2>&1 || [ -x "$HOME/go/bin/go-winres" ]; then
  WR="$(command -v go-winres || echo "$HOME/go/bin/go-winres")"
  "$WR" simply --icon "$game/assets/sprites/icon-256.png" --product-name Prismfall --file-description "Prismfall launcher" --product-version 1.0.0 --file-version 1.0.0 --arch amd64 >/dev/null
fi
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -trimpath -ldflags "-H windowsgui -s -w" -o "$game/Prismfall.exe" .
# a Linux build of the same source, used only for local verification
CGO_ENABLED=0 go build -trimpath -o "$here/prismfall-launcher-linux" .
rm -rf "$here/game"
ls -l "$game/Prismfall.exe"
