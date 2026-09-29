# Impact Lab: Core — build decisions

Researched 2026-09-28. This is an anatomical visualization toy, not an injury predictor.

## Supported anatomy
- https://openstax.org/books/anatomy-and-physiology/pages/1-6-anatomical-terminology — supports anatomical left/right, anterior/posterior, body planes and cavity relationships. Use subject-relative labels and a shared upright coordinate system. Heart/lungs belong in the thorax, abdominal viscera below the diaphragm. This is a terminology/reference source; no OpenStax text or illustrations are bundled. It does not validate a damage model.
- https://github.com/Z-Anatomy/Models-of-human-anatomy — downloaded repository commit `7cc49aa8749632adcd564c0e75f096dc43f6a4b8`; `Z-Anatomy.zip` SHA256 `e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736`; contained `Startup.blend` dated 2023-05-02, SHA256 `9f08a17ea0115fed80b2a73ecdf0a1bc2ab2f6956f37c593ce23d513ea35afcd`. Use selected aligned torso meshes. Attribution: Gauthier Kervyn / Z-Anatomy, derived from Kousaku Okubo / BodyParts3D / DBCLS. Asset derivative under CC BY-SA 4.0. Exact upstream notice bundled. No kidney, head/ear/cranial or brain models are selected because the notice lists additional sources and NC conditions for some of them. No atlas definitions or upstream application code are copied.
- https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html — official archive now states CC BY 4.0 (updated 2025-02-27), while Z-Anatomy's downloaded notice identifies its original BodyParts3D contribution as CC BY-SA 2.1 Japan. Preserve both provenance facts and the downloaded notice; do not use the newer archive license to erase Z-Anatomy's own CC BY-SA requirements. This build uses the Z-Anatomy derivative, not a fresh BodyParts3D archive.

## Visual approximation
- https://threejs.org/docs/pages/Raycaster.html — supports sorted mesh intersections, both-sided casting and the need to deduplicate coincident triangle-edge hits. Cast against all anatomical meshes independent of display visibility, use paired surface intervals and bounded shell thickness. Raycasting alone does not establish material thickness or medical effects.
- https://threejs.org/docs/pages/Material.html and https://threejs.org/examples/webgl_clipping_stencil.html — clipping is a rendering operation. Use a controlled inspection opening with tissue lining, without changing the collision anatomy or making the whole subject transparent. Cut faces need deliberate treatment; opacity alone cannot supply depth.
- https://www.medlineplus.gov/bruises.html — a bruise involves damaged small vessels beneath unbroken skin; this supports localized discoloration distinct from an opening. Immediate visible bruising is an accelerated illustrative convention; no healing timeline is simulated.
- https://www.msdmanuals.com/professional/injuries-poisoning/abdominal-trauma/overview-of-abdominal-trauma — distinguishes blunt and penetrating mechanisms and anatomical involvement. Use restrained blunt deformation/discoloration versus a small inset entry and directional internal path. It supplies no validated intensity or resistance values for this app.

## Fictional game parameters
Three normalized impact intensities and one generic projectile. Deformation caps, radii, transfer falloff, resistance, track budget and fracture activation are invented display parameters. No real weapon, medical threshold, pain score, survival probability, healing model or tissue mechanics claim.

## Recovery decision
Recovered `Impact-Lab-2.0.0-Offline.html` from the Project files. Its bundled Three.js confirms an offline web implementation was feasible. The old full-body, equipment and armor presentation does not fit this scope, so it is preserved without importing its architecture. Existing minimal Android packaging in AppFarm is reused separately.

## 1.1 acceleration decision
- https://github.com/gkjohnson/three-mesh-bvh/tree/v0.9.1 — primary source, exact npm package 0.9.1 (MIT). Supports `acceleratedRaycast`, indirect BVH construction, refit after position changes, and bounds-pruned shapecasts. Preserve original triangle indices with `indirect:true`; refit changed skin/muscle after deformation; use all intersections (not first-hit-only) for interval pairing. CPU acceleration does not establish physical-phone frame rate. Geometry and fictional damage rules remain unchanged.

## 1.2 head and projectile revision
- https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html and https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html — authoritative original BodyParts3D archive, CC BY 4.0 explicitly permits redistribution/adaptation with attribution. Exact 20130619 / version 4.0 archive and per-OBJ hashes retained. Supports generic head/cranial/brain anatomy; does not validate the neck fit to a different derivative.
- SUPPORTED ANATOMY: original head surface, skull parts and cerebral/cerebellar structures, with anatomical left/right preserved.
- VISUAL APPROXIMATION: outer-envelope skin joined to the previous torso; closed remeshed cranial structures; static gravity-following blood, irregular lined wounds, bounded tissue deformation and affected tracks. Facial muscles, eyes and fine neuroanatomy are incomplete. Original BP3D skin is a thin two-surface shell; using it as a body envelope produced a false immediate exit. The derivative extracts an outer envelope instead.
- FICTIONAL GAME PARAMETERS: wound growth, 30-event cap, locally increased penetration through previous contacts. No rifle specifications, injury thresholds, bleeding-rate model, fluid dynamics or injury prediction. Distant contacts remain independent.

## 1.3 implementation refinement
VISUAL APPROXIMATION: shader cutouts and matching tube linings represent disrupted tissue in each actual crossed mesh and its section cap. Layer isolation shows the same lesion. Larger branching fissure masks affect crossed bone only.
FICTIONAL GAME PARAMETER: increased penetration budget, local opening widths and cumulative radius limits are art-direction parameters. They are not calibrated to Kalashnikov ammunition, energy, medical thresholds or survival. No new anatomy dataset or medical claim was introduced.

## Physics-core implementation sources (2026-09-29)

- https://threejs.org/docs/pages/BufferGeometry.html — supports indexed/attribute geometry mutation, normal/bounds recomputation and disposal. Decision: split bounded local bone subsets and update actual vertex buffers. Limitation: Three.js provides geometry operations, not validated fracture mechanics.
- https://github.com/gkjohnson/three-mesh-bvh — supports accelerated ray/spatial queries, refit after vertex movement, rebuild when topology changes. Decision: refit local deformation, rebuild changed fracture subsets. Limitation: rays and BVHs alone do not solve material physics.
- https://threejs.org/docs/pages/Plane.html — supports plane normals, offsets and geometric intersections. Decision: shared axial/coronal/sagittal/free section planes used by meshes, caps and paths. Limitation: plane clipping does not supply anatomical interior topology.

SUPPORTED ANATOMY remains the licensed aligned datasets already documented. VISUAL APPROXIMATION: anchored contact-node response, local bone partition/tether displacement, sparse directional deformation and simplified section caps. FICTIONAL GAME PARAMETER: every resistance, failure threshold, path deflection, mass/stiffness/damping value and displacement bound. No weapon-specific, medical or forensic source calibration was attempted.

## Gel-dummy pass — 2.1.0, 2026-09-29

| Source | What it supports | Implementation decision | Limitation |
|---|---|---|---|
| https://ballisticdummylab.com/pages/film-production-dummy-supplier-movie-tv-ballistic-props | Manufacturer describes camera-oriented gel props, embedded/prepared effects and slow-motion production use. | Amber transparent specimen with readable internal structures and restrained replay cavity expansion. | Marketing is not biomechanical validation; film effects may be staged. No effects-rig instructions or performance values imported. |
| https://ballisticdummylab.com/products/perma-gel-ballistic-dummy-deluxe-torso-with-head | Clear gel torso/head with imitation skeleton and optional organ inserts. | Keep existing licensed head/torso meshes; gel replaces opaque outer presentation, bones/organs remain visible. | Page has inconsistent organic/synthetic copy; not used to infer chemistry, calibration or physical constants. Commercial imagery/models are not licensed for reuse and are not bundled. |
| https://clearballistics.com/shop/10-gel-joe-fit-torso-gel | Commercial molded synthetic torso surrogate. | Treat gel as a continuous host between anatomical inserts. | Manufacturer equivalence claims are not adopted. No recipe or ammunition data used. |
| https://threejs.org/docs/pages/MeshPhysicalMaterial.html | Clearcoat/transmission/material features and per-pixel cost. | Single-pass transparent clearcoat with Fresnel opacity and locally generated studio environment; no screen-space transmission pass. | Approximate optics: no thickness-resolved absorption or true refraction. |

SUPPORTED ANATOMY: unchanged previously attributed BodyParts3D/Z-Anatomy meshes and spatial relationships.
VISUAL APPROXIMATION: amber surface scattering, stress whitening, corrugated closed air-cavity geometry, temporary replay expansion, synthetic organ coloration. Gel cavities use the actual recorded deflected path; embedded organs can occlude them until sectioned. The source has a remaining head/neck seam.
FICTIONAL GAME PARAMETER: normalized continuous gel resistance, weakened existing-channel resistance, cavity radius/growth/caps and expansion timing. Not calibrated against gelatin tests, ammunition, human injury, or television footage. The existing bounded bone/soft-tissue solver remains in use. This is a stylized synthetic surrogate, not a validated ballistic-gel solver.
