The single Quiet Knight 1.1.8 piece atlas replaces the former SVG piece set.
Approved design: faceted ivory/gold and lighter graphite with bright silver-gray
facets. The bishop has a split mitre; the king has a cross; the queen has a crown.
The pawn and graphite army follow the user-approved board preview.

Generated with the built-in image tool from the owner's supplied reference and
approved lighter-graphite mockup. PNG bytes are retained unmodified. Model crop
rectangles and silhouette clipping are in ../faceted-pieces.ts; they keep the
models proportional, align bases and exclude detached transparency specks.

No style selector exists. This atlas is imported by the shared Piece renderer,
so Vite emits it as a hashed local resource and precaches it for offline play.
No image service, external artwork request or new runtime dependency is used.

## Brushed-metal app icon (1.1.9)

The opaque 1254×1254 icon in frontend/public/icon.png and Android's Quiet Knight-only drawable is generated with the built-in image tool from the approved graphite knight reference. Both copies retain identical generated pixels. Prompt: one left-facing faceted graphite knight with silver edge highlights and a gold base, dark forest background, restrained gold arc, brushed champagne-aluminum/titanium checkerboard at the foot, full bleed square, no words or outer rounded corners. Android uses an adaptive foreground inset over a forest background; the web manifest and favicon use the same artwork. No other AppFarm flavor's launcher is changed.

## Emerald Enamel board (1.1.11)

`emerald-enamel-reference.png` is the unchanged 1024×1536 generated comparison preview approved by André (option 2). No additional appearance option is exposed. `board-surface.ts` renders exact square regions from the empty middle four ranks of the approved panel, using CSS background viewports on the interactive board and SVG viewports in postcards. Top/bottom ranks reuse empty-rank material to avoid painted-in pieces; texture mapping follows each named square through board flips. Other panels and headings are never rendered. Frame: slim green inset and continuous brass hairline. Piece atlas and app icon unchanged. Original preview prompt: six board alternatives retaining the approved faceted ivory/gold and graphite/gold pieces; selected Emerald Enamel: deep jewel forest green and pale warm ivory enamel, restrained brass edge, smooth tactile satin glaze.
