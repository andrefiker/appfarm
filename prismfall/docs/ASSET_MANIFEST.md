# Prismfall: Asset Manifest

**SpriteCook credits spent: 0.**
**SpriteCook asset IDs: none.**

SpriteCook was not connected in the build session (2 Oct 2026). A tool search for "spritecook" found no tool, so I couldn't check a credit balance or generate any asset. Following the brief's fallback rule ("finish with placeholder shapes"), every asset is a **procedural placeholder** drawn by canvas code in `assets/art.js`. All of them use one style reference, described below.

The game draws these at runtime at the exact screen resolution. The PNGs in `assets/sprites/` are exported from the same code by `node tools/export-art.mjs`. The PNGs are used as the favicon and the `.exe` icon, and they serve as reference sheets.

Mojulo was skipped because Prismfall is a 2D puzzle game and gains nothing from 3D or a generated world. No credits were used there either.

## Style reference (shared by every asset)

The style is a "soft candy-paper" tile, defined in `PFArt.drawTile`:

- Rounded square with a 20% corner radius and 4.5% inset.
- Vertical gradient: base colour lightened 32% at the top, the base colour at 55%, and darkened 16% at the bottom.
- Thin rim in the base colour darkened 32%, at 55% opacity.
- Glossy white band over the top third, fading from 62% to 4% opacity.
- Soft inner shade along the bottom.
- White shine dot at the top-left.
- Seven deterministic paper-speckle dots.

## Procedural asset list

ID format: `proc:<generator>:<args>`. The generator column says how each one is made, standing in for a prompt.

| ID | Used for | Generator / spec (stands in for a prompt) | File export |
|---|---|---|---|
| proc:tile:<theme>:I…L (42 tiles) | Block minos, 7 piece types × 6 themes | `drawTile(size, theme.colors[type])` | `sprites/sheet-<theme>.png` row 1 |
| proc:tile:prism:* | Prism theme minos | `drawTile` with a diagonal 3-stop HSL gradient, hue = 190 + 51 × piece index | `sprites/sheet-prism.png` |
| proc:ghost:<theme>:* (42) | Landing-preview ghost | Rounded outline: 16% colour fill, 70% dashed stroke | sheet row 2 |
| proc:gem | Gem overlay on a mino, flying gems, counter icon | `drawGem`: faceted diamond, white→#bdf1ff→#6fb8ff gradient, white edge, facet lines, blue glow | `sprites/gem.png`, sheet col 8 |
| proc:tile:grey | Game-over greyed stack | `drawTile` at #c9cbd6 | sheet col 8, row 2 |
| proc:icon:<px> | Favicon, `.exe` icon | `buildIcon`: light card, T piece with gem, I/O/Z tiles | `sprites/icon-{16,32,48,64,128,256}.png` |
| proc:bg:<theme> | Background | Two-stop vertical gradient (`bgTop`, `bgBot`) plus a 26 px offset dot grid at 4.5% | runtime only |
| proc:deco | Drifting background shapes | 16 translucent triangles or rounded squares in piece colours; a rainbow hue cycle during Fever | runtime only |
| proc:chrome | Board well and panels (UI kit) | White rounded cards, 14 px radius, soft shadow, grid lines, meter track | runtime only |
| proc:meter | Prism meter | 6-stop pastel rainbow capsule that glows and cycles hue when full | runtime only |
| proc:fx:* (animation set) | Line-clear collapse, debris, hard-drop streak, lock flash, gem homing, Burst sparks, Fever wash, callout pop, sparkle twinkle, danger pulse | Code-driven animations in `game.js` (`updateFx` and `drawGame`) | runtime only |
| css:ui-kit | Menus, buttons, cards, toasts, sliders | `assets/style.css`, light theme only | n/a |
| svg:gem-inline | Shard icon in menus | Inline SVG diamond | n/a |

Themes: `paper`, `candy`, `seaglass`, `citrus`, `lavender`, `prism`. Their palettes are in `assets/art.js`.

## Missing SpriteCook assets

These are the assets I would have generated with SpriteCook. The game is complete without them, because each one has a procedural placeholder in the table above.

| Planned SpriteCook asset | Placeholder in use now |
|---|---|
| Style-reference tile (1 image, the anchor for all others) | `drawTile` |
| Block tile sets, 7 pieces × 6 themes | proc:tile:* |
| Gem mino overlay plus a 4-frame sparkle animation | proc:gem plus code twinkle |
| Background plates, one per theme (6) | proc:bg plus proc:deco |
| UI kit: panel, button and icon set (hold, next, shard) | CSS plus proc:chrome |
| Logo wordmark "PRISMFALL" | CSS gradient text |
| Short animation set: line-clear burst (6 frames), Prism Burst beam (8 frames), Fever overlay loop | proc:fx:* |
| App icon | proc:icon |

**Assumption:** I can't give SpriteCook credit costs, because I couldn't reach the account and I'm not guessing prices. To swap in real art later, generate tiles at 128×128 and replace the `drawTile` and `drawGem` calls in `buildTileSet` with image draws. Every other part of the game reads tiles only through `buildTileSet`.

## Audio

No audio assets. All sound effects and music are synthesized live with the Web Audio API in `assets/audio.js`.
