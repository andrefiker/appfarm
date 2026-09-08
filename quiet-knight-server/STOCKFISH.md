# Quiet Knight computer engine

Stockfish 18 runs as an unmodified native child process in the existing Railway chess-server service. Multiplayer remains authoritative chess.js + Redis + pub/sub; computer requests do not create or mutate rooms.

## Protocol and limits

- `GET /computer/health`: readiness, engine name, ten skill settings; no secrets.
- `POST /computer/move`: `{moves:[{from,to,promotion?}],level:1..10,expected_fen}`. Replay from the normal initial position (maximum 600 plies), compare FEN, reject illegal history. No arbitrary UCI text, executable names or engine options accepted.
- Reply: `{engine,level,skill,fen,move:{from,to,promotion?,san},elapsed_ms}`; terminal games return `move:null`.
- App levels map to native skills `0,2,4,7,9,11,14,16,18,20`. These are strength settings, not calibrated Elo ratings.
- One native child per service replica, one thread, 32 MB hash, no waiting queue. Search budgets 80–650 ms; total child deadline 3 seconds. Rate bucket: burst eight, refill two requests/second. Busy returns 429 with Retry-After. Disconnect cancels computation. This bounds CPU and memory and keeps Node free for multiplayer.
- The frontend retries busy responses twice, with a 5.5-second total request deadline. It verifies returned FEN, level, engine and legality. Leaving/resetting aborts and rejects stale replies.
- Online failure visibly identifies a local-engine fallback. Offline computer play remains the existing cached worker, with no remote requests. It is not Stockfish. A subsequent online computer turn tries Stockfish again.

## Build and license

Dockerfile downloads the official `sf_18` baseline x86-64 release, verifies SHA256 `5c6f38b02a4da5f3ffe763f27da6c3e743eebefd92b50cb3661623b96696adff`, and retains its accompanying source, AUTHORS and GPLv3 Copying.txt inside `/opt/stockfish`. Settings links to the project and corresponding source.

- Release: https://github.com/official-stockfish/Stockfish/releases/tag/sf_18
- Corresponding source: https://github.com/official-stockfish/Stockfish/tree/sf_18
- Protocol: https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html

Run `STOCKFISH_PATH=/path/to/stockfish node verify-stockfish.js` for real-engine tests. Existing `verify-live.js` retains multiplayer/Redis acceptance; its expected build can be overridden with QK_EXPECTED_BUILD for rollback verification. Do not print Redis credentials or seat tokens.

Rollback: previous server deployment 036ac6d2-a6da-4dbd-a8a0-e2e4e1973a24 / commit d1332884fd380aed96fb24c7c0416912a0c5a5d8. Frontend v27 snapshot 1788891840145. Deploy and verify backend first, frontend second. Redis must not be restarted or replaced for this change.
