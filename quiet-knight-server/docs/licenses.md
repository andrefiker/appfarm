# Candidate licensing and source inventory

The candidate uses unmodified Stockfish.js 18 Lite single-thread WASM from `stockfish@18.0.8` (GPLv3). It is a WebAssembly engine running locally, not native Android Stockfish. The previous server-native Stockfish 18 is unchanged. The lighter original fallback is labelled Quiet Knight Mini 1.0.

Exact engine source: https://github.com/nmrugg/stockfish.js/tree/93c994592dcf3b4b21052ab925e9b534df9c0918

Pinned source archive SHA-256: `ef9b6e9bd66de9869dc4715979ada23c6ab4fa96648025823a0a865f300667b2`.

Bundled JS SHA-256: `5243fd9b276cab7dfe3ad1d43ab9ead73568fac76468c614242977a210c4a391`.

Bundled WASM SHA-256: `a8fbc05ec6920b56d7485826dcb02c5ffd2826bcbf751cf973046f237a9096f1`.

Lite NNUE by Linmiao Xu: `nn-9067e33176e8.nnue`, 6,617,595 bytes, SHA-256 `9067e33176e8c5edb7aa8db6a3aedd012f84a1f39872e86357c6c2d0993f314d`. Primary mirrors returned 403/404 in this environment. The exact network was recovered from initialized unmodified WASM memory and verified against its upstream hash. `frontend/scripts/recover-engine-net.cjs` repeats this recovery. The companion source package includes the real network, upstream C++/Emscripten source and build scripts. It does not substitute a web link for available source. This is not a claim that an independent C++ rebuild has been reproduced bit-for-bit.

Other shipping runtime dependencies: chessops 0.15.1 (GPL-3.0-or-later, includes TypeScript source); chess.js 1.4.0 (BSD-2-Clause); qrcode-generator 2.0.4 (MIT); React/React DOM 19 and scheduler (MIT), lucide-react (ISC), and @badrap/result (MIT). Full pinned package versions and generated notices are supplied from the lockfile. GPL texts and runtime notices are bundled by `prepare-engine.mjs`. Recipients must receive corresponding source and retain notices. This dependency combination brings GPL distribution obligations for the combined frontend; no repository-wide license is imposed on unrelated AppFarm applications.

The new Classic SVG pieces and curated tactics/opening/endgame teaching content are original Quiet Knight contributions, dedicated to CC0 for reuse. No third-party piece font, audio recording, music or opening database was introduced. Sounds remain generated oscillators. Opening lines are curated teaching lines, with no fabricated frequencies or evaluation statistics.

The twelve pre-existing approved Animal Kingdom PNGs are retained byte-for-byte. Their historical provenance/rights documents were not present in this checkout. Public redistribution of the existing artwork requires confirming those original rights; preservation of user-approved assets is not a new licensing certification. No public publication has occurred.
