# QUIET KNIGHT II

An offline, portrait-first Android chess table for André Fiker / AppFarm.

**Release:** 1.0.0 (versionCode 1), `com.andrefiker.quietknightii`, Android 9/API 28 or later with a modern Android System WebView. Target/compile SDK 35. Physical-device qualification remains outstanding.

[Signed APK](https://chatgpt.com/api/library/files/libfile_a64ff3266ed4819181afa59bede5abd2/download) · [QA report](QA.md) · [Actual gameplay screenshots](evidence/three-tables.png)

## What works

- Bundled Stockfish 17.1 Lite single-threaded WASM. Five real skill/search profiles; no advertised Elo ratings. Every engine move passes legal validation. Engine cancellation destroys its worker, preventing stale replies.
- Human versus engine; local two-player play; optional rotation; left-handed controls by default, switchable in settings.
- Tap and drag, selected/legal/capture/last-move/check indicators, four promotion choices, subtle movement, reduced-motion setting, generated sounds, optional native haptic feedback.
- Original overhead SVG pieces: 36 assets across walnut/ivory, graphite/silver and green tournament felt themes. No Unicode chess glyph pieces or angled sets.
- Tactical vision: geometric attacks from either side, split overlapping layers, attacked-piece rings, geometric defender counts, selected legal moves, adjustable opacity, configurable colored arrows. Pins restrict legal moves while geometric attacks remain visible; this distinction is explained in the interface.
- Current game, settings, full move history and the latest 200 completed games persist locally. Browser localStorage plus an Android SharedPreferences bridge and previous-save fallback. No login, backend, ads or analytics.
- Analysis board, rewind/forward, FEN load/copy, single-game PGN import/export, actual engine hints, interactive examples of special rules.
- Claimable threefold/50-move draws, including declared-move claims, are distinct from automatic fivefold/75-move draws. Checkmate takes precedence. Standard dead material and proven locked pawn-only positions are recognized.

## Limits

Dead-position detection is conservative: exotic blocked positions involving other pieces are not completely solved. Local players can agree to a draw. This is a remaining gap against the complete flagship brief, not a claim of full FIDE dead-position coverage.

Curated tactics packs and automatic move-by-move review are not included. No emulator or physical device was available. Real airplane-mode installation, force-stop/reopen, native clipboard/haptics, gesture navigation and long battery sessions still need on-device verification. Android 9 with an obsolete WebView is not qualified.

## Architecture and isolation

`web/` is the complete readable game runtime, rules wrapper, offline engine and original artwork. `android/` is a small native wrapper. It intercepts only `https://appassets.androidplatform.net/` and serves APK assets; every other resource request is blocked. File/content access, cleartext, geolocation, cookies and new windows are disabled. The manifest requests **zero permissions**, including no INTERNET permission.

`tests/` contains rule/perft fixtures. `tools/` contains build and browser QA scripts. `evidence/` contains actual screenshots and the regenerated verification outputs. `third-party/` contains the corresponding engine source and its Lite NNUE file.

Only the new top-level `quiet-knight-ii/` directory is changed on `work/quiet-knight-ii-20261022`. No merge, production deployment, server, original Quiet Knight package or original signing key was changed. Repository/package inspection is documented in [QA.md](QA.md).

## Build

Requirements: Linux x86_64, Java 17, Python 3, curl, unzip. Build tools 35, Android platform 35 and ECJ 3.38.0 are downloaded from their publishers and verified against pinned SHA-256 values by:

```sh
bash tools/bootstrap.sh
bash tools/build.sh
```

Without signing variables this produces `build/aligned.apk`, an **unsigned build-check artifact**, not the delivered signed release. To create an installable release with the dedicated private identity:

```sh
export QK_KEYSTORE=/private/path/quiet-knight-ii.p12
export QK_STOREPASS_FILE=/private/path/password.txt
bash tools/build.sh
```

The alias is `quiet-knight-ii`. Never commit or publish the keystore or password. The original identity and password were backed up privately for the owner. Their contents are not in this repository. The signed output is `build/Quiet-Knight-II-1.0.0.apk`.

For already-installed tools, override `QK_BUILD_TOOLS`, `QK_ANDROID_JAR` and `QK_ECJ_JAR`. Before an update, increase `android:versionCode` and retain the same identity. Rebuilding is source-reproducible; byte-identical ZIP/DEX/signature reproduction is not claimed.

## Tests

```sh
node --test tests/rules.test.mjs
npm install --no-save playwright@1.62.1
QK_CHROME=/absolute/path/to/chrome-headless-shell node tools/browser-qa.cjs
```

Browser QA used Chrome Headless Shell 131.0.6778.204 with Playwright 1.62.1. The harness intercepts local asset requests, disables browser networking, and needs no HTTP server. It runs all five actual engine profiles on six positions, touch/drag, promotion, reload, overlays and four phone widths. `?qa` exposes local, opt-in test hooks; normal app navigation never enables them.

## Source recovery disclosure

Automated workspace maintenance deleted the first local checkout after the signed APK and private signing backup were durably saved, but before the source branch upload finished. All 48 runtime assets were recovered **byte for byte** from that exact APK. Original screenshots and engine corresponding-source binaries were recovered from already-uploaded Git objects. The native wrapper/resources were recovered using JADX 1.5.3; synthetic captured references were repaired and method names clarified, then compilation, resource packaging and DEX generation were rerun successfully.

Build/test scripts and documentation were recreated. Fresh raw rule, browser, asset, aapt and apksigner evidence is committed here. Earlier local commit identities and raw soak-test logs were not recovered; [QA.md](QA.md) distinguishes the earlier observations from current reviewable evidence. The downloadable APK was not rebuilt or changed during recovery.

## Licensing

Application code and original artwork: GPL-3.0-or-later. Stockfish.js 17.1: GPL-3.0, with authors and corresponding source provided. chess.js 1.4.0: BSD-2-Clause. See [LICENSE](LICENSE), `web/legal/` and [third-party/README.md](third-party/README.md). All runtime licenses are readable inside the app's About panel.
