# Pinned offline dependencies

- `web/vendor/chess.js`: chess.js **1.4.0**, readable ESM distribution, BSD-2-Clause. Upstream: https://github.com/jhlywa/chess.js and https://www.npmjs.com/package/chess.js/v/1.4.0. Full license is bundled under `web/legal/`.
- `web/vendor/stockfish-17.1-lite-single-03e3232.js` and `.wasm`: Stockfish.js **17.1**, npm **17.1.0**, Lite single-threaded flavor. Upstream: https://github.com/nmrugg/stockfish.js at **602fd7e1a571a2be71f242942db90483731f2a1f**. The production engine is the upstream bundled binary, not a locally rebuilt engine. GPL-3.0 and AUTHORS are included in the app.
- `stockfish-17.1-corresponding-source.tar.gz`: corresponding upstream source at that exact commit, retaining the build script and C++ sources; alternate prebuilt engine binaries are omitted.
- `nn-9067e33176e8.nnue`: the Lite network needed by that source. SHA-256 `9067e33176e8c5edb7aa8db6a3aedd012f84a1f39872e86357c6c2d0993f314d`.

To rebuild the engine, unpack the corresponding-source archive, install Emscripten **3.1.7** as specified by its README, place the supplied Lite network where the upstream source/build script expects it, and run the archive's `./build.js --help` for flavor flags. `./build.js --all` builds all supported flavors. Rebuilding the upstream engine was not part of the APK build verification; the supplied vendor JS/WASM are used unchanged. The single-threaded flavor requires no SharedArrayBuffer/cross-origin-isolation headers.

Five levels use `(skill, depth, movetime-ms)` settings `(0,3,120)`, `(4,6,220)`, `(9,10,450)`, `(15,15,900)`, `(20,20,1600)`. These are search profiles, not measured Elo ratings. Worker/NNUE startup adds to elapsed move time.

Original application artwork comprises 36 distinct SVG files under `web/art/`. It uses overhead geometry designed for this application and requires no external font or raster-image service.
