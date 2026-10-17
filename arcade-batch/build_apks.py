#!/usr/bin/env python3
"""Build one approved arcade game and verify its signed offline Android APK.

Set JAVA_HOME, ANDROID_HOME and GRADLE_BIN to use another installed toolchain.
Signing material stays in each game's ignored private-signing directory.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parent.parent
GAMES = json.loads((ROOT / 'arcade-batch/games.json').read_text())
TOOLING = Path('/workspace/scratch/73633411c23a/tooling')
JDK = Path(os.environ.get('JAVA_HOME', TOOLING / 'jdk-17.0.16+8'))
SDK = Path(os.environ.get('ANDROID_HOME', TOOLING / 'sdk'))
GRADLE = os.environ.get('GRADLE_BIN', str(TOOLING / 'gradle-8.10.2/bin/gradle'))
BUILD_TOOLS = SDK / 'build-tools/35.0.0'

def run(args, env=None):
    result = subprocess.run([str(x) for x in args], env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    if result.returncode:
        raise RuntimeError(result.stdout)
    return result.stdout

def build(slug):
    game = next(g for g in GAMES if g['slug'] == slug)
    folder = ROOT / slug
    html = folder / 'index.html'
    if not html.is_file():
        raise RuntimeError(f'{slug}: final index.html missing')
    source = html.read_text()
    if re.search(r'<script\b[^>]*\bsrc\s*=', source, re.I):
        raise RuntimeError(f'{slug}: game must inline its JavaScript before offline packaging')
    if re.search(r'<link\b[^>]*\brel\s*=\s*[\"\x27]stylesheet', source, re.I):
        raise RuntimeError(f'{slug}: game must inline its CSS before offline packaging')
    target = folder / 'android/app/src/main/assets/index.html'
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(html, target)
    env = dict(os.environ, JAVA_HOME=str(JDK), ANDROID_HOME=str(SDK))
    command = [GRADLE, '--offline', '--no-daemon', '-p', folder / 'android', ':app:assembleRelease', '-x', 'lintVitalAnalyzeRelease', '-x', 'lintVitalReportRelease', '-x', 'lintVitalRelease']
    output = run(command, env)
    (folder / 'dist').mkdir(exist_ok=True)
    (folder / 'dist/build.log').write_text(output)
    private = folder / 'private-signing'
    private.mkdir(mode=0o700, exist_ok=True)
    key = private / (slug + '-release.p12')
    password_file = private / 'password.txt'
    if not key.exists():
        if password_file.exists():
            raise RuntimeError('Unexpected password without keystore; inspect before regenerating')
        password = secrets.token_urlsafe(32)
        password_file.write_text(password + '\n')
        password_file.chmod(0o600)
        run([JDK / 'bin/keytool', '-genkeypair', '-keystore', key, '-storetype', 'PKCS12', '-storepass', password, '-keypass', password, '-alias', 'appfarm', '-keyalg', 'RSA', '-keysize', '3072', '-validity', '10000', '-dname', f"CN={game['name']}, O=AppFarm, C=BR"])
        key.chmod(0o600)
    unsigned = folder / 'android/app/build/outputs/apk/release/app-release-unsigned.apk'
    aligned = folder / 'dist/aligned.apk'
    filename = game['name'].replace(' ', '_') + '_v1.0.0.apk'
    apk = ROOT / filename
    run([BUILD_TOOLS / 'zipalign', '-p', '-f', '4', unsigned, aligned])
    run([BUILD_TOOLS / 'apksigner', 'sign', '--ks', key, '--ks-key-alias', 'appfarm', '--ks-pass', 'file:' + str(password_file), '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true', '--out', apk, aligned])
    signature = run([BUILD_TOOLS / 'apksigner', 'verify', '--verbose', '--print-certs', apk])
    assert 'Verified using v2 scheme (APK Signature Scheme v2): true' in signature
    assert 'Verified using v3 scheme (APK Signature Scheme v3): true' in signature
    alignment = run([BUILD_TOOLS / 'zipalign', '-c', '-v', '4', apk])
    badging = run([BUILD_TOOLS / 'aapt', 'dump', 'badging', apk])
    assert f"name='{game['package']}' versionCode='1' versionName='1.0.0'" in badging
    assert f"launchable-activity: name='{game['package']}.MainActivity'" in badging
    assert "sdkVersion:'26'" in badging and "targetSdkVersion:'35'" in badging
    assert 'android.hardware.screen.portrait' in badging
    permissions = run([BUILD_TOOLS / 'aapt', 'dump', 'permissions', apk])
    assert 'uses-permission' not in permissions
    manifest = run([BUILD_TOOLS / 'aapt', 'dump', 'xmltree', apk, 'AndroidManifest.xml'])
    assert 'android:debuggable' not in manifest
    with zipfile.ZipFile(apk) as archive:
        assert archive.read('assets/index.html') == html.read_bytes()
    certificate = re.search(r'certificate SHA-256 digest: ([0-9a-f]+)', signature).group(1)
    record = {'name': game['name'], 'package': game['package'], 'version': '1.0.0', 'versionCode': 1, 'filename': filename, 'bytes': apk.stat().st_size, 'sha256': hashlib.sha256(apk.read_bytes()).hexdigest(), 'certificateSha256': certificate, 'signatures': ['v2', 'v3'], 'zipaligned': True, 'permissions': [], 'debuggable': False, 'bundledHtmlMatchesSource': True, 'htmlSha256': hashlib.sha256(html.read_bytes()).hexdigest(), 'minSdk': 26, 'targetSdk': 35, 'orientation': 'portrait', 'deviceInstallTested': False, 'releaseLintPerformed': False, 'lintNote': 'Offline lint-gradle dependency unavailable; compilation, packaging and APK verification passed.'}
    (folder / 'APK_VERIFICATION.json').write_text(json.dumps(record, indent=2) + '\n')
    (folder / 'dist/apksigner.txt').write_text(signature)
    (folder / 'dist/badging.txt').write_text(badging)
    print(json.dumps(record), flush=True)

if __name__ == '__main__':
    for slug in sys.argv[1:]:
        build(slug)
