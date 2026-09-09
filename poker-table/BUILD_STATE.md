# Build state

Baseline Stage 1 PASS reproduced. The v1 server and PWA are being integrated around the immutable engine. The Poker runtime is Vercel Hobby + the isolated Neon `poker-table-v1` database; Railway and Render are not used. Redis is intentionally omitted: one durable table uses Neon transactions, and warm Vercel WebSocket instances publish recipient-specific snapshots while every invocation recovers canonical state from Neon.

Current gate: implementation and local verification are green; deployed realtime, recovery, private-view, and PWA release QA remain required before release-candidate approval.
