# Held Quiet Review rebase on production v37

This directory is a reviewable candidate and continuation evidence. Nothing here has been deployed. Production remains AppDeploy v37 / 1788920004629 with backend r5.

`quiet-review-on-v37.patch` rebases only the logical Quiet Review integration onto the current production source. It changes GameApp, game-record, game-keepsake, diagnostics and a small CSS addition, and adds quiet-review.tsx. It preserves chess-ui.tsx, the v37 hierarchy, Table controls, network, identity, engine, service worker and scoring code. The build string deliberately says candidate, not a released version.

The component is secondary in the finished-game Table controls area and saved final-position view. Requests use completed durable game IDs when available, validate replay/FEN, reject raw unfinished/resigned histories without a durable result, offer cancellation, time out after eight seconds and show no more than three moments. No bearer/seat credential is sent in the review request. Quiet/equal fallback copy is: “A steady game. No single move decided it.” The existing backend uses native Stockfish only.

`baseline-hashes.json` records SHA-256 hashes of the exact v37 baseline files and candidate files. The AppDeploy tool omits one redundant trailing newline from three exported files; baseline hashes use that current remote form. Re-read the CURRENT AppDeploy applied source before use. If production moves beyond this baseline, rebase the logical diff again; do not overwrite newer whole files.

Preparation, already completed locally:

1. Export current AppDeploy v37 to a separate candidate directory, preserving all other files.
2. Confirm baseline hashes, then `git apply --check quiet-review-on-v37.patch` and apply in that directory.
3. Place `verify-review-input.cjs` in the candidate root. Run `npx tsc --noEmit`, `npm run build`, and `node verify-review-input.cjs`.
4. These passed locally on 2026-09-09. The patch also passed apply-check against the baseline. Candidate output: index-Dr_0lEoG.js, index-CKYTdr4n.css; computer-worker-CwRSDPc2.js unchanged.

Release remains blocked:

1. Use direct Railway tools only. The owner now prohibits Railway Agent and any quota-limited infrastructure agent. Do not restore/retry that route. Proceed with production infrastructure changes only when a direct tool exposes the exact change and supports verifying it.
2. Inspect current running and staged state. Do not accept mixed patch 3b485ae1-3c4f-4677-a2d0-dacdef826ffc. It includes an unintended Postgres delta. Clear only unapplied changes using supported tools, verify running configuration/deployment IDs unchanged, then stage only intended server source. Preserve PORT, FRONTEND_ORIGIN, REDIS_URL and DATABASE_URL privately.
3. Apply `review-server-gate.patch` to the held backend test file. It strengthens the existing real-Redis/isolated-Postgres acceptance: scored checkmate, cached repeat, unchanged room fields, public player statistics and all ledger fields except the intended review cache. This additional gate is syntax/apply checked, NOT executed against SQL. Run it before deployment.
4. Run existing predeploy gates and native `verify-review.js`. Copy `verify-review-matrix.js` beside quiet-review.js and run with a valid STOCKFISH_PATH. Matrix was executed locally this continuation; it does not certify HTTP, SQL or production caching.
5. Release backend alone, confirm exact source commit/build, health, cache and no score/room mutation.
6. Render and test the rebased frontend candidate on an approved preview, then deploy to the SAME AppDeploy app only after its gate passes. Preserve v37 / 1788920004629 as immediate rollback and v36 / 1788913697012 as earlier rollback.

Do not deploy this frontend while the production backend lacks /computer/review. Do not treat the build/input tests as rendered candidate QA. No passkey implementation or database migration is included.

## Latest operating instruction — direct tools only

The owner's newer instruction supersedes agent-restoration wording in older reports. Use Quiet Knight Release Gate, AppDeploy, GitHub and direct Railway operations. No Railway Agent or quota-limited infrastructure agent calls. No production infrastructure mutation unless a direct tool exposes and verifies the exact change.

Fresh direct checks on 2026-09-09 still show AppDeploy v37 / 1788920004629, server deployment 743ce873-7afa-41b1-8bee-6c8f031e7c2e at commit 02e9c1f866ac9eefdb44f09d147067b42530280d, and unchanged Postgres/Redis deployment IDs. AppDeploy reports ready and empty frontend/backend error arrays; E2E is null. This check did not rerun browser or engine acceptance.

The mixed patch 3b485ae1-3c4f-4677-a2d0-dacdef826ffc remains STAGED with 21 changes. Direct service configuration separates running and staged fields, but variable values are redacted (valuesRedacted=true). Installed direct tools expose no staged-change discard and no existing-service source-commit update. update_service explicitly excludes source changes. accept_deploy commits ALL environment changes; redeploy does not expose an exact source/config change selection. Neither is an acceptable substitute for isolation of the intended release.

No agent call, variable/configuration mutation, accept, redeployment or production source edit was made in this direct-only check. The next prerequisite is a supported direct operation that can safely remove/isolate the mixed staging and select the intended server source with verifiable before/after state. Keep the candidate held meanwhile. Do not seek credentials in logs or use a dashboard/API workaround to evade these limits.
