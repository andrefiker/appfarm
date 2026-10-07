#!/usr/bin/env bash
set -euo pipefail
mkdir -p build/core
javac -d build/core app/src/main/java/com/andrefiker/clinicalcockpit/{VaultCrypto,Rules,Docx}.java tests/CoreTest.java
java -cp build/core CoreTest
