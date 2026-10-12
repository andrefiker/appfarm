# Quiet Knight computer engine

Stockfish 18 runs as an unmodified native child process in the existing Railway chess-server service. Multiplayer remains authoritative chess.js + Redis + pub/sub; computer requests do not create or mutate rooms.

## Protocol and limits

- `GET /computer/health`: readiness, engine name, ten skill settings; no secrets.
- `POST /computer/move`: `{moves:[{from,to,promotion?}],level:1..10,expected_fen}`. Replay from the normal initial position (maximum 600 plies), compare FEN, reject illegal history. No arbitrary UCI text, executable names or engine options accepted.
- Reply: `{engine,level,skill,fen,move:{from,to,promotion?,san},elapsed_ms}`; terminal games return `move:null`.
- Before the September 2026 calibration, app levels mapped to native skills `0,2,4,7,9,11,14,16,18,20` with move times `80,100,140,180,220,260,320,400,500,650` ms. Skill 0 plus 80 ms still felt too strong at the bottom of the ladder.
- New names: Gentle, Easy, Casual, Steady, Club, Strong, Tough, Expert, Master, Stockfish. Levels 4–10 use native skills `2,5,8,14,16,18,20` at `160,200,260,420,500,580,650` ms. Level 10 retains its former Skill 20 and 650 ms search exactly.
- Levels 1–3 use Skill 20 only to generate stable candidate rankings with MultiPV `6,5,4` and `1800,3500,7000` nodes respectively. Quiet Knight samples one legal root move with rank weights `[1,2,3,3,2,1]`, `[4,5,4,2,1]`, or `[9,5,2,1]`. Candidates with large centipawn loss are excluded (thresholds 1100, 800, 500 respectively), except that a beginner may miss a mate if a reasonable alternative exists. There is no simultaneous native skill handicap or browser-side move choice. A single legal `bestmove` is used when MultiPV is incomplete (for example, only one legal move). Child-per-request naturally resets all options.
- These are product names and search budgets, not calibrated Elo ratings. Shallow MultiPV centipawn scores are diagnostics, not human Elo or a claim of playing strength.
- One native child per service replica, one thread, 32 MB hash, no waiting queue. Total child deadline 3 seconds. Rate bucket: burst eight, refill two requests/second. Busy returns 429 with Retry-After. Disconnect cancels computation. This bounds CPU and memory and keeps Node free for multiplayer.
- The frontend retries busy responses twice, with a 5.5-second total request deadline. It verifies returned FEN, level, engine and legality. Leaving/resetting aborts and rejects stale replies.
- Online failure visibly identifies a local-engine fallback. Offline computer play remains the existing cached worker, with no remote requests. It is not Stockfish. A subsequent online computer turn tries Stockfish again.

## Build and license

Dockerfile downloads the official `sf_18` baseline x86-64 release, verifies SHA256 `5c6f38b02a4da5f3ffe763f27da6c3e743eebefd92b50cb3661623b96696adff`, and retains its accompanying source, AUTHORS and GPLv3 Copying.txt inside `/opt/stockfish`. Settings links to the project and corresponding source.

- Release: https://github.com/official-stockfish/Stockfish/releases/tag/sf_18
- Corresponding source: https://github.com/official-stockfish/Stockfish/tree/sf_18
- Protocol: https://official-stockfish.github.io/docs/stockfish-wiki/UCI-Protocol-and-Stockfish-Commands.html

Run `STOCKFISH_PATH=/path/to/stockfish node verify-stockfish.js` for real-engine tests. Existing `verify-live.js` retains multiplayer/Redis acceptance; its expected build can be overridden with QK_EXPECTED_BUILD for rollback verification. Do not print Redis credentials or seat tokens.

Run `STOCKFISH_PATH=/path/to/stockfish node calibrate-stockfish.js > results.jsonl` to repeat the 11-position corpus (openings, free pawn/minor, hanging queen, fork, two mate-in-one positions, defense, quiet play, endgame). Each beginner position searches once and draws 128 seeded choices from the resulting candidate set. Then run `STOCKFISH_PATH=/path/to/stockfish node score-stockfish.js results.jsonl` for one fixed-node reference analysis of every legal move in each fixture. On the September 2026 run, best-candidate frequencies were 8%, 24%, 54%; mean candidate ranks 3.37, 2.43, 1.71; and mean shallow centipawn losses 96.9, 54, 33.9 for levels 1–3. These last figures compare different shallow searches, so they are directional, not a shared deep evaluation. Across all levels and fixtures, the slowest response was 1.76 seconds; Level 10's original settings were unchanged. The independent fixed-node review of the 11 sampled moves per level found mean centipawn losses of 732, 404, 375, 37, 47, 22, 22, 20, 29, 18; the beginner and stronger bands separate clearly, while adjacent native-skill levels fluctuate in this small sample.

Rollback before this tuning: server deployment `47d8a395-683a-41f3-83bb-113201c68e52` / commit `d13b7cbfce352f2f66def598acebc889f756c5b8`; the first calibration release is `231aa97d-57c2-4a63-96bb-01f30ca90fe3` / commit `5e01ece9e56e9e85ce1f84bc8f1d65f77444d967`. Revert the tuning commit(s) on GitHub main to trigger the usual Railway deploy. AppDeploy frontend v50 snapshot `1790217095314` contains labels only; revert it to v47 snapshot `1789511070058` separately if needed. Redis must not be restarted or replaced for this change.
