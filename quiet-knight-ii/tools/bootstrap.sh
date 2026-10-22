#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .toolchain
cd .toolchain
fetch() { curl --fail --location --silent --show-error "$1" -o "$2"; echo "$3  $2" | sha256sum --check; }
fetch https://dl.google.com/android/repository/build-tools_r35_linux.zip build-tools.zip bd3a4966912eb8b30ed0d00b0cda6b6543b949d5ffe00bea54c04c81e1561d88
fetch https://dl.google.com/android/repository/platform-35_r02.zip platform.zip 0988cacad01b38a18a47bac14a0695f246bc76c1b06c0eeb8eb0dc825ab0c8e0
fetch https://repo.maven.apache.org/maven2/org/eclipse/jdt/ecj/3.38.0/ecj-3.38.0.jar ecj.jar 97c566b120009c203a2fc8b291f4a9adbc171cf1ccb70f06f6b4e1828c00ce8e
unzip -qo build-tools.zip
unzip -qo platform.zip
