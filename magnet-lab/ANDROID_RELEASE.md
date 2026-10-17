# Magnet Lab Android release 1.0.0

Package: `com.andrefiker.magnetlab`; versionCode 1; Android API 26+; target/compile API35. Portrait, no requested permissions, local bundled HTML, dedicated persistent signing key.

APK: `Magnet_Lab_v1.0.0.apk`

SHA-256: `778b2251c5f760d9f523e53fe8b466ba5f5096f5f6462cad924f9243b772b14c`

Signing certificate SHA-256: `a02c216161d6248ca82ffc2ce7c6999bca8d1b94ab7a2baa7a84f9819a41da8d`

Browser game: https://magnet-lab-2v4qbb.craftian.app

Craftian editor: https://craftian.ai/ide?app=magnet-lab-2v4qbb

Build helper and environment notes: `../arcade-batch/README.md` and `../arcade-batch/build_apks.py`. Source HTML and bundled APK asset were verified identical. Signature v2/v3, alignment, launcher, package/version, portrait, no permissions and non-debuggable release checks passed.

20 browser checks passed. Physical Android installation/audio/touch/lifecycle testing and release lint were not performed. Offline lint dependencies were unavailable.

The dedicated signing key is preserved privately in the four-game signing backup, not this repository. Reuse it and increment versionCode for updates. Uninstall/clear data can erase local progress. No automatic synchronization exists between GitHub, Craftian and Android: deliberately update and verify all three.
