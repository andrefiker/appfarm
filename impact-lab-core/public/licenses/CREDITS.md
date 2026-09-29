# Credits and asset licensing

Torso meshes adapted from **Z-Anatomy**, anatomy/design by **Gauthier Kervyn**, derived from **BodyParts3D**, **Kousaku Okubo**, **The Database Center for Life Science (DBCLS)**.

Source: https://github.com/Z-Anatomy/Models-of-human-anatomy at commit `7cc49aa8749632adcd564c0e75f096dc43f6a4b8`, exact archive and Blender hashes in RESEARCH.md. Bundled derivative `public/models/torso.glb` and anatomical metadata are provided under **Creative Commons Attribution-ShareAlike 4.0 International**: https://creativecommons.org/licenses/by-sa/4.0/ . Preserve attribution, indicate changes, and share adaptations under this license. No endorsement is implied.

Changes: selected torso structures, removed unrelated anatomy and excluded separately sourced restricted models; merged skin patches; cropped at neck/pelvis/shoulders; converted bowel curve to mesh; welded, subdivided and decimated; applied transforms; added stable IDs and optimized glTF export. New procedural materials replace atlas textures. See the processing script and recipe.

The exact downloaded Z-Anatomy notice is `public/licenses/Z-Anatomy.txt`. It identifies original BodyParts3D licensing as CC BY-SA 2.1 Japan; the current official archive now lists CC BY 4.0. Both facts are preserved in RESEARCH.md. This build follows the downloaded Z-Anatomy derivative's CC BY-SA 4.0 requirements. Kidney/head/ear/brain and other separately credited restricted contributions are not selected. No atlas definitions or upstream application code are incorporated.

Three.js 0.180.0 — Copyright 2010–2025 Three.js authors, MIT license bundled at `public/licenses/Three-MIT.txt`. Independent application code is MIT. Build dependency licenses are retained by npm packages; pinned versions are in package-lock.json.

three-mesh-bvh 0.9.1 — Garrett Johnson, MIT; bundled notice `public/licenses/Three-Mesh-BVH-MIT.txt`. Used for acceleration of actual anatomy intersections and section slicing.

## Head added in 1.2
BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International. Original 4.0 archive dated 20130619, downloaded from the official archive on 2026-09-29. Per-file provenance is in `public/models/head.json`; notices and license links at `public/licenses/BodyParts3D.txt` and `CC-BY-4.0.txt`. Head skin/skull/brain are sourced directly from this archive, avoiding separately licensed Z-Anatomy head contributions. Head skin is joined to the earlier Z-Anatomy torso; the combined derivative is distributed under CC BY-SA 4.0. Scaling, envelope extraction, repairs and remeshing are adaptations.
