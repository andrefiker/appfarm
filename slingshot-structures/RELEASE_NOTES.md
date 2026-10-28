Slingshot Structures 1.0.0 — an original offline Android physics puzzle game.

- 30 Classic challenges, seeded Endless, fewest-shot Precision and a persistent Sandbox.
- Matter.js rigid bodies, four materials, support collapse, accurate free-flight preview, touch controls and mirrored launcher.
- Three visual themes, original synthesized sounds, optional haptics, local scores and recoverable turn checkpoints.

Package: `com.andrefiker.slingshotstructures` · versionCode 1 · Android 8.0+.

The signed APK was built locally and structurally verified. CI repeats engine tests, all 30 stability/solution checks, offline desktop Chromium touch QA and a fresh Android source build before publishing the preserved APK. Assets are checked byte-for-byte against source.

**Test/debug signing**, RSA, APK signature v2 and v3. Only vibration permission; no Internet permission. No backend, ads, analytics, accounts or recurring costs.

**Device testing remains pending:** no emulator or physical Android device was connected. Desktop touch emulation does not establish Android FPS, audio, haptics or device-specific WebView behavior.

The dotted path predicts free flight and excludes collisions. Turns freeze residual physics after rest or a 7-second limit. Interrupted shots restore a settled pre-shot checkpoint with ammunition refunded. Endless uses checked structural families; universal solvability is not claimed.

See the checksum, verification report, complete source and gameplay QA attachments. Development branch: `feat/slingshot-structures-v1.0.0`. Main is unchanged. Rollback baseline before this new app: `0db2815c14b727031d63e7c14ef0a75255690e90`.
