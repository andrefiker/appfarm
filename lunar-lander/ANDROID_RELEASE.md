# Lunar Lander Android release 1.0.0

Package: `com.andrefiker.lunarlander`; versionCode 1; Android API 26+; target/compile API35. Portrait, no requested permissions, local bundled HTML, dedicated persistent signing key.

APK: `Lunar_Lander_v1.0.0.apk`

SHA-256: `1f17bebad8c1138a64bf15e476db0941684ee5d8567c7c61c0059631ee14d4f3`

Signing certificate SHA-256: `0e14f7345b55edb9d9563a1581fa5f471ac1c4c021fa19857f8fa902de3b61e1`

Browser game: https://lunar-lander-bb2qx0.craftian.app

Craftian editor: https://craftian.ai/ide?app=lunar-lander-bb2qx0

Build helper and environment notes: `../arcade-batch/README.md` and `../arcade-batch/build_apks.py`. Source HTML and bundled APK asset were verified identical. Signature v2/v3, alignment, launcher, package/version, portrait, no permissions and non-debuggable release checks passed.

30 browser checks passed. Physical Android installation/audio/touch/lifecycle testing and release lint were not performed. Offline lint dependencies were unavailable.

The dedicated signing key is preserved privately in the four-game signing backup, not this repository. Reuse it and increment versionCode for updates. Uninstall/clear data can erase local progress. No automatic synchronization exists between GitHub, Craftian and Android: deliberately update and verify all three.
