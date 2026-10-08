# Quiet Knight v37 — released after rendered staging QA

Current state: AppDeploy **v37 / 1788920004629**, rollback **v36 / 1788913697012**. See [the final release evidence](QA_RELEASE_2026-09-09.md) for measured mobile/desktop results, screenshots, actual production Stockfish reply, and explicit multiplayer/physical-device limitations.

The following is the preserved pre-preview report; its held status and rendering blockers are historical.

---

# Quiet Knight mobile-table candidate — held, not deployed

Observed 2026-09-09 UTC. This is a continuation of the existing AppDeploy project, not a replacement app. Do not merge this branch into the Railway deployment branch as part of the frontend release.

## Production remains unchanged

| Surface | Directly observed state |
| --- | --- |
| AppDeploy | quiet-knight-live-v2xp3y; v36; snapshot 1788913697012; ready |
| URL | https://quiet-knight-live-v2xp3y.v2.appdeploy.ai/ |
| Label | QK • v36 • Quiet table |
| Railway server | 743ce873-7afa-41b1-8bee-6c8f031e7c2e; SUCCESS |
| Backend build / commit | Last documented qk-server-2026-09-08-r5-table-presence / 02e9c1f866ac9eefdb44f09d147067b42530280d; deployment ID reconfirmed, raw health/build response not fetched this pass |
| Stockfish | Actual production browser: level 1 White e4, Stockfish 18 replied e5, returned to Your move |
| Postgres | de1e91d1-4de8-4984-8225-b17e3b61d734; deployment 52fd82d2-bb3a-4d16-8cbb-4d142ac56fab; SUCCESS; 500 MB volume at /var/lib/postgresql/data |
| Redis | 5fd21ffb-9a38-4f13-884c-bdd41d9eb88b; deployment eca0ab1e-606a-4800-aa1e-e089afa508e0; SUCCESS; no volume |
| Staged Railway changes | 21 changes; patch 3b485ae1-3c4f-4677-a2d0-dacdef826ffc; STAGED; untouched |

AppDeploy v36 / 1788913697012 is the exact frontend rollback target. Supabase is not the current identity/ledger store; no Supabase mutation or migration was attempted. Database contents, schema version and row counts were not newly queried. No Railway, database, Redis, scoring, identity, engine, network or service-worker source changes belong to this candidate.

## Bounded candidate

Four production files change: src/GameApp.tsx, src/chess-ui.tsx, src/game.css, tests/tests.txt. The candidate label is QK • v37 • A quieter table; v37 is a proposed label, not an existing deployed version.

- Compact opponent/own player strips, with handle, color, You, turn, and relevant presence. The computer's engine identity remains visible in its strip.
- Near-full-width unchanged board geometry and original carved piece SVGs, selected state, targets, capture/check markers, move animation and reduced-motion rules.
- Compact 16px state line and context-specific Share/Copy invite, Resign, Rematch or New game.
- One native-dialog Table controls sheet, bottom-aligned on mobile, side-aligned on desktop; Escape, close, backdrop and native focus restoration; scroll containment and safe-area padding.
- Material, captures, move history, PGN/FEN, postcards, points/history, summary, preferences and diagnostics all remain reachable inside the sheet. Preferences reuse the existing settings content. Both normal and Zen modes use the same sheet.
- No package, framework or production dependency changes. Browser test tooling acquisition was attempted only in scratch and failed.

CSS target, NOT measured rendered evidence: at 390px wide and zero safe-area insets, board playing area 374px (46.75px squares); at 360px, 344px (43px squares). Controls target 44px, player strips 48px. Nonzero safe areas reduce available width. The actual first viewport, text wrapping, centering, targets and geometry must still be measured in a browser.

## Design mismatch ledger

| Reference evidence | Current production evidence | Candidate response / intentional decision |
| --- | --- | --- |
| UX Pilot page IAMyuUWJBzqEZh3p1CGu exists but has zero designs | No completed design to compare | Do not invent a generated reference |
| UX Pilot refinement request returned ACCESS_RESTRICTED / INVALID_ARGUMENT | No usable generation output | UX/accessibility/persona/heatmap/gaze jobs not run; no Figma file created |
| User direction: opponent → board → you → state → action | v36 has board strips plus permanent secondary sidebar; source stacks it on phones | Single column and one controls sheet |
| Existing forest-green / ivory-gold / wood / carved identity | Fresh v36 desktop screenshot in qa/v36-production-reference.jpg | Preserve assets/palette; no image generation or borrowed skin |
| Secondary information must remain reachable | Existing settings, exports, captures and history are functional | Reuse components and handlers; reorganize only |

## PostHog

Connected account exposes only Default project (600489), completed_snippet_onboarding=false and ingested_event=false. Current 41-file AppDeploy source contains no PostHog instrumentation. No Quiet Knight-specific analytics project was identified. No events, keys, SDK or telemetry added; there is no new production event evidence. Do not publish the connector's returned project token in reports.

## ACTUALLY VERIFIED

- Current AppDeploy applied source is v36 / 1788913697012; all 41 source files were read, then copied exactly as the baseline.
- Railway deployment IDs, SUCCESS states, Postgres mount and unresolved staging state in the table above.
- Production browser desktop 1363×936: app identity, complete board/UI, settings/Zen/atmosphere controls, selected e2 and legal e4 marker, submitted e4, received e5, Stockfish 18, Your move.
- Inspected production console entries were browser-extension metadata failures; no app error was found in those entries. This is not a claim about the candidate console.
- A fresh v36 reference screenshot was captured. It is BEFORE evidence only, not candidate QA.

## DETERMINISTIC / SOURCE TESTED

- Candidate TypeScript noEmit and Vite production build pass.
- Existing seven regression scripts pass against candidate source/build: reconnect/background/stale callbacks, diagnostics/owned-seat resume, presence/role ordering, material/en passant/promotion/promoted-piece capture, audio semantics, Stockfish response/cancel/reset/fallback/offline recovery, PGN/FEN validation, bounded table memory, invite sharing fallbacks.
- Exact built worker passes full precache (including computer worker), embedded offline shell, preserved room query, current/previous-generation retention and Railway bypass.
- tests/tests.txt retains its five substantive workflows, updated for the sheet and mobile hierarchy. These textual acceptance workflows have NOT run on the candidate.

Run from this frontend folder using its existing dependencies and Node 24:

```sh
npx tsc --noEmit
npm run build
node qa/verify-phase1.cjs
node qa/verify-phase2.cjs
node qa/verify-table-protocol.cjs
node qa/verify-offline.mjs
node qa/verify-stockfish-frontend.cjs
node qa/verify-keepsakes.cjs
node qa/verify-share.cjs
```

These are preserved existing scripts with path adaptations. qa/fixtures/room-before.ts exists solely to demonstrate the earlier reconnect bug, not as application code.

## NOT PHYSICALLY VERIFIED / RELEASE BLOCKERS

- Candidate rendered mobile 390×844 and 360px, candidate desktop, piece centering/geometry, opening/closing/focus/scroll of the sheet, safe areas, promotion/castling/capture/check/animation/reduced-motion interactions and candidate console health.
- Two independent current-frontend clients: create/join, roles, identical FEN, bidirectional moves, disconnect/reconnect, stale-overwrite protection, resignation, same-color and swap-color rematches. No live multiplayer acceptance was executed this pass. Existing PR 2's Playwright suite was inspected and preserved; deterministic socket tests are not that suite.
- Physical Android/iPhone behavior, haptics/audio audibility, OS share sheet, 2+ minute background recovery, installed PWA launch and airplane-mode closed-app relaunch.

Why candidate rendering was blocked: the cloud browser rejected localhost with net::ERR_BLOCKED_BY_CLIENT; its URL policy also rejects local file pages. The local Playwright package is installed but Chromium is absent; downloading the headless browser failed with timeouts and a 502. No browser-policy bypass was attempted. The local dev server itself can run on 127.0.0.1:4173, but the cloud browser runs in a different container. Do not deploy merely to convert production into the first visual test.

## Next bounded action

Use a browser-capable executor with Chromium installed or an explicitly approved browser-accessible staging preview. Run the candidate's rendered matrix and true two-context multiplayer acceptance. Recheck production has not moved beyond v36; rebase only the four changed files if needed. Inspect AppDeploy deployment instructions again, deploy incremental changes to the SAME app only after the gates pass, confirm the exact new version/snapshot and actual production behavior, then stop. Do not accept the unrelated staged Railway patch or activate the held Quiet Review code.
