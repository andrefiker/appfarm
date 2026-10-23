# Original Quiet Knight 1.1.0 release candidate

## Scope and state

Original Quiet Knight / Animal Kingdom only. No Quiet Knight II or unrelated app was changed. New games are untimed, accounts optional, and historical 10+0 games remain server-authoritative. No SQL schema change beyond the separately gated existing v4 was added. New room metadata lives in Redis; local studio saves use a separate versioned guest/account namespace with backup/recovery. Existing main saves remain readable and are not destructively migrated.

The candidate adds local Stockfish 18 Lite WASM, legal Chess960 with local castling, pass-and-play, review and graph, deterministic candidate hints, original exercises, curated openings, endgame practice, editor/FEN/PGN, settings/themes/Classic pieces, quiet/left controls, online capability negotiation, guest names/side/lobby/correspondence, mutual proposals/reactions, idempotent move IDs and safe room retention. Online Chess960 is explicitly unsupported. Styles are bounded candidate-selection biases, not animal-specific Elo claims. Main casual standard games automatically claim legal threefold/50-move draws via chess.js; studio has explicit threefold/50 claims and automatic fivefold/75 rules.

## Candidate versus production

Read-only public production evidence on 23 October 2026: /health returned commit `ebaf078f1148b764f1da013b7c2f7871ec76f9c6` with `clock: 10+0`; /computer/health reported Stockfish 18; /capabilities returned 404. No player/room records were queried. Current production must be checked again before release. A screenshot cannot identify the installed package or room age.

The new frontend requires protocol 2 plus untimed guest support before creating friend rooms. Older production therefore displays an explicit incompatibility explanation and blocks misleading new-game creation. Existing rooms can still be reopened with their actual clocks. Offline features need no backend deployment. New online capabilities are candidate-only until separately approved and deployed.

## Retention and correspondence

Only waiting rooms with zero moves get a seven-day TTL. Active and completed Redis rooms are persisted without TTL. Existing active/history keys have expiry removed when the candidate starts. No cleanup of live records was executed. Correspondence has no per-move deadline, countdown, forfeiture or enabled reminder. Durability through Redis infrastructure failure still depends on configured persistence/backup; verify AOF/RDB and capacity before production. No new paid service or cleanup job is introduced.

## Signing and build

Package `com.andrefiker.quietknight.appfarm.studio`, version 1.1.0/code 5. It installs alongside .guest and older packages. Their signing keys are not available, so this is not an in-place upgrade and does not import another package’s private WebView storage. Preserve older installs and their local data.

The workflow uses an explicit retained test signing store, restored from a dedicated Actions cache and preserved as a separate private artifact. It is never in Git or bundled assets. Recover/preserve that artifact durably; an Actions cache is not a permanent backup. This is a test/debug signing identity, not Play production signing.

Node 22, Java 17, Gradle 8.10.2, Android SDK/build-tools 35. From frontend: `npm ci`, `npm run test:animal`, `npm run test:account`, `npm run test:studio`, `npx tsc --noEmit`, `npm run build -- --base=./`. Copy dist into Android assets/quiet-knight. Generate a test keystore if needed with keytool (RSA 2048; alias androiddebugkey; standard debug passwords android), set QK_CANDIDATE_STORE to its absolute path, then run `gradle --no-daemon :app:assembleQuietKnightDebug` in android-store. Verify APK with aapt, apksigner and sha256sum. The workflows contain complete synthetic service/test setup. Never point test migration variables at production.

## Production release plan — prepared, NOT authorized or executed

1. Confirm explicit approval for the exact candidate commit, schema-v4 migration if still needed, application deployment and protected backup operations. Do not infer approval from this assignment.
2. Record current service/image commit, schema version, Redis persistence configuration, TTL inventory and aggregate integrity checks without exposing credentials or player details. Confirm storage capacity and no new costs.
3. Take protected PostgreSQL and Redis backups, checksum them, restore to isolated services and verify counts, existing player IDs, history, sessions, active clocks, seats and correspondence. Synthetic pg_dump/restore checks already exist; they are not proof of a production backup.
4. Run existing v3-to-v4 migration only if needed and explicitly approved. Do not reverse SQL merely to roll back application code. No new SQL migration is needed for these improvements.
5. Require the exact candidate’s Docker/predeploy, native Stockfish, browser, packaging and signature gates. Require representative saved old rooms and an older-server compatibility test. Review the feature matrix and physical limitations.
6. Prepare a compatible rollback image and prove it can reopen both old timed and new untimed rooms, preserve guest/account identity and consent data, and avoid reintroducing TTL expiry. The existing pinned b957972 rollback gate proves v4 auth-data compatibility only; it is NOT proof of complete studio/untimed-room rollback compatibility. Do not blindly deploy it. Preserve current frontend capability gating during rollback.
7. Only after approval and all prerequisites: deploy the exact image with bounded health checks. Do not merge main as a prerequisite. Verify protocol 2, untimed new games, legacy countdown, two independent guest/account clients, spectators, move acknowledgements, reconnect, rematch consent, correspondence reopen and record integrity.
8. Stop/roll back application deployment on health failure, identity/seat mismatch, active-game state loss, incorrect clocks, unbounded errors or unexpected cost. Preserve DB/Redis evidence and use the qualified application rollback; do not execute an unproven reverse SQL migration.
9. Observe sanitized health/error/engine/latency indicators. No advertising or tracking service is added. Keep live notifications/reminders off unless separately approved.

## Poco X7 Pro guided qualification — NOT PHYSICALLY VERIFIED

Install alongside older apps; About must show .studio / 1.1.0 (5) and the source commit. In airplane mode, cold-open bundled computer and studio; play both sides, promote to all four pieces, resume after force-stop and reboot, and import/export a test PGN/FEN. Check 320 px-equivalent fit, system font scaling, portrait insets, keyboard and gestures, Classic/Animal Kingdom and all themes, left controls, mute/reduced motion and touch dragging/tapping. Check screen lock/background while the engine thinks: computation should stop and resume once, with no duplicate move or audio. Compare 100/250/750/1500 ms budgets, battery and thermal behavior on hardware. With an approved compatible backend, use two devices for invite, authorized seat recovery, consent/refusal, spectator denial and correspondence. Existing 10+0 rooms must retain their original remaining times. Do not use real clinical data or send live test invitations without approval.

No physical phone, Android emulator, TalkBack session, real Android audio/haptics, thermal or battery measurement was available in this environment. Browser and native-package checks must be reported separately.
