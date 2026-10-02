# ONE MORE 1.0.0

Offline personal home training. Android ID `com.andrefiker.onemore`, version code 1.
Independent AppFarm directory, storage namespace and signing identity.

## Use
Start a main workout in Today. Adjust the number, complete the set, then Done.
Left/right results are separate. Tap a recorded set to correct it; Undo restores
one action. Drafts and entries save immediately, including a session interrupted
by process death. Progress shows real results, next goals and per-set bests.
Exercises provides add, edit, enable, remove, order, sets, sides, reps/seconds,
starter, increment, cap and reset. Settings edits days, theme and JSON backups.
The default program is the user's 12 exercises, with Monday/Wednesday/Friday
main days. Easy Day is one light round of five seeded exercises. Its history is
separate unless explicitly promoted; promotion updates only logged first sets.

## Progression
For each set/side, if actual >= target, next = min(cap, target + increment).
If actual < target, repeat target. Baseline calibration uses actual + increment.
Default increment: +1 rep or +5 seconds. Reaching the cap in all actual sets
prompts a harder variation; it never substitutes one automatically.
Set count, unit or sidedness changes begin a new progression generation.
Historical snapshots remain in the backup. Renames preserve progression.
Management changes during a session apply to the next session.

## Build / test
Java 17, Android SDK 35, Gradle 8.10.2 (same AppFarm Gradle pattern).

```
node --test tests/*.test.cjs
npm install --no-save --no-package-lock playwright@1.58.2
npx playwright install chromium
node scripts/browser-qa.cjs
gradle --no-daemon :app:assembleDebug :app:lintDebug
```

`.github/workflows/one-more-training-apk.yml` additionally installs the APK on
an API 35 emulator, tests native persistence after process death and compares
safe-frame bounds against screen dimensions. It installs Daily Home Training
in the same emulator to check coexistence, without modifying its source.

## Signing / privacy
CI produces an ephemeral debug signature. Delivered APK is re-signed with the
separate persistent ONE MORE PKCS12 key retained privately as a release artifact.
Alias `onemore`, password `android`. Never commit that key. Future APK updates
must use that key and increase version code; normal updates retain data.
Delivered package is built with Gradle release (debuggable false); emulator QA
uses the matching debug variant with WebView debugging enabled.
No network permission, SDK, ads or telemetry. Bundled assets only. Data uses
native private SharedPreferences (browser QA uses localStorage). Backup/restore
uses Android's document picker and needs no storage permission.
Export before uninstalling: uninstall removes private app data.

## Verification limits
Physical handset verification remains with the user. Progression is a transparent
personal logging rule, not an individualized medical or physiological model.
Easy Day references the seeded exercise IDs; removed/disabled Easy Day members
are omitted. User-added exercises participate in the main program.

## Retained improvement passes
1. Compact session layout and scroll reset on next exercise, so the new name
   and target remain visible; phone browser QA asserts scroll position.
2. Cap prompts require actually reaching the cap. Weekly improvements compare
   actual results with prior actual results, instead of counting only overshoots.
3. Easy Day promotion uses the original main exercise snapshot, even if the
   exercise is edited or removed during that workout. Corrections preserve the
   other sets, and running timer deadlines survive process restart.
4. Damaged-data recovery preserves the original bytes and provides a working
   backup restore preview. Browser QA exercises this recovery path.

Core suite: 21 tests. Browser QA covers 320×568, 393×760 and 720×480 viewports.
No physical handset test has been performed. The app has no scheduled reminder
notifications. Easy Day promotion records only the first set; it does not invent
results for the remaining main-workout sets.
