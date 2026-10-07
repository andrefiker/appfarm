#!/usr/bin/env bash
set -euo pipefail
mkdir -p build/core
javac -d build/core app/src/main/java/com/andrefiker/clinicalcockpit/{VaultCrypto,Rules,Docx,PatientRoster}.java tests/CoreTest.java tests/CoreRosterTest.java
java -cp build/core CoreTest
java -cp build/core CoreRosterTest
