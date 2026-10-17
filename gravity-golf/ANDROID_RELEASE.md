# Gravity Golf Android release 1.0.0

Package: `com.andrefiker.gravitygolf`; versionCode 1; Android API 26+; target/compile API35. Portrait, no requested permissions, local bundled HTML, dedicated persistent signing key.

APK: `Gravity_Golf_v1.0.0.apk`

SHA-256: `7cd586a03d73fef654822589ddbf422dce2df0daf3abb937c5f3559d5ed245a2`

Signing certificate SHA-256: `dfb7d43169641ea6b259b48fc2597b4f26b022fe2f2b0e10e9bf6b0b3da020d0`

Browser game: https://gravity-golf-7qfzof.craftian.app

Craftian editor: https://craftian.ai/ide?app=gravity-golf-7qfzof

Build helper and environment notes: `../arcade-batch/README.md` and `../arcade-batch/build_apks.py`. Source HTML and bundled APK asset were verified identical. Signature v2/v3, alignment, launcher, package/version, portrait, no permissions and non-debuggable release checks passed.

46 browser checks passed. Physical Android installation/audio/touch/lifecycle testing and release lint were not performed. Offline lint dependencies were unavailable.

The dedicated signing key is preserved privately in the four-game signing backup, not this repository. Reuse it and increment versionCode for updates. Uninstall/clear data can erase local progress. No automatic synchronization exists between GitHub, Craftian and Android: deliberately update and verify all three.
