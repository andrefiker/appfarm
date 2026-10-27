# Quiet FreeCell — development build

Offline Android FreeCell. Package `com.andrefiker.quietfreecell`, version 1.0.1. This is a debug build, not a production release. It uses a local Android WebView and bundled assets. VIBRATE is its only declared permission.

Numbered deals interpret the number as unsigned 32-bit; zero is mapped to the nonzero xorshift state 0x6d2b79f5. Xorshift32 supplies Fisher–Yates shuffle values. These are not Microsoft FreeCell deal numbers. Daily seeds are FNV-1a hashes of the local date in YYYY-MM-DD format. Multi-card transfers construct legal single-card operations. Auto-foundation waits until the other suit of the same color is at least rank minus two and each opposite-color suit is at least rank minus one. Hints are heuristic, not guaranteed solutions.

The three challenges start from positions constructed by reversing legal moves from a won game. Each includes a fully verified legal solution; the displayed count of initially occupied free cells is a maneuvering-space indicator, not a measured difficulty rating. Challenge games can start with cards in free cells. History supports replay. Relaxed mode hides the visible timer and offers unlimited undo without penalties; elapsed time is tracked privately for statistics. Daily completions use the original local deal date, including after resume and replay. Settings include left/right toolbar placement, three themes, sound, haptics, safe automatic foundation and reduced motion.

Run `npm test` for the engine and complete challenge solution tests. `build-android.sh` requires Android SDK platform and build tools 35. The separate recovery build reused the original APK's compiled Android wrapper and bundled the current local assets, signed with the local Android debug key. It cannot update the earlier test APK because that APK used a discarded temporary key. Do not treat the debug key as production signing.

A phone-sized Chromium smoke test exercised the menu, challenge selection, settings and all three complete challenges through pointer input, plus a drag, grouped automatic moves, timer pause/resume, and saved-game restoration. This does not establish Android WebView, physical-device, screen-reader, drag, system-inset or full lifecycle behavior. Other browser and device validation is still needed; no claim is made of final release readiness.

The monotonic active timer retains fractional seconds and pauses when the app is backgrounded or a menu is open. Damaged saves are rejected; invalid settings and statistics fields are normalized.
