# Optional fun features and one-second effects

Adds all ten approved ideas on top of the clearer one-second effects in PR #25. Emerald Enamel textures, piece sizes, board geometry, chess rules and server authority are retained.

| Option | Behavior |
| --- | --- |
| Comic captures | Piece-specific BONK, HOP, SWISH, CLANG, BOOM or AHEM label during impact. |
| Capture replay | Separate read-only dialog replays the latest observed capture; replay never submits a move, plays personality audio, or modifies the match. Incoming moves close it. |
| Captured-piece landing | A decorative copy tumbles from the capture square into the correct loss tray; actual capture counts update immediately. |
| En passant sneak | Pawn sidesteps with a footprint trail; the victim crumbles on its actual square. |
| Promotion ceremony | A crown drops above the selected promoted piece, including underpromotion. |
| Revenge effect | An immediate recapture gets a distinct pale-green spark. |
| Personality sounds | Six short synthesized voices, with separate switches for each piece and no downloads. Defaults off; also respects master sound, volume, Quiet Mode, reduced motion and backgrounding. |
| Victory poses | The last moving piece gives a role-specific celebration on checkmate; kings retain the bow/topple. No replay on reopening a finished game. |
| Draw handshake | Both kings bow briefly when the live game transitions into a draw. |
| Rematch entrance | Pieces slide into formation after a new game is confirmed; arrival effects do not block input or replay on reload. |

Find switches under Settings → Play your way → Fun extras. Visual options default on, can be disabled individually, and require Playful piece effects and Move animations. Quiet Mode and reduced motion suppress effects. Each visual lasts 1,000 ms, with 50 ms for cleanup. The ordinary glide stays quick. Animation options do not change chess moves or game outcomes.

Capture trays and rematch entrances apply to the main table, where those features exist. Local studio also supports comic captures, replay, en passant, crowns, recapture sparks, victory poses and personality audio.

## Evidence

- TypeScript, frontend production build and deterministic move metadata tests passed.
- Focused browser tests cover the ten options, replay isolation and closing on incoming moves, preference persistence, actual Web Audio oscillator scheduling, master/per-piece mute, Quiet Mode, reduced motion, and fresh rematch seat confirmation.
- All 39 browser scenarios passed in the final run: 11 new fun-option scenarios, 15 existing effects scenarios, four draw-consent scenarios, seven capture/history scenarios and two responsive/symmetry scenarios.
- Rendered mobile screenshots of captures, replay at 320 px, en passant, promotion and rematch were inspected. The attached preview records the candidate UI with synthetic transport.
- Multiplayer tests use synthetic HTTP/WebSocket transport; the existing draw suite runs the production consent transition with independent clients. No physical phone, audible speaker test, signed APK or real production two-player game was verified.

## Release

The user explicitly approved applying all options and pushing/publishing. This candidate is based on 06c90ad1d143320015539fd99e7a0029be8cd437. Deployment status and the exact published SHA are recorded in the PR after the release attempt. The pre-release production deployment is 1e3df6a3-504c-4de1-81e2-5799c3665edb, commit 0559995a574592f7702492ee556424a203198ce5, and remains the rollback target. App, Postgres and Redis were online with no reported issues before release.

[Rendered capture and replay preview](fun-preview.mp4)
