# Simulation schema 1

IDs are permanent: 0 air, 1 sand, 2 water, 3 stone, 4 wood, 5 fire, 6 smoke, 7 lava, 8 steam, 9 oil, 10 plant. Uint8 materials, Float32 heat, Uint16 lifetime, Uint32 update stamps. World dimensions, tick and xorshift32 state are serialized. Occupancy is counted from the grid rather than a fallible incremental counter.

Each 1/30 simulation second first exchanges heat between occupied right/down neighbor pairs. Exchange is 0.035 of the old difference per pair, applied simultaneously, then heat relaxes 0.2% toward 20 and clamps to −100…1500 game units. Air insulates. Heat is not measured in °C. Lava resets its own heat to 1100; fire to 650.

Movement scans bottom to top with seeded alternation of horizontal scan direction. Each particle considers down (up for gas), then diagonals in seeded order, then sideways for liquids/gases. Density ordering is sand > lava > water > oil > gases > air. Solids do not swap. A move swaps material, temperature and lifetime atomically. Update stamps stop a moving particle from receiving its normal update twice. A displaced lighter particle can be displaced again by another particle, preserving occupancy. Diagonal motion also requires a passable horizontal neighbor, so particles cannot cut through a sealed diagonal corner. No wraparound; boundaries are sealed. Lava moves only every fourth tick.

Rules, creation and consumption:

- Sand, water, stone, wood and oil conserve their cells through movement, except the explicit reactions below. Painting adds into air; erasing removes; fill deliberately replaces an entire connected region.
- Lava adjacent to water: one lava becomes one stone at 450 heat; one water becomes one steam at 180. This resolves in the lava update and stamps both results. No additional particles are emitted.
- Water above 100 becomes one steam at at least 130 heat. Steam ages, rises and condenses into one water below 90 after 60 ticks. Condensation preserves the local heat.
- Wood over 220, oil over 160 and plants over 180 become fire. Fire also ignites adjacent wood/oil/plants with probability 0.22 per neighbor update. New fire lifetimes: wood 160, oil 100, plants 80 (100 if thermal ignition); directly painted fire 55. Fuel is consumed into the same cell. Flames can drift upward.
- Adjacent water extinguishes fire into air and receives 15 heat, capped at 99. The water remains water, unless another explicit reaction later consumes it. Normal fire expiration becomes smoke with probability 0.8, otherwise air. Smoke lasts 220 updates, then becomes air.
- Plants consider growth every 12 ticks, with probability 0.3. An adjacent water cell with neighboring air becomes one plant. Water is consumed one-for-one; plants do not duplicate matter. They can grow upward and sideways.
- Thermal changes and fire/smoke expiry are explicitly nonconservative. Reaction gas production is a gameplay choice, not chemical stoichiometry.

Newly created reaction cells wait until the next tick for their own update. Save/restore preserves all random and lifecycle state. Empty-cell heat is retained during cooling but does not transfer to neighbors. Empty cells can carry a former flame's heat without becoming a source.

Fixed simulation rate is independent of requestAnimationFrame. Wall time is bounded to 100 ms per advance and six updates per render; overload drops excess elapsed time, never partially applies a tick. Painting freezes updates during a stroke; dialogs suspend updates; background pauses timers. Paused frames avoid unnecessary full-grid rendering.

Deterministic tests verify movement, separation, heat, reactions, painting, seed equality, exact continuation after save, boundaries, full liquids, invalid state, all presets and mixed inert conservation over 500 steps. This does not establish real-world physical accuracy.
