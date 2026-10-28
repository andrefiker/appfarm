Pocket Bowling 1.0.0 — offline portrait bowling for Android 8+.

- Ten-pin scoring, ten-frame Classic, five-frame Quick, Practice, Challenge and 90-second Time Attack.
- Fixed-step planar ball/pin physics with impulse-driven pin tilt, friction and adjustable hook.
- Flick controls plus precision position/aim/power/spin controls. Left-friendly default and mirrored action layout.
- Classic Alley, Neon Night and Minimal themes; independent synthesized audio and haptics settings.
- Local saved games, statistics and documented pre-throw recovery after interruption.

The APK is debug-signed, with v2/v3 signatures. No Internet permission or runtime network dependency. Physics is an approximation rather than full 3D. No AI opponents. Physical-device QA has not been performed.

The release workflow publishes only after deterministic tests, two UI-driven full games and mobile browser checks, APK verification, and offline Android emulator smoke QA pass. Detailed evidence is attached to its GitHub Actions run.

Source is on `codex/pocket-bowling-v1.0.0`; the tag points to the verified source commit. Main is unchanged. Rollback base: `0db2815c14b727031d63e7c14ef0a75255690e90`.
