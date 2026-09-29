# Reproduce the anatomy derivative

1. Clone Z-Anatomy/Models-of-human-anatomy and checkout `7cc49aa8749632adcd564c0e75f096dc43f6a4b8`.
2. Verify `Z-Anatomy.zip` SHA256 `e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736`.
3. Extract `Z-Anatomy/Startup.blend`; verify SHA256 `9f08a17ea0115fed80b2a73ecdf0a1bc2ab2f6956f37c593ce23d513ea35afcd`.
4. With Blender 4.2.0: `blender -b --factory-startup --disable-autoexec -t 2 --python scripts/process-anatomy.py -- /absolute/path/Startup.blend /absolute/path/public/models/torso.glb`.
5. The script emits the aligned GLB and anatomy-metadata.json. Use the included derivative directly for normal builds; Blender is not required to package the app.

The script loads only selected objects via Blender libraries; loading the entire atlas exceeded the previous environment's memory. Parent dependencies must be linked and the view layer updated before world transforms. Copy shared mesh data before modifiers. Convert Jejunum from a curve. Join/weld skin patches before subdivision and include proximal thigh skin before pelvic cropping to avoid folds from incomplete closure. Blender Z is shifted by -1.18 before glTF Y-up export. Skin remains a continuous envelope; other structures retain stable IDs. No private key or personal data is an asset input.

## Head derivative, 1.2
Download the exact original BodyParts3D 4.0 archive and `partof_element_parts.txt` from `https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20130619/`. Archive SHA256 is in `public/licenses/BodyParts3D.txt`; per-file hashes and structure IDs are in `public/models/head.json`. Run `python scripts/process-head.py EXTRACTED_OBJ_DIR PARTOF_ELEMENT_TABLE public/models/head.glb`. The existing torso GLB is also an input for joining skin. Python dependencies used: trimesh 4.7.4, fast-simplification 0.1.12, mapbox-earcut 1.0.3, networkx 3.5, rtree 1.4.1, scikit-image 0.25.2, NumPy/SciPy. No external executable dataset content is run.

Head skin is sampled from the outermost atlas surface to remove the original thin inner shell, joined to torso skin with a bounded neck connector. Open/nonmanifold cranial parts are voxel-remeshed at 2 mm as closed approximations. Normals are repaired. Incomplete facial musculature, simplified eyes, a visible close-up neck transition and simplified cranial cut faces remain visual limitations. Normal app builds reuse the bundled GLBs.
