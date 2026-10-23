# Quiet Knight 1.1.0 — 01–55 completion matrix

Application commit: `d2d486a59e75e5a5c658832aca4ce66548872799`. Original Quiet Knight / Animal Kingdom only.

Candidate statuses: {'DONE': 43, 'PARTIAL': 11, 'NOT TESTED': 1}. DONE means qualified in the isolated candidate, never deployed or physically certified.

[APK + 13 browser scenarios](https://github.com/andrefiker/appfarm/actions/runs/40008559663) · [Docker/v4/native Stockfish/backup/rollback gate](https://github.com/andrefiker/appfarm/actions/runs/40008559802)

## 01. Board-first game screen

**DONE** — Make the game screen board-first: maximize playable board area on portrait Android, remove distracting chrome, maintain legible player and status information, and avoid touch obstruction or overflow at ~320 px width.

Implementation: [frontend/src/chess-ui.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/chess-ui.tsx), [frontend/src/studio.css](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/studio.css)

Evidence: [frontend-acceptance/studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 02. Classic pieces and preserved Animal Kingdom art

**DONE** — Retain all 12 existing Animal Kingdom PNGs unchanged and accessible. Add an alternative high-clarity Classic/Staunton piece set, visually distinct for each piece and side even at small sizes. Never replace or silently alter approved Animal Kingdom assets.

Implementation: [frontend/src/classic-pieces.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/classic-pieces.tsx), [pieces.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/pieces.tsx), [table-atmosphere.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/table-atmosphere.tsx)

Evidence: [frontend/tests/animal-assets.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/animal-assets.test.mjs), [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 03. Optional accounts and direct play

**DONE** — Open directly to a no-login play menu with obvious Play Computer, Play Friend and Continue Game actions. Optional Account panel retains registration, login, recovery and private history without blocking guest play.

Implementation: [frontend/src/GameApp.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/GameApp.tsx), [knight-id.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/knight-id.tsx)

Evidence: [frontend-acceptance/guest.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/guest.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 04. Authoritative untimed new games

**DONE** — Guarantee all NEW ordinary games and rematches are genuinely UNTIMED at the authoritative backend/game-state level. Preserve all existing stored 10+0 clocks and their server timeout behavior. Never implement the superseded 15+0 request; never merely hide clock UI. Detect legacy/incompatible production capabilities, explain limitations clearly, and prevent misleading claims. Untimed PGN TimeControl is “-”; historical timed PGN remains “600+0”.

Implementation: [clock.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/clock.js), [capabilities.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/capabilities.js), [frontend/src/server-capabilities.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/server-capabilities.ts), [game-record.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/game-record.ts)

Evidence: [verify-clock.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/verify-clock.js), [verify-clock-server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/verify-clock-server.js), [clock.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/clock.spec.js), [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 05. Private friend invitations

**PARTIAL** — Make shareable private friend invitations, ideally links plus room codes. Validate permissions, app-link handling and recipient flows, with a manual fallback if links cannot open the app.

Implementation: [frontend/src/invitation.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/invitation.tsx), [GameApp.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/GameApp.tsx)

Evidence: [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: HTTPS/code/QR/manual flows and custom native intent implemented; recipient Android app-intent behavior not physically tested.

## 06. Autosave and recovery

**PARTIAL** — Auto-save games and moves reliably across app kills, screen lock, network interruptions and device restarts. Distinguish local/computer state from server-authoritative multiplayer state; never overwrite a newer remote game with stale local data.

Implementation: [frontend/src/offline.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/offline.ts), [local-rules.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/local-rules.ts), [live-resume.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/live-resume.ts), [use-room-realtime.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/use-room-realtime.ts)

Evidence: [account-local-data.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/account-local-data.test.mjs), [studio-rules.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/studio-rules.test.mjs), [guest.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/guest.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: Versioned main/studio storage and recovery, reload/reconnect tested; phone force-stop, lock and reboot not physically tested.

## 07. Real difficulty presets

**DONE** — Add adjustable and meaningful engine difficulty presets (beginner, casual, club, strong, plus a suitable fine-grained control). Verify actual behavior at each difficulty rather than only changing labels.

Implementation: [frontend/src/offline-engine.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/offline-engine.ts), [use-computer-opponent.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/use-computer-opponent.ts), [chess-ui.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/chess-ui.tsx)

Evidence: [wasm-engine.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/wasm-engine.test.mjs). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 08. Legal/last/check highlights

**DONE** — Highlight selected squares, legal destinations, captures, last move and a checked king using clear, accessible contrast and restrained visuals.

Implementation: [frontend/src/chess-ui.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/chess-ui.tsx), [game.css](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/game.css), [studio.css](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/studio.css)

Evidence: [guest.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/guest.spec.js), [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 09. Post-game analysis

**DONE** — Build a navigable post-game analysis mode with Stockfish-based evaluation, alternative moves, readable mistake categories and a way back to the original game. Keep analysis separate from actual multiplayer moves.

Implementation: [frontend/src/StudyRoom.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/StudyRoom.tsx), [offline-engine.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/offline-engine.ts)

Evidence: [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 10. Bundled offline engine

**DONE** — Deliver and verify a genuinely OFFLINE computer chess engine on-device, identifying its actual technology/version and license. The existing bundled fallback is NOT proof of offline native Stockfish 18. If native Stockfish 18 is infeasible within constraints, use a real locally bundled, licensed engine and truthfully label its version; do not claim unavailable strength or functionality.

Implementation: [frontend/scripts/prepare-engine.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/scripts/prepare-engine.mjs), [src/offline-engine.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/offline-engine.ts)

Evidence: [wasm-engine.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/wasm-engine.test.mjs), [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 11. Seat-safe reconnection

**DONE** — Make reconnection resilient: reconnecting guest/account players recover authorized seats and authoritative board state; viewers never gain move rights; surface meaningful connection states and avoid double-submitted moves.

Implementation: [frontend/src/use-room-realtime.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/use-room-realtime.ts), [GameApp.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/GameApp.tsx), [server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/server.js)

Evidence: [verify-guest-server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/verify-guest-server.js), [verify-server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/verify-server.js), [guest.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/guest.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 12. Poco / Android 16 qualification

**NOT TESTED** — Qualify the APK for Poco X7 Pro / Android 16 where real-device access exists: installation, touch, portrait layout, screen lock/background/restore, audio, offline play and two-client multiplayer. If hardware is unavailable, use emulators/browser tests and explicitly list physical checks as unverified.

Implementation: android-store; docs/release-candidate.md physical checklist

Evidence: No physical Poco X7 Pro or Android emulator available. [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: No Poco X7 Pro or Android emulator access.

## 13. Tap and drag moves

**DONE** — Support both tap-to-move and drag-to-move; configurable, touch friendly and usable without precision gestures.

Implementation: [frontend/src/chess-ui.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/chess-ui.tsx)

Evidence: [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 14. Move previews and capture distinction

**DONE** — Show clear legal-move previews and optional attack/capture distinctions, without revealing analysis when assistance is disabled.

Implementation: [frontend/src/chess-ui.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/chess-ui.tsx), [GameApp.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/GameApp.tsx), [StudyRoom.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/StudyRoom.tsx)

Evidence: [guest.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/guest.spec.js), [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 15. Optional motion

**DONE** — Use subtle, optional capture/move animations; prioritize responsiveness, clarity and reduced-motion settings.

Implementation: [frontend/src/play-preferences.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/play-preferences.tsx), [chess-ui.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/chess-ui.tsx), [game.css](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/game.css), [studio.css](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/studio.css)

Evidence: source preference/reduced-motion review; browser movement. [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 16. Four-piece promotion

**DONE** — Implement a large, accessible four-piece promotion chooser with correct underpromotion behavior.

Implementation: [frontend/src/chess-ui.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/chess-ui.tsx), [StudyRoom.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/StudyRoom.tsx)

Evidence: [studio-rules.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/studio-rules.test.mjs), [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 17. Captured material

**DONE** — Display captured material and material balance without crowding the board.

Implementation: [frontend/src/chess-ui.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/chess-ui.tsx)

Evidence: rendered board; existing view-model material logic. [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 18. Move history and review

**DONE** — Provide expandable algebraic move history, review navigation and current move highlighting; browsing history must not accidentally mutate the live game.

Implementation: [frontend/src/chess-ui.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/chess-ui.tsx), [StudyRoom.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/StudyRoom.tsx)

Evidence: [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 19. Flip and coordinates

**DONE** — Support manual board flip, sensible automatic orientation for Black and correct coordinate labels.

Implementation: [frontend/src/GameApp.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/GameApp.tsx), [StudyRoom.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/StudyRoom.tsx)

Evidence: [clock.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/clock.spec.js), [studio-rules.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/studio-rules.test.mjs). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 20. Move confirmation

**DONE** — Offer an optional confirmation-before-move setting; default off, especially for quick casual play.

Implementation: [frontend/src/GameApp.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/GameApp.tsx), [play-preferences.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/play-preferences.tsx)

Evidence: [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 21. Undo/redo and mutual takeback

**DONE** — Support undo/redo/takeback against the computer; multiplayer takebacks require explicit bilateral consent and server-checked authorization if offered. Never allow spectators or unauthorized clients to roll back moves.

Implementation: [frontend/src/GameApp.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/GameApp.tsx), [consent.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/consent.js)

Evidence: [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js), [consent.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/tests/consent.test.mjs), [verify-studio-server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/verify-studio-server.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 22. Standard draw and mate rules

**DONE** — Handle stalemate, checkmate, legal draws, offers/acceptance, repetition, insufficient material and applicable 50-/75-move conditions correctly; preserve PGN result and rules consistency.

Implementation: [frontend/src/local-rules.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/local-rules.ts), [consent.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/consent.js), [identity.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/identity.js)

Evidence: [verify-server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/verify-server.js), [studio-rules.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/studio-rules.test.mjs). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 23. Offline pass-and-play

**DONE** — Add fully local pass-and-play for two people on one phone, with turn-based board flipping, no login and no network requirement.

Implementation: [frontend/src/StudyRoom.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/StudyRoom.tsx)

Evidence: [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 24. Local Chess960

**DONE** — Add separately selectable Chess960/Fischer Random, with verified starting setup, legal Chess960 castling, FEN/PGN representation, replay and correct engine/backend support. Default remains standard untimed chess; gate unsupported online variants rather than fake support.

Implementation: [frontend/src/local-rules.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/local-rules.ts), [StudyRoom.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/StudyRoom.tsx), [offline-engine.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/offline-engine.ts)

Evidence: [studio-rules.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/studio-rules.test.mjs), [wasm-engine.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/wasm-engine.test.mjs), [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 25. Evaluation graph

**DONE** — Provide a readable post-game evaluation graph and jump-to-position navigation; mark whether evaluation is engine-generated or provisional.

Implementation: [frontend/src/StudyRoom.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/StudyRoom.tsx)

Evidence: [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 26. Mistake and missed-tactic categories

**DONE** — Detect major blunders, mistakes and missed tactical opportunities using declared scoring thresholds/search limits, and avoid pseudoscientific precision or “best move” guarantees.

Implementation: [frontend/src/review-assessment.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/review-assessment.ts), [StudyRoom.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/StudyRoom.tsx)

Evidence: [studio-rules.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/studio-rules.test.mjs), [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 27. Deterministic candidate explanations

**DONE** — Add useful, understandable explanations of candidate best moves using deterministic chess features/variations (threats, material, king safety, tactics); no paid API or external generative AI. Distinguish explanation heuristics from engine evaluation.

Implementation: [frontend/src/local-rules.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/local-rules.ts), [StudyRoom.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/StudyRoom.tsx)

Evidence: [studio-rules.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/studio-rules.test.mjs), [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 28. Animal opponent styles

**PARTIAL** — Give offline AI opponents recognizable playing styles (e.g., Fox = tactical, Tortoise = defensive, Owl = positional, plus beginner), implemented through real, tested difficulty/selection parameters, not merely names or random illegal moves.

Implementation: [frontend/src/offline-engine.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/offline-engine.ts), [play-preferences.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/play-preferences.tsx)

Evidence: [studio-rules.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/studio-rules.test.mjs). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: Actual engine candidates use distinct feature-based policies; deterministic policy tests pass. No calibrated Elo or physical/human style comparison.

## 29. Opt-in adaptive difficulty

**DONE** — Optionally adapt computer difficulty based on local games with user consent/toggle and transparency; do not secretly modify rated or human games.

Implementation: [frontend/src/review-assessment.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/review-assessment.ts), [GameApp.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/GameApp.tsx)

Evidence: [studio-rules.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/studio-rules.test.mjs). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 30. Offline tactics

**DONE** — Add offline tactics exercises with solutions, hints, explanations, replay and a small properly licensed starter set; support forks, pins, skewers, discovered attacks, mate patterns and progressively harder puzzles.

Implementation: [frontend/src/training-content.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/training-content.ts), [StudyRoom.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/StudyRoom.tsx)

Evidence: [studio-rules.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/studio-rules.test.mjs), [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 31. Curated opening explorer

**DONE** — Add a compact offline opening explorer with transparent source/license, name, move frequency or curated continuation data, and no fabricated statistics.

Implementation: [frontend/src/training-content.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/training-content.ts), [StudyRoom.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/StudyRoom.tsx)

Evidence: [studio-rules.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/studio-rules.test.mjs). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 32. Endgame trainer

**DONE** — Add an offline endgame trainer (basic mates, king/pawn and elementary rook endings) with correct position setup, success criteria and hints.

Implementation: [frontend/src/training-content.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/training-content.ts), [StudyRoom.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/StudyRoom.tsx)

Evidence: [studio-rules.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/studio-rules.test.mjs). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 33. Editor and FEN validation

**DONE** — Add a position editor and robust FEN import/export, turn/castling/en-passant validation and ability to start local engine analysis or a game from a legal position.

Implementation: [frontend/src/local-rules.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/local-rules.ts), [StudyRoom.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/StudyRoom.tsx)

Evidence: [studio-rules.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/studio-rules.test.mjs), [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 34. Continue the Position

**DONE** — Permit analysis of locally saved positions without overwriting an ongoing match; “Continue the Position” should be one tap from the home screen where a saved session exists.

Implementation: [frontend/src/GameApp.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/GameApp.tsx), [StudyRoom.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/StudyRoom.tsx)

Evidence: [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js), [studio-rules.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/studio-rules.test.mjs). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 35. Engine resource controls

**PARTIAL** — Add engine strength, thinking time, CPU/battery and responsiveness controls; cancel or suspend obsolete searches on navigation/backgrounding and profile performance on Android.

Implementation: [frontend/src/offline-engine.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/offline-engine.ts), [play-preferences.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/play-preferences.tsx)

Evidence: [wasm-engine.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/wasm-engine.test.mjs), [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: One-thread bounded searches and real worker cancellation tested; Android CPU/battery profile not measured.

## 36. QR invitations without camera

**PARTIAL** — Generate shareable QR invitations without forcing a camera permission; provide link/code input and operating-system/external QR scanning alternatives. Only add in-app camera scanning after separate permission approval.

Implementation: [frontend/src/invitation.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/invitation.tsx)

Evidence: [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: Real generated QR displayed; manual link/code fallback works. Phone QR decoder/recipient handoff not physically tested.

## 37. Guest nicknames

**DONE** — Allow local guest display nicknames without creating accounts. Sanitize display names, keep private seat credentials out of names, links, logs and screenshots.

Implementation: [capabilities.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/capabilities.js), [server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/server.js), [play-preferences.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/play-preferences.tsx)

Evidence: [consent.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/tests/consent.test.mjs), [verify-studio-server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/verify-studio-server.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 38. Lobby and side selection

**DONE** — Add a clear game lobby showing side selection, invitation state, untimed/variant rules and spectator count, without disclosing protected information.

Implementation: [server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/server.js), [GameApp.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/GameApp.tsx)

Evidence: [verify-studio-server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/verify-studio-server.js), [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 39. Connectivity and acknowledgements

**DONE** — Display actionable connectivity indicators: connected, reconnecting, peer disconnected, server unavailable and incompatible backend. Do not claim delivery of a move before server confirmation.

Implementation: [frontend/src/server-capabilities.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/server-capabilities.ts), [use-room-realtime.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/use-room-realtime.ts), [GameApp.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/GameApp.tsx)

Evidence: [guest.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/guest.spec.js), [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 40. Rematch consent and refusal

**DONE** — Make one-tap rematches with same/swapped colors; enforce guest/account ownership and untimed rematch creation. Support refusal/cancellation cleanly.

Implementation: [server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/server.js), [GameApp.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/GameApp.tsx)

Evidence: [verify-studio-server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/verify-studio-server.js), [clock.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/clock.spec.js), [guest.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/guest.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 41. Untimed correspondence

**PARTIAL** — Add optional correspondence-style asynchronous play, with server-persisted turns and reopen/resume flows. Preserve the “new games untimed” rule: NO countdowns, per-move forfeits or implicit time controls. Optional reminders must not become compulsory, spammy or paid; do not enable live notifications without necessary permission and release approval.

Implementation: [server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/server.js)

Evidence: [verify-studio-server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/verify-studio-server.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: Untimed correspondence and server restart tested; production Redis AOF/RDB persistence and capacity still require release qualification.

## 42. Read-only spectators

**DONE** — Add safe spectator mode: read-only board and legal public game status, no move, resign, pause, rematch, nudge or private token access.

Implementation: [access-control.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/access-control.js), [server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/server.js)

Evidence: [verify-guest-server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/verify-guest-server.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 43. Opt-in reaction palette

**DONE** — Add a small opt-in, nonverbal, abuse-resistant reaction palette, including optional Animal Kingdom reactions. No free-form chat, uploads or unmoderated message service.

Implementation: [server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/server.js), [GameApp.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/GameApp.tsx)

Evidence: [verify-studio-server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/verify-studio-server.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 44. Safe room retention

**DONE** — Design abandoned-room expiration/cleanup with explicit documentation and tests. Never delete active or historical games or accounts; live cleanup jobs/database writes require separate production approval.

Implementation: [server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/server.js)

Evidence: [verify-studio-server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/verify-studio-server.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 45. Backend capabilities

**DONE** — Show server capabilities and live/unsupported game features clearly; avoid misleading “untimed multiplayer available” claims while the production server still uses the old behavior.

Implementation: [capabilities.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/capabilities.js), [frontend/src/server-capabilities.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/server-capabilities.ts), [about.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/about.tsx)

Evidence: [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 46. Android portrait and insets

**PARTIAL** — Optimize immersive portrait Android UI with correct insets, keyboard behavior, navigation gestures, orientation safety and large tap targets; do not require a landscape layout.

Implementation: [studio.css](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/studio.css)

Evidence: APK compilation/manifest gate; browser320px; physical insets/keyboard NOT TESTED. [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: Portrait/insets/keyboard/font-scale changes compile; 320 px browser fit tested. Physical Android 16 behavior unverified.

## 47. Left-handed controls

**DONE** — Add a configurable left-handed control layout and ergonomic one-handed access without changing chess orientation unexpectedly.

Implementation: [frontend/src/play-preferences.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/play-preferences.tsx), [studio.css](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/studio.css)

Evidence: [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 48. Five requested themes

**DONE** — Offer board/UI themes: Classic Wood, Midnight, Ivory, Forest and Animal Kingdom. Persist preferences locally; themes must not obscure the pieces or change rules.

Implementation: [frontend/src/table-atmosphere.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/table-atmosphere.tsx), [studio.css](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/studio.css)

Evidence: [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 49. Accessibility

**PARTIAL** — Add accessibility: high contrast, non-color-only indicators, TalkBack/semantic labels where possible, scalable controls, reduced motion, readable text and tap alternatives to dragging. Validate against relevant WCAG 2.2 touch principles.

Implementation: [frontend/src/chess-ui.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/chess-ui.tsx), [studio.css](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/studio.css)

Evidence: browser320px, tap alternatives, reduced-motion/high-contrast source; TalkBack/system scaling NOT TESTED. [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: Semantic/tap/keyboard controls, contrast cues, reduced motion and target sizes implemented; no TalkBack or full WCAG conformance audit.

## 50. Sound and haptics

**PARTIAL** — Add quiet, optional move/capture sounds and configurable haptics that respect mute/accessibility/system behavior. No surprise audio or permanent background playback.

Implementation: [frontend/src/chess-audio.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/chess-audio.ts), [GameApp.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/GameApp.tsx)

Evidence: source cancellation/mute review; real Android audio/haptics/system behavior NOT TESTED. [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: Quiet generated audio and opt-in browser vibration implemented, defaults off; real Android mute, audio and haptics not physically tested.

## 51. CPU/background efficiency

**PARTIAL** — Reduce polling, unnecessary WebView CPU/battery usage and stale engine work; test foreground/background recovery, thermal/battery impact and cancellation of computation.

Implementation: [frontend/src/offline-engine.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/offline-engine.ts), [use-room-realtime.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/use-room-realtime.ts)

Evidence: [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: Polling is bounded, obsolete workers stop on background/navigation; physical thermal/battery measurements unavailable.

## 52. About and sanitized diagnostics

**DONE** — Add a privacy-safe About / Diagnostics screen showing package/version/code, source commit, engine implementation/version, offline status, server compatibility and sanitized connection status. Do not expose tokens, private player records, credential-bearing URLs or secrets.

Implementation: [frontend/src/about.tsx](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/about.tsx), [diagnostics.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/diagnostics.ts)

Evidence: source redaction/metadata review; APK package/version verification. [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 53. PGN/FEN portability

**DONE** — Add portable PGN game export/import and FEN sharing with strong input validation, clear save/restore boundaries, no compulsory registration and no accidental local-data overwrite.

Implementation: [frontend/src/local-rules.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/local-rules.ts), [game-record.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/game-record.ts)

Evidence: [studio-rules.test.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/tests/studio-rules.test.mjs), [studio.spec.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend-acceptance/studio.spec.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 54. Security boundaries

**DONE** — Harden anonymous capability tokens, account-seat identity checks, WebSocket reauthorization, rate limiting, replay/idempotency, logging redaction, spectator boundaries, secure Android WebViewAssetLoader and restrictive file-access settings. Test attacks with synthetic users; do not loosen security to make guest access easier.

Implementation: [server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/server.js), [access-control.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/access-control.js), [consent.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/consent.js), [network.ts](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/src/network.ts)

Evidence: [verify-guest-server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/verify-guest-server.js), [verify-studio-server.js](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/verify-studio-server.js). [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: None within isolated candidate qualification.

## 55. Repeatable release package

**PARTIAL** — Create repeatable release artifacts with versioning, proven signing/package identity, checksum, commit hash, reproducible build instructions, relevant licenses, test reports, screenshots, rollback/migration guidance and upgrade compatibility notes. Preserve separately gated schema-v4 release process and do not claim an older differently signed APK can update in place.

Implementation: [prepare-engine.mjs](https://github.com/andrefiker/appfarm/blob/d2d486a59e75e5a5c658832aca4ce66548872799/quiet-knight-server/frontend/scripts/prepare-engine.mjs)

Evidence: CI/APK signature/checksum/source/license preservation; compatible production rollback room-data proof remains separately gated. [Exact-commit CI](https://github.com/andrefiker/appfarm/actions/runs/40008559663)

Limit: Signed APK/source/checksum/notices/encrypted signer preserved. Future automated updates need retained test-signing secret; full production room-data rollback and original artwork rights remain release prerequisites.

## Special product features

- Quiet Mode: implemented and browser-tested; critical check/turn/network feedback stays visible.
- Continue the Position: implemented; independent studio save, main game and live match remain separate.
- Animal AI styles: real candidate-selection policies, bounded search and explicit difficulty; qualitative human/physical comparison remains unverified.

## Production boundary

Candidate protocol 2 is separate from the production server observed at clock 10+0 / commit ebaf078f1148b764f1da013b7c2f7871ec76f9c6. New friend creation is blocked on incompatible production; existing rooms preserve their actual time controls. No production deployment, SQL migration, main merge or new paid resource occurred.
