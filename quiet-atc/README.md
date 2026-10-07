# QUIET ATC

Minimalist offline air-traffic-control game for Android and the browser.

## Gameplay
- Tap an aircraft to select it.
- Change heading in 15° steps or drag directly from the aircraft to set a heading.
- Change cleared altitude in 1,000-ft steps.
- Arrivals: line up north of runway 18 at <= 4,000 ft, then clear ILS approach.
- Departures: climb to at least 5,000 ft and route out of the sector.
- Overflights: route safely across and out of the sector.
- Three missed arrivals end the shift; any collision ends it immediately.
- Difficulty rises automatically from level 1 to 5.

## Architecture
- Static HTML/CSS/JavaScript.
- No backend, login, analytics, ads, purchases, network dependency, or remote assets.
- LocalStorage stores best score and aggregate stats.
- Android wrapper is a minimal Java WebView loading bundled assets.

## Test
```bash
npm test
```

## Android
The GitHub Actions workflow builds and verifies `Quiet-ATC-v1.0.0.apk` using the repo's proven hosted-runner Android SDK pattern.
