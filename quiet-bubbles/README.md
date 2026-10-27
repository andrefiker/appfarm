# Quiet Bubbles 1.0.0

A local-only portrait bubble shooter for Android 8.0 and newer. The WebView loads bundled files; no server, account or network permission is used. VIBRATE is requested for optional haptics. Debug builds are signed with the build machine's Android debug key, not a production release key.

## Play

Drag on the board and release to shoot; use Swap once per shot. Play starts Endless, while Game Modes offers Classic, Zen and Time Attack. Settings provide themes, symbols, mirrored controls, sound, haptics and aim sensitivity. Pause before leaving; the app also pauses on background and saves periodically. Continue restores a saved game.

The grid uses 8/7 alternating cells. A ray intersects the same circle geometry and walls for preview and the animated projectile; impact chooses the closest empty neighbor. A flood fill finds matches and ceiling-connected bubbles. Randomness is a saved 32-bit seeded generator; queue colors are sampled uniformly from colors present. Endless adds two full rows after consecutive misses. Easy through Expert change palette size, starting rows and pressure allowance. Random starting boards are not mathematically proven solvable.

Score: 10 per popped bubble, 20 per dropped bubble, 25 for each additional consecutive match, 500 per board clear, plus a Classic completion bonus up to 500 depending on shots. Stats are saved at game completion; a restarted or abandoned game does not contribute. No music is included. Sound uses synthesized tones. Haptic availability depends on the device and WebView.

## Build and test

Requires Android SDK 35, Java 17, Gradle 8.9 and Android Gradle Plugin 8.7.3. Run `gradle assembleDebug` and `node --test tests/engine.test.js`. The `app/src/main/assets` directory is the complete standalone web build; open `index.html` in a browser. Do not use a network server in the Android app.

## Verification limits

Automated engine tests cover representative geometry, collision, graph traversal, scoring, generation, saving and timer cases, but are not exhaustive. Browser playtesting is not Android device testing. Device installation, audio/haptics, system insets, performance, uninterrupted long sessions, full mode completion, pressure progression, all bank-shot edge cases and process termination remain to be verified on hardware. Starting layouts are not solver-validated. Effects and difficulty progression are deliberately modest; no claim is made that every requested polish effect is implemented.
