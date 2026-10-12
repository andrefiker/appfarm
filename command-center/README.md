# Command Center · 1.0.0

Private, offline Android GUI companion for André's existing Google Sheets command center. The Sheet stays canonical. This companion is explicitly a saved snapshot, with project cards, next actions, search, blocker/review filters, evidence details, source freshness, and named completed workstreams. It has no Internet permission, backend, analytics, credentials, clinical records or bank transactions. The Open live Sheet button opens the system browser; it does not claim authenticated live refresh inside the APK.

Public repository source contains fictional demo data only. The private delivered APK and source archive include the read-only project reporting snapshot. `web/snapshot.json`, `web/index.html`, signing key and builds must never be committed publicly.

## Build

Run `python3 build-web.py` and `node --test tests/model.test.js`. When private snapshot.json is absent, demo.json supplies a clearly fictional fixture. HTML output is fully self-contained. To build the Android wrapper, install Android SDK platform35/build-tools35.0.0 and Eclipse ECJ3.38.0. Then set CC_ANDROID_SDK and CC_ECJ_JAR and run `bash build-android.sh`. Uses the existing Java17 runtime. No Gradle download or dependency graph is needed for this tiny wrapper.

Build script packages local assets, compiles Java8 bytecode against Android35, dexes for API28, aligns, signs with a dedicated local PKCS12 key, and verifies signatures/package metadata. Keep delivery/command-center-signing.p12 privately to retain update compatibility. Alias commandcenter; local key-store password android. This is a private development signing identity, not Play Store distribution.

## Verification

Pure Node tests exercise schema validation, duplicate rejection, status filtering, accent-insensitive search, freshness expiry, missing timestamps and interrupted/failed checks. Browser QA tests real saved data when present, filters, detail dialog, source/completion views, invalid import, persistence, offline assets and portrait overflow. Browser script uses the configured CC_CHROME executable with Playwright. No physical Android install has been claimed.

## Import / refresh

Sources > Open a newer saved snapshot accepts schemaVersion1 JSON only. Invalid, oversized and older snapshots are rejected before localStorage changes. There is no automatic connection from this APK to the private Sheet yet. That requires a separately approved supported sign-in route. The existing Sheet's bounded six-hour task remains independent.

## Release / rollback

Package com.andrefiker.commandcenter; minSdk28, targetSdk35, versionName1.0.0, versionCode1. Standalone new installation; does not replace another AppFarm app. Main repository is unchanged. To roll back this first GUI pass, uninstall the companion; the existing Sheet and its history remain intact. Never restore or reset the Sheet merely to remove this app.
