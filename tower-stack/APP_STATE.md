# Tower Stack — app state

- Identity: Tower Stack 1.0.0 / code 1 / com.andrefiker.towerstack.
- Branch: tower-stack-v1.0.0; isolated from main.
- Architecture: bundled Canvas + Matter.js 0.20.0; minimal Android WebView;
  local deterministic replay saves; no backend or Internet permission.
- Implemented: Endless, Precision, Time Attack, Zen, Sandbox; Classic, Minimal,
  Neon; optional rotation; sound/haptics; pause; statistics; one-tap restart.
- Local verification: 16 rules/physics tests pass. Browser cannot start here
  because socket creation is restricted. SDK and Gradle recovered locally;
  remote dependency resolution is being checked. CI provides browser and emulator QA.
- Release status: candidate; do not infer published/device-tested until CI evidence.
- Rollback: 0db2815c14b727031d63e7c14ef0a75255690e90 (pre-Tower Stack main).
- Limitations: debug signing; Android 8+; very long deterministic replays can delay
  Continue; no physical-device performance claim.
