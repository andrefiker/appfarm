# Clear one-second piece effects

Capture attacks now last exactly 1,000 ms: roughly 300 ms to approach, 300 ms for a clear impact, and 400 ms to settle and fade. The gold impact marks have dark outlines for contrast on both ivory and emerald squares, the bishop slash is wider, and captured fragments separate farther while remaining visible longer. The queen ring expands more slowly. Knight landing and dust timing are aligned with contact. Other playful effects also last one second; ordinary non-capture glides remain quick at 260 ms.

Decorative nodes are removed after 1,050 ms to allow the last animation frame to finish. Input remains available throughout. Quiet Mode, reduced motion, the animation toggle, event conflict handling, and history behavior are retained. No chess logic, engine, assets, backend protocol, or draw controls changed.

## Evidence

- Production before this change returned `ok:true` with commit `0559995a574592f7702492ee556424a203198ce5`.
- TypeScript and frontend production build passed.
- All 15 effects browser scenarios passed, including exact one-second capture timing, both orientations, special moves, immediate next moves, preferences, reduced motion, and history boundaries.
- Rendered mobile impact screenshot and sampled recording frames inspected; the queen impact ring is visible on the ivory square. The attached recording is from the actual candidate UI with synthetic multiplayer transport.
- Both responsive board and piece-symmetry regressions passed at 320, 360, 390 and/or 1280 px, with both orientations covered by the symmetry checks.
- No physical phone test, signed APK, or real two-player production game test.

## Publication

Candidate only; requires approval under the user's standing deployment rule. The current production build remains `0559995a574592f7702492ee556424a203198ce5`, deployed as `1e3df6a3-504c-4de1-81e2-5799c3665edb`; this is the rollback target for the candidate. Earlier PRs remain unmerged.

[Rendered one-second effects preview](one-second-preview.mp4)
