# Release gate

Block release unless: engine verification passes; server tests prove recipient-specific private views, bot-observation isolation and idempotent commands; Neon persistence and restart recovery pass; Vercel health and WebSocket checks are green; AppDeploy production QA verifies separate guest views, spectators, reconnect and mobile portrait. No Quiet Knight path or runtime resource may be changed.
