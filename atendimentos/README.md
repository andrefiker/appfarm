# Atendimentos Android 1.0.0

Android WebView wrapper for the supplied clinical HTML. Package `com.andrefiker.atendimentos`, minSdk 28. Source contains **synthetic tests only** and the APK starts without patient records. There is no app Internet permission; document links open in an external browser. App data is private WebView DOM storage with Android backup disabled. JSON exports are unencrypted and must be protected by the user. Clipboard copies can be visible to the operating system and other apps.

## Private setup on the phone

Install the signed APK. Download your **existing attached** `clients_data(1).json` privately onto the phone. In Atendimentos, tap the gear → **Importar clients_data.json** → choose that file. Confirm the count and verify one record. The JSON stays in app private storage after import; protect or remove the separate Downloads copy. Existing notes are not included in the provided patient JSON. Import a prior `backup_anotacoes_*.json` through **Importar backup de anotações**, if available. Do not put these files in the public repository or a CI artifact. Exported backups are unencrypted. Uninstalling or clearing app storage removes imported data and notes.

## Build and tests

`node --test tests/*.test.js` and `gradle :app:assembleDebug` from this directory with Java 17, Android SDK 35 and Build Tools 35.0.0. Debug APK is signed using the build environment's debug key; a later build from a different key does **not** update this installation without uninstall and local export/import. The repository does not contain a signing key.

## Verification limits

The node tests cover schema validation, malicious URLs, duplicates, and JSON roundtrip. Build CI checks APK identity, signature, permissions and asset contents. UI navigation, note persistence, clipboard, links, SAF import/export, background resume and offline behavior require a running emulator or phone and are tracked separately. The attached source HTML is intentionally not copied verbatim because it contained clinical records.
