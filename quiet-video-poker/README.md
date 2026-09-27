# Quiet Video Poker

A self-contained, offline-capable single-player Jacks or Better game. Every credit is fictional. No network calls, accounts, ads, purchases, cash-out, or backend are used.

## Run and build

- `npm test` — runs the engine rule tests with Node's built-in test runner.
- `npm run dev` — serves the source app at `http://localhost:4173`.
- `npm run build` — creates the static production PWA in `dist/`.
- `npm run preview` — serves the production build at `http://localhost:4173`.
- `node scripts/bundle-android.mjs` — embeds the production game into the native offline Android WebView wrapper.
- `gradle -p android :app:assembleDebug` — builds the debug APK with JDK 17 and Android SDK 35.

The project has no third-party dependencies. It uses native JavaScript modules, browser local storage, original WebAudio tones, optional vibration, and a service worker that pre-caches the full game for offline use.

## Rules and controls

Five cards are dealt from one Fisher–Yates shuffled 52-card deck. Tapping a card toggles its hold. DRAW replaces only discarded cards from that same deck. Payouts use the 9/6 Jacks or Better table; a five-credit royal flush pays 4,000 credits. Bet, credits, settings, and statistics stay in this browser's local storage. Settings can reset credits and statistics.

The hint is a deterministic basic guide. It keeps made hands, recognizes pairs, four to a royal, four-card straight-flush draws, four-card flushes, four-card straights, and high cards. It is not an optimal strategy solver.

## Android APK

The `android/` directory contains a minimal, offline WebView wrapper for the same tested web game. Its application ID is `com.appfarm.quietvideopoker`; it requests vibration only, starts in landscape, and keeps game data in local storage. See [`android/README.md`](android/README.md) for the wrapper details. The Android packaging workflow runs the poker tests, builds the PWA bundle, assembles and signs a debug APK, then installs and exercises it in an Android emulator.

## Offline use

Serve the production `dist/` folder over HTTP or HTTPS and load it once. The service worker caches the HTML, game modules, styling, manifest, and icon during installation. Installability and offline caching require a secure context (HTTPS or localhost). Local storage does not sync between devices or browsers.

## Test coverage

Hand categories, ace-low/high/wraparound straights, low-pair qualification, all base payouts, max-bet royal payout, deterministic shuffle, replacements, distinct cards, held-card identity, and hint examples are tested in `test/engine.test.js`.
