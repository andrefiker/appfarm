# Pictured wood-table design — 1.1.1

Target: André's supplied Quiet Knight screenshot, with the compact centered wordmark/live connection, a full-width wood board, ivory/teal carved smiling pieces, player strips, a gold invite action, material and capture rows.

Mismatch ledger:

- Default Classic vectors differed from the screenshot → default restored to the existing Kawaii Faces carved SVG set. Classic and all Animal Kingdom assets remain selectable and unchanged.
- Narrow-screen rules compressed the player strips → reference sizing restored, with 320 px fallbacks.
- Coordinate overlays covered the pictured playing field → hidden only on the main playing surface; accessible square names, keyboard navigation and study coordinates remain.
- Existing installations retain their chosen theme → “Use pictured wood table” applies Walnut, carved pieces and the normal table layout without resetting moves, records or account identity.

New games remain untimed and login stays optional. Historical clocks still render from the server's actual time control; the pictured 10:00 is not a new-game default. This visual change introduces no server, SQL, Redis or engine changes. Production backend stays at b8cec386; no new deployment is part of this design task.

Validation: existing animal/account/studio tests, TypeScript, production build, and dedicated rendered reference-table checks at 320/360/390 px and desktop. The dedicated CI workflow runs the broader real-server clock/guest/studio regression suite. Physical Android installation remains a separate on-device check.
