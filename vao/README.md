# VÃO 1.3.0 preview

VÃO is the local-first bridge-building / structural puzzle game in AppFarm. Version 1.3 keeps the recovered Matter.js physics, touch editor, budget system, replays, local saves, material simulation and Android WebView shell, but replaces the campaign layer with a much broader structural journey.

## 1.3 campaign overhaul

- 36 campaign levels instead of 20.
- 9 structural chapters and at least 9 visually distinct environments.
- Terrain now includes uneven banks, central islands, multiple piers, deep gorges, overhead rock / low-clearance problems, flood channels, industrial cuts, coastal pontoons, mountain crossings and multi-span viaducts.
- Later stages combine wind, rising water, cargo, heavy vehicles and moving platforms instead of relying on material swaps for difficulty.
- Six varied sandbox terrains replace the old three nearly-identical spans.
- Environment-aware blueprint palettes and subtle scenery make quarry, canyon, river, coast, mountain, industrial and city crossings visually distinct while keeping construction readable.
- Legacy v1-v1.2 progress migrates to save version 4. Completing the old 20-level campaign opens level 21; the full-campaign Veteran milestone now requires all 36 levels.
- Existing core materials and physics are preserved. The extra materials (aluminum, concrete, composite) remain progression rewards rather than the main source of level variety.

Run:
- \`node vao/tests/progression.test.js\`
- \`node vao/tests/editor.test.js\`
- \`node vao/tests/campaign.test.js\`

Open \`vao/index.html\` in a browser for the game. The Android WebView shell is \`vao/android/\`. The build workflow bundles \`index.html\`, \`progression.js\` and \`levels-v2.js\` locally; there is no network dependency, backend, login or analytics.

Android preview package: \`appfarm.vao.preview13\`, version \`1.3.0-preview\` (version code 4). It installs beside the older v1, v1.1 and v1.2 preview packages.

The original v1 package \`appfarm.vao\` uses a private signing certificate with SHA-256 fingerprint \`E3:E3:98:5C:22:50:C8:CB:1B:7F:4E:1A:80:9D:E7:50:15:3A:1E:01:D2:C0:71:64:FE:BC:C3:7A:0D:AF:47:1B\`. A compatible in-place upgrade still requires that original signing key.

Rollback target before the 1.3 world/campaign overhaul: \`1b88ff13c3330fd8e7e07c042a83cdbb24a7a02c\`.
