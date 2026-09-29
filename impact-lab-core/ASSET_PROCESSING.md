# Reproduce the anatomy derivative

1. Clone Z-Anatomy/Models-of-human-anatomy and checkout `7cc49aa8749632adcd564c0e75f096dc43f6a4b8`.
2. Verify `Z-Anatomy.zip` SHA256 `e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736`.
3. Extract `Z-Anatomy/Startup.blend`; verify SHA256 `9f08a17ea0115fed80b2a73ecdf0a1bc2ab2f6956f37c593ce23d513ea35afcd`.
4. With Blender 4.2.0: `blender -b --factory-startup --disable-autoexec -t 2 --python scripts/process-anatomy.py -- /absolute/path/Startup.blend /absolute/path/public/models/torso.glb`.
5. The script emits the aligned GLB and anatomy-metadata.json. Use the included derivative directly for normal builds; Blender is not required to package the app.

The script loads only selected objects via Blender libraries; loading the entire atlas exceeded the previous environment's memory. Parent dependencies must be linked and the view layer updated before world transforms. Copy shared mesh data before modifiers. Convert Jejunum from a curve. Join/weld skin patches before subdivision and include proximal thigh skin before pelvic cropping to avoid folds from incomplete closure. Blender Z is shifted by -1.18 before glTF Y-up export. Skin remains a continuous envelope; other structures retain stable IDs. No private key or personal data is an asset input.
