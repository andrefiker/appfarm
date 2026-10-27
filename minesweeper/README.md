# Minesweeper

An offline Android Minesweeper game. The Android shell hosts local HTML, CSS and JavaScript assets in a WebView; no network permissions are requested. Open a tile by tapping it; hold to flag, or switch to flag mode. Tap a revealed number to chord. Pinch or use the zoom buttons and drag to navigate larger boards.

The clock starts on the first reveal, pauses when the app is backgrounded, and resumes when it returns. Statistics count a game as played on its first reveal, including games later abandoned by restart. Custom games share a statistics category. A first click is always safe; the surrounding area is also safe whenever space allows. Boards are seeded and remain unchanged after generation.

Run `node --test tests/engine.test.js` for engine tests. Build with Android SDK 35, Java 17 and Gradle 8.9: `gradle :app:assembleDebug`. The debug APK is for initial installation and is signed with the local Android debug key.

No-guess generation is not implemented. Runtime behavior depends on Android System WebView; device and gesture testing are required before claiming release quality.

Optional browser interaction checks: start a static server in `app/src/main/assets` on `127.0.0.1:18765`, start a Chromium instance with a fresh profile and `--remote-debugging-port=19222`, then run `node tests/browser-state.cjs` and `node tests/browser-gestures.cjs`. These exercise browser UI and local storage; they do not replace testing on an Android device. The state test writes a diagnostic screenshot to `/tmp/mines-screen.png`.
