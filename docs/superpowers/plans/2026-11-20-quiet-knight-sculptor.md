# Quiet Knight Sculptor Implementation Plan

> Execute against the exact shipped 1.6.1 source with targeted checks.

**Goal:** Deliver a Sculptor-only Quiet Knight appearance and an authenticated lifetime score across rooms.
**Architecture:** Existing React and Vite app, existing Node head-to-head endpoint, existing Android flavor.
**Spec:** docs/superpowers/specs/2026-11-20-quiet-knight-sculptor-design.md

- [ ] Pin 1.6.1 revision 7ee9edd; find original APK, signing and exact packaging path before distribution.
- [ ] Update pieces.tsx, theme styles/preferences and keepsakes together. Test 12 distinct piece models, alternating tiles, prior preference overwrite without clearing saves, and portrait game controls.
- [ ] Use player identity in the lifetime score front end. Test side swaps, rematches including casual games, new room, absent IDs, request failures and delayed settlements.
- [ ] Build frontend and review narrowly scoped diff. Compile update if tooling and signer are available; verify application ID, increasing version code and identical certificate before distributing.
