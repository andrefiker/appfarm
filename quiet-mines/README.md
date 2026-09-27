# Quiet Mines

Offline-first Minesweeper PWA. The app has no backend, accounts, ads, or paid features. Game state, preferences, daily attempts, and statistics stay in browser `localStorage`.

## Run and test

```sh
npm install
npm test
npm run dev
```

`npm run build` creates the production bundle in `dist/`.

## Game engine

- `src/engine.js` contains seeded board generation, adjacency, reveal/flood-fill, flags, chording, solver deductions, fair-board validation, and deterministic daily seeds.
- Fair generation protects the chosen first cell and its neighbors, then tries deterministic candidate layouts until the logical solver can finish without guessing. If the attempt limit is reached, it throws rather than silently shipping an unverified board.
- Shared seed codes include difficulty and opening-cell index, for example `E:1234ABCD-28`. Replaying that code recreates the same layout.
- `src/Game.jsx` contains the React UI, pointer/touch input, local persistence, stats, settings, and synthesized sound.
- `public/sw.js` caches the app shell and built JS/CSS for offline use after install.

Automated engine tests run with Node's built-in test runner. `tests/tests.json` contains AppDeploy end-to-end workflow coverage.

## Android APK

The source includes a minimal native Android WebView wrapper. GitHub Actions bundles the production web build into an offline installable APK on pushes to the Quiet Mines branch; the APK has no Internet permission and no backend dependency. Build instructions are in `android-wrapper/README.md`.
