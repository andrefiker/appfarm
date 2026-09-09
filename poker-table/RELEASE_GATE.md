# Release gate

Block release unless: engine verification passes; server tests prove private views/idempotency; Postgres persistence and restart recovery pass; deployed health check is green; production QA verifies separate guest views. No Quiet Knight path or runtime resource may be changed.
