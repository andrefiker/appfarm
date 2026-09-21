# Quiet Knight Railway frontend provenance

Source: AppDeploy v47
App: quiet-knight-live-v2xp3y
Version: 1789511070058

The repository's existing quiet-knight-clock-frontend mirror is byte-equivalent to this v47 snapshot after trailing-whitespace normalization except for:
- src/GameApp.tsx
- src/chess-ui.tsx
- src/modern.css
- src/pieces.tsx

Those four files are vendored here directly from AppDeploy v47.

Railway-only adaptations:
- src/network.ts uses same-origin HTTP and WebSocket endpoints.
- vite.config.ts uses base "/" so SPA fallback routes load hashed assets from the Railway origin.

Seat tokens, join request keys, and Knight credentials remain local/private and are not placed in URLs.
AppDeploy remains untouched and is not used at runtime by this Railway build.
