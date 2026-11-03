# Emerald 1.5.0 — gameplay usability

Updates Emerald 1.4.1 (versionCode 20) in place to 1.5.0 (21). Package remains com.andrefiker.quietknight.emerald with the retained signing certificate. Original faceted ivory/graphite art, Emerald Enamel texture, square geometry, portrait activity, account separation and saved games remain.

## Requested outcomes

1. Active player has a gold edge plus text; check retains explicit warning.
2. Player identity, lost pieces and material share compact top/bottom strips.
3. Material advantage stays visible. Detailed totals explain that material is not an outcome prediction.
4. Selected square, legal destinations, last move and check have distinct markers.
5. Tap and optional drag remain; drag previews legal/invalid destinations. Release off-board or Escape cancels.
6. Existing optional move confirmation remains off by default; pending confirmation locks board input.
7. Resign, draw, sound and board lock live in the bottom sheet. Incoming draw offers remain visible outside it.
8. Review has a scrubber, previous/next and explicit return to current position. Review cancels pending move confirmation and cannot submit moves.
9. Existing one-second capture phases remain; reduced motion, quiet and battery modes suppress decorative effects.
10. Computer identity, fallback, difficulty and thinking/paused/unavailable states are explicit.
11. End reasons distinguish checkmate, stalemate, insufficient material, repetition, fifty-move draw and agreement; rematch/review/new-opponent actions are grouped.
12. Existing validated save/recovery remains; resume card identifies side, level, move number and turn.
13. Connection warning preserves confirmed position and disables moves. Pending HTTP move has explicit waiting-for-confirmation notice.
14. Persistent large text, square coordinates and existing contrast, sound, haptic and motion options.
15. Three-stage Notice/Plan/Move hints for local authored exercises only; never injected into live human games.
16. Promotion selection previews the actual piece and its movement before explicit confirmation.
17. Existing movie replay provides 0.5x/1x/2x and longer pauses on captures/checks.
18. Board lock blocks input; pointer or keyboard hold for 900 ms unlocks. Lock is session-local and resets on game replacement.
19. Persistent same/swap rematch preference; same server endpoint remains authoritative.
20. Archive search by player/date/mode and result filter; per-game moves can be expanded. Export still covers the full archive.
21. Post-game analysis flags candidate weak positions; practice forks a separate local position and keeps the archived original. Bounded analysis is explicitly provisional.
22. Battery saver suppresses decoration and requests 100 ms engine searches without overwriting individual preferences.
23. Three dismissible first-game tips; dismissal survives restart.

## Build and release

Frontend: npm ci; npx tsc --noEmit; npm run test:review; npm run test:effects; npm run test:archive; node --experimental-strip-types tests/studio-rules.test.mjs; npm run build -- --base=./.
Android: copy frontend/dist into app/src/main/assets/quiet-knight; Gradle 8.10.2 / Java 17, `gradle -PqkStandaloneEmerald :app:assembleQuietKnightRelease`; zipalign and sign locally using the retained Emerald key. No signing secrets are committed or uploaded to CI.
Browser acceptance uses synthetic HTTP/WebSocket clients, production chess/consent logic and real bundled rendering. See ux-upgrade, move-review, draw-offer, piece-effects and extra-fun specs. Real phone installation and touch behavior still require device confirmation.

No backend or database change or production deployment. The existing untimed server health was read successfully; this is not proof of an end-to-end live production game. Rollback source: 9a4f57eeca92252d4670c0adf3d0c2a4862a24ef (1.4.1). A later rollback APK must increase versionCode and keep the certificate.
