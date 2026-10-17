# Ricochet Android release 1.0.0

Package: `com.andrefiker.ricochet`; versionCode 1; Android API 26+; target/compile API35. Portrait, no requested permissions, local bundled HTML, dedicated persistent signing key.

APK: `Ricochet_v1.0.0.apk`

SHA-256: `db1ec59405d3aab292699c1f430300ad0b5a3ded7e0acfb171229f06bd757664`

Signing certificate SHA-256: `75635c64ed466db0ab7197e6efce612c9cf3b474c7de74aeeffb4ae4ef7f866c`

Browser game: https://ricochet-w95k4k.craftian.app

Craftian editor: https://craftian.ai/ide?app=ricochet-w95k4k

Build helper and environment notes: `../arcade-batch/README.md` and `../arcade-batch/build_apks.py`. Source HTML and bundled APK asset were verified identical. Signature v2/v3, alignment, launcher, package/version, portrait, no permissions and non-debuggable release checks passed.

40 browser checks passed. Physical Android installation/audio/touch/lifecycle testing and release lint were not performed. Offline lint dependencies were unavailable.

The dedicated signing key is preserved privately in the four-game signing backup, not this repository. Reuse it and increment versionCode for updates. Uninstall/clear data can erase local progress. No automatic synchronization exists between GitHub, Craftian and Android: deliberately update and verify all three.
