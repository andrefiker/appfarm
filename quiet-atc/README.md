# QUIET ATC

A bright, touch-first air-traffic routing game for Android.

## v1.1.0 gameplay
- Top-down illustrated airfield instead of a radar console.
- Touch an aircraft and draw its route directly with your finger.
- Planes snap to runway approaches when the drawn path reaches either runway gate.
- Helicopters land on the helipad.
- Visible dotted routes stay on the map.
- Traffic conflicts warn before a collision; one collision ends the shift.
- Three aircraft may escape before the shift ends.
- Traffic density and speed increase through five levels.
- 1× / 2× speed control, pause/resume, score, best score, and local stats.

## Architecture
- Static HTML/CSS/Canvas JavaScript.
- Original procedural/vector map and aircraft artwork; no copied game assets.
- No backend, login, analytics, ads, purchases, remote assets, or Internet permission.
- LocalStorage only for game stats.
- Minimal Java Android WebView loading bundled assets.

## Test
```bash
npm test
node --check web/engine.js
node --check web/game.js
```

## Android
Package: `com.andrefiker.quietatc`

Version: `1.1.0` / versionCode `2`

GitHub Actions builds and verifies `Quiet-ATC-v1.1.0.apk`.
