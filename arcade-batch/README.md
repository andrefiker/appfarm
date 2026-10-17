# Four-game AppFarm batch

Gravity Golf, Ricochet, Lunar Lander, and Magnet Lab are separate offline browser games and Android packages. User-approved scope: make the four selected games with Craftian browser versions and installable offline APKs.

Each game occupies its own top-level folder. The single `index.html` is the game source; the Android asset must match it exactly. The APK build helper copies it before packaging and verifies equality afterward.

`build_apks.py SLUG` builds and verifies one game. Set JAVA_HOME, ANDROID_HOME, GRADLE_BIN for your installed JDK 17, Android SDK 35/build-tools 35.0.0, and Gradle 8.10.2. The default paths refer to the original Work environment and may not exist elsewhere. Android Gradle Plugin is 8.7.3. The offline sandbox excludes release lint tasks because lint-gradle is not cached; run full lint in a connected development environment.

Private signing material is generated only when absent and excluded from source control. Preserve each game's existing key and increment versionCode for future updates. Android packages request no permissions and bundle their game instead of opening the hosted URL. Physical Android installation/testing must be reported separately from browser and package verification.

GitHub and Craftian are separate repositories. Record each Craftian project ID and deployed commit before future maintenance; edit those existing projects instead of creating duplicates. No automated GitHub-to-Craftian synchronization is configured.
