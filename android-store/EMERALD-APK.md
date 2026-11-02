# Quiet Knight Emerald Android installation

The opt-in `-PqkStandaloneEmerald` build packages the current Emerald Enamel frontend as a separate Android installation. It does not replace the older Studio APK, whose retained signing key is unavailable in this environment.

- Package: `com.andrefiker.quietknight.emerald`
- Launcher: Quiet Knight Emerald
- Android version: 1.2.0 (17); Android 8+; target SDK 35; portrait
- Bundled frontend: production commit `4f8c84b9df80c68ea0963df8069054f2e8516499` (web UI still identifies as 1.1.11 Emerald Enamel)
- Computer play and assets are bundled; online rooms use the existing Railway service.
- Existing Studio and browser saves remain in their original installations. Data is not automatically migrated.
- The signing identity is separate from Studio and is retained in the owner's private signing backup, never in this repository.

## Rebuild

Use JDK 17, Gradle 8.10.2, Android platform/build-tools 35, and the existing npm lockfile. Set `JAVA_HOME`, `ANDROID_HOME`, and `GITHUB_SHA` to the source revision being packaged.

1. In `quiet-knight-server/frontend`, run `npm ci` then `npm run build -- --base=./`.
2. Copy the complete fresh `dist/` directory to `android-store/app/src/main/assets/quiet-knight/`.
3. In `android-store`, run `gradle -PqkStandaloneEmerald :app:assembleQuietKnightRelease`. Do not set `QK_CANDIDATE_STORE`; the release artifact is unsigned.
4. Align the release APK using `zipalign -p -f 4` and sign it with `apksigner`, using the separate Emerald key, alias `quiet-knight-emerald`, and the password file from its private backup. Enable v2 and v3 signatures.
5. Run `apksigner verify --verbose --print-certs`, `zipalign -c 4`, and `aapt dump badging`. Confirm all bundled frontend files match the fresh build byte for byte and that the package above differs from Studio.

Never generate a replacement key for this package once its signing backup exists. Reuse that identity for subsequent updates and increase the version code.

## Release evidence

The frontend was rebuilt from the live source revision. All 11 focused fun-option browser scenarios passed, including capture replay, en passant, underpromotion, checkmate, draw/rematch transitions, persistence, and audio/motion suppression. The actual rendered mobile Emerald capture screen was inspected. Earlier source validation covers 39 interaction scenarios for this frontend revision.

Android package verification is recorded in the accompanying APK verification report. No installation on a physical phone or Android emulator is claimed. No production service or database changes are required for this APK.
