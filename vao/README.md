# VÃO 1.1.0

Recovered from the user supplied v1.0 APK (`SHA-256 1abef35798dc39da6507da49deee633bb5afc4a7ffeb9744990987826ac303f6`). The original bundled `assets/index.html` was the starting source. The 20 original levels, Matter.js simulation, editor, budget and replay remain in `index.html`; progression rules live in `progression.js`. No network, accounts or backend.

Run `node vao/tests/progression.test.js` from the repository root. Open `vao/index.html` in a browser for the game. The Android WebView shell is `vao/android/`; the workflow copies both web files into assets and builds `appfarm.vao` version 1.1.0 (code 2).

The v1 APK uses a private signing certificate with SHA-256 fingerprint `E3:E3:98:5C:22:50:C8:CB:1B:7F:4E:1A:80:9D:E7:50:15:3A:1E:01:D2:C0:71:64:FE:BC:C3:7A:0D:AF:47:1B`. The original private key was not supplied and was not found in the repository or Library. GitHub Actions therefore produces a debug signed APK that Android **cannot install over v1**. Do not uninstall v1 if its saved bridges matter. The code migrates v1's `vao-v1` localStorage object when installed as a correctly signed update; that migration cannot run on the existing installation without the original key. A compatible release needs the original keystore, alias and password and must verify the resulting signer fingerprint before delivery.

No VÃO source commit predates this recovery. The pre-addition repository commit is `00b33d9a5aa45b1e8cd89ca0659837762da99ab4`; the v1 APK above is the product rollback artifact. New levels were deferred to preserve balance. No physical Android test was available in this workspace.
