# VÃO 1.4.0 preview

VÃO 1.4 keeps the 36-level world overhaul from 1.3 and adds a second axis of variety: every campaign level now has its own optional engineering brief. Passing still only requires a safe bridge within budget; the brief asks you to solve that location well.

## 1.4 changes

- 36 campaign levels, 9+ environments and 6 sandbox terrains.
- 36 optional engineering briefs with one-time XP rewards.
- Brief families include compactness, low stress, budget efficiency, light construction and using specific geological supports.
- Chapter headers show completion progress.
- Level cards show environment, vehicle, hazards and brief completion.
- Environment scenery is more distinct: quarry terraces, canyon walls, mountain silhouettes, plateau mesas, river reeds, coastal buoys, city skyline and industrial cranes.
- Save format v5 preserves older progress and adds completed briefs.
- Existing Matter.js physics/editor remain unchanged.
- Android smoke workflow corrected to remove stale preview12/v1.2 package and screenshot references.

Tests:
- `node vao/tests/progression.test.js`
- `node vao/tests/editor.test.js`
- `node vao/tests/campaign.test.js`
- `node vao/tests/briefs.test.js`

Android preview package: `appfarm.vao.preview14`
Version: `1.4.0-preview` (version code 5)
Rollback before 1.4: `f8d443b9208beaedde56467994e76ddd0c015f3f`
