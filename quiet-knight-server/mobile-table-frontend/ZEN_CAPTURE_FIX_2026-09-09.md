# Zen capture-row correction — 2026-09-09

Production: v40 / snapshot 1788967944986, https://quiet-knight-live-v2xp3y.v2.appdeploy.ai/
Rollback: v39 / 1788967016761. Label remains QK • Games remembered.

The prior v39 fix deliberately left capture rows inside Table controls when Zen was enabled. The user reported no visible improvement. On actual v39 production, enabling Zen reproduced the disappearance. Whether this was the exact cause on the user's phone is not confirmed; its cache/version was not accessible.

Two rendering edits remove that exception. White lost and Black lost rows now remain directly on the table in both modes. The drawer no longer duplicates captures. No chess, engine, network, service-worker or backend changes.

ACTUALLY VERIFIED:
- v39 production: enable Zen through Preferences and diagnostics; rows disappear.
- Candidate 390x844 fixture with Zen enabled, using e4 d5 exd5 Qxd5: both correctly colored pawn icons visible.
- Actual v40 production: reload, resume saved computer game, saved Zen preference still true, live capture section present with White lost and Black lost labels.
- No relevant app console errors.
- AppDeploy ready and QA reports no frontend/network errors; e2e null is not a pass.

DETERMINISTIC / SOURCE TESTED:
- TypeScript noEmit passes.
- Candidate component bundle builds.
- No change to existing history-based loss calculation.
- Existing UI workflow tests reconciled to require captures in both modes.

NOT PHYSICALLY VERIFIED:
- User phone cache/version and screenshot unavailable.
- No physical two-phone capture or PWA relaunch test.
- Populated capture rows tested with legal replay fixture; resumed production position had no captures.

![Zen mobile capture fixture](evidence/qk-zen-captures.jpg)
