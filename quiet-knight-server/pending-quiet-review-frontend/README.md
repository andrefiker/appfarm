# Held Quiet Review frontend patch — NOT PRODUCTION

Prepared against AppDeploy v35, typechecked and built locally. AppDeploy remote v36 is authoritative; rebase these bounded changes onto the current remote snapshot before applying. This folder is an unapplied feature patch, not a replacement frontend.

Backend implementation is main commit b649bd427872dd3d652953403e2514af94b51f5c. Native Stockfish review tests pass locally. Its Railway deployment is HELD because the provider agent introduced an unintended Postgres staged delta and then repeatedly timed out (HTTP504) while asked to remove it. Do not accept environment patch 3b485ae1-3c4f-4677-a2d0-dacdef826ffc until its database changes are resolved.

After safely staging only the server: deploy, require all three predeploy suites to complete, verify GET /computer/health and POST /computer/review cache/no-room-mutation acceptance. Then rebase this UI onto the current AppDeploy source, preserving v36 worker retention, build label and five workflows. Do not overwrite v36 with this older full-file snapshot. The changed files are provided to make the completed implementation reviewable.

The review input tests reject unfinished histories, forged FEN and unrecorded resignation; only public completed-game IDs are sent for cached results. Eight-second client timeout and cancellation; engine limit160plies/4800ms; no live analysis or credentials.
