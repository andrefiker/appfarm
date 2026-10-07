# ONE MORE 1.1.0

Minimalist offline daily movement app. Android ID `com.andrefiker.onemore`,
version code 2. This is an in-place successor to ONE MORE 1.0.0.

## What changed in 1.1

The workout model is intentionally simpler: each exercise is one controlled rep
(or one controlled hold for isometrics), then Done moves straight to the next
exercise. There is no set/rep numeric entry during training.

Each exercise screen is visual-first:
- movement illustration showing start/end position or hold position;
- front/back body map highlighting primary and assisting muscles;
- short activation/form cue;
- one large `DONE · 1 REP` action and a quiet Skip action.

Every day receives a deterministic balanced mix from the enabled exercise pool.
Default is 8 movements. The mix rotates by date while keeping lower body, upper
body, posterior chain, core and warm-up coverage when the enabled library allows.

After the last movement the app immediately shows:
- number of movements completed and skipped;
- highlighted body map for the muscles trained;
- ranked primary/assisting muscle groups;
- exact exercise list completed.

History stores completed sessions and muscle summaries. Exercises can be enabled
or disabled; Settings controls 6/8/10/12 movements, theme, haptics, awake mode
and JSON backup/restore.

## Data migration

Schema 1 backups/saved state from v1.0.0 are migrated to schema 2 on load.
Existing exercise names, enabled state and available workout history are kept.
Legacy set progression data is not used by the new one-rep workflow. The Android
package ID and SharedPreferences namespace remain unchanged so a correctly
signed update keeps local data.

## Privacy / architecture

Offline Java WebView + bundled assets + private SharedPreferences. No account,
backend, analytics, ads, purchases or network permission. Backup/restore uses the
Android document picker and needs no storage permission.

## Build / test

Java 17, Android SDK 35, Gradle 8.10.2.

```sh
node --test tests/*.test.cjs
npm install --no-save --no-package-lock playwright@1.58.2
npx playwright install chromium
node scripts/browser-qa.cjs
gradle --no-daemon :app:assembleDebug :app:assembleRelease :app:lintDebug :app:lintRelease
```

CI also installs the debug APK on API 35, disables networking, runs a full
one-rep workout through the WebView, checks process-death resume, undo, muscle
summary, safe system bars and coexistence with Daily Home Training.

## Signing

Release updates must use the existing dedicated ONE MORE signing identity:
certificate SHA-256
`8bfdfdc2fa9f078021065b3bce7fa16bf73347ece15664bb7464352894c92c2d`.
The private PKCS12 key is retained outside the repository. Never commit it.
