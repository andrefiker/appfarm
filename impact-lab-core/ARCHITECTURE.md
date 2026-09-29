# Impact Lab Physics 2.0 — architecture and boundaries

One offline Three.js/Vite application; the existing WebView wrapper, package and signing certificate are preserved. No physics engine or provider service added.

## Event as source of truth
`DamageEvent.physical` links ordered contacts, normalized energy before/after contact, a polyline path, structural state transitions, fracture decisions and recorded response samples. States are intact (implicit), stressed, deformed, disrupted, fractured and separated. All values are fictional simulation units. Event order is authoritative. Layer selection and quality are presentation settings.

`path-solver.ts` continuously raycasts the current BVH geometry. Overlapping tissues consume the maximum active resistance, not a sum of stacked shells. Empty cavities have a small fictional transport loss. Up to two bounded bone deflections change the actual subsequent ray. Prior disruption reduces local resistance; existing skin openings and internal channels have reduced resistance. Removed bone is absent from the parent collider and displaced fragments participate as their own meshes. No ammunition, real energy units, fragmentation/weapon model or medical outcome is encoded.

## Local response and structural geometry
`physics-state.ts` builds a small anchored contact-node network (maximum 48 nodes). Nodes within a local neighborhood are spring-coupled; tissue-dependent mass/stiffness and damping are integrated at 1/120 second for 97 samples. The final state is frozen. There is no whole-body soft body. A bounded vector field maps direction, tangential shear and local falloff onto affected skin, muscle and organs. Geometry displacement is capped and stays local.

`fractures.ts` partitions original bone triangles around failure sites. Boundary loops close solid ends or connect adjacent shell rims; an extracted fragment is displaced and rotated about a tethered local attachment. Fragments are bounded, stationary after settling, and participate in BVH raycasts. Repeated local failures increase their displacement. Maximum twelve fragment clusters and thirty events. This is constrained mesh segmentation, not finite-element fracture or a free rigid-body collision solver. Fragment-to-organ contact is not independently solved; soft-tissue motion derives from the linked event contacts.

`replay.ts` stores sparse before/after vertex patches for only the latest event, plus the recorded fixed-step contact response. Playback supports 1×, 0.25×, 0.05×, pause, scrub and one-frame step. Seeking does not re-run random physics. Fracture topology and tissue openings switch at the recorded disruption phase; interpolated geometry reproduces local motion. The projectile marker travels along the recorded path. Render sampling can skip physical frames at low FPS, while step/scrub can inspect them. Undo removes an event and reconstructs the deterministic settled state. Reset restores originals.

## Rendering and inspection
Original licensed anatomy remains aligned. Skin has a restrained procedural normal response and warmer diffuse variation. Lined tissue openings remain aligned with path segments; structural bone failures use actual split geometry instead of a dark tube overlay. Anatomy surfaces and caps use the same damage records. Axial/coronal/sagittal/free cuts have movable offsets; Free can align to the current camera. Orthogonal presets orient the camera toward the exposed section. Only moving caps are rebuilt during replay. Local blood remains a bounded illustrative surface effect.

The event inspector lists selected events, entry coordinates, contacts/states, path segments and structural failures. Quality modes alter pixel-ratio limits (Mobile 1, Balanced 1.25, Ultra 1.75). They deliberately share simulation logic, meshes and state. No expensive AO/bloom/reflection stack was added; existing studio lighting and contact shadow remain.

## Persistence and lifecycle
Versioned `impact-core-damage-v2` local storage contains deterministic events and response samples. Reopening reconstructs geometry and the latest replay. Invalid/unsupported saves are discarded rather than executed. Settings use the existing settings key. There is no patient data or network storage. Backgrounding suspends rendering/replay; resuming resets wall-clock delta to avoid a jump. The Android manifest requests no permissions.

## Limits retained openly
This remains a constrained illustrative solver, not biomechanical, forensic or medical validation. Bone fragmentation is a bounded local partition; it is not material stress propagation through a full skeleton. Deformation has no volumetric incompressibility/fluid model. Tissue openings use shader cutouts and geometric lining; ray behavior recognizes channels, but no general volumetric mesh surgery is performed. Complex section caps approximate nested cavities. The inherited neck seam, simplified face and rough brain/skull source surfaces remain. Head fracture and brain displacement are supported; a new head/neck remesh is deferred. Only the latest event has a rolling replay. Physical Android performance/install/resume are not tested here.

Rollback: `c6bbcac49971ccd3734b500701c0c2638b778227` (final 1.3.0). Physics checkpoint: `2051abe5797118834086e5435c90190abc2c4f78`.

## 2.1.0 gel presentation and host medium

The existing state, event serialization (schema 2), Android package and replay remain intact. The persisted `skin` view key now displays **Gel**, with the same geometric contact surface and embedded bones/organs. Muscle remains an independent inspection view. `gel.ts` owns the cheap clearcoat/Fresnel shell and closed corrugated cavity meshes. Coincident segments merge without erasing deflection bends; repeat events enlarge a bounded channel. The latest recorded event frame drives a deterministic illustrative temporary expansion, then freezes the permanent channel. This expansion is a visual envelope, not a new measured fluid solver.

`path-solver.ts` accounts for a continuous synthetic host inside the skin boundary, using the maximum host/insert resistance rather than summing overlaps. Existing projectile channels reduce local host resistance. Mesh intersections still use both front/back faces; only the gel rendering shader discards back faces. This separation prevents transparency choices from losing exits. No new runtime services, textures or downloaded assets. The RoomEnvironment reflection map is generated locally once. Cavity geometries/materials dispose on reset/rebuild, cap at the existing 30-event/four-leg event bounds, and remain absent from other isolated-layer views.

Rollback: 0a727de6d12e1644d7d595c4d5583dfc93063bc4 (delivered 2.0.0); prior APK and signing identity preserved. Gel replaces the opaque default appearance, not the underlying anatomy or original raycast/undo/persistence controls.

## Gel-only Exhibition 2.2.0

The interface now exposes only the gel specimen, three shot styles, camera controls, replay/speed/scrub, undo and reset. Old layer/cutaway code remains in source for rollback/system tests but is absent from this product UI. Existing saved view/tool settings migrate to the exhibition presentation without discarding damage.

`shot-profiles.ts` separates fictional profile parameters, independent contact rays, grouping and recorded path sampling. Every pellet is a normal DamageEvent with optional `weapon` and `shotId`; schema 2 remains backward-compatible. One trigger groups three representative shotgun pellets. Undo removes the whole group. Replay capture combines all group contact responses and geometry patches; reloading reconstructs the latest full group. Distinct normalized energy affects traversal, while profile width affects surface opening, displacement and gel channel diameter.

`shot-animation.ts` uses a fixed pool of three tips/trails. Each follows its recorded path from an external approach point to the actual terminal point. No fresh randomness or physics is run during playback. `gel.ts` opens each cavity ring only after the moving front arrives, expands and settles it; pre-existing merged channels remain visible before the new event. Dynamic updates touch only active paths. Organ inserts fade during replay and the active temporary cavity/tip use a see-through inspection overlay for readability through bones. Settled cavities return to ordinary depth testing. This is an explicit exhibition convention, not volumetric refraction.

Recorded replay advances by elapsed wall time, with background time excluded; it no longer caps every rendered frame at 50 ms. Pause/resume preserves the current frame. Mobile/Balanced/Ultra continue to change rendering resolution only. Existing 30-projectile-record and 12-fragment bounds remain. No backend, accounts, network permissions or runtime asset downloads.

Rollback: 47ceccb479e150bb25c99dffc8706ef86720edd9 (delivered 2.1.0). Package identity and private signing key unchanged.

## 2.2.1 reference-fed rifle

`rifle-reference.ts` stores a primary-source launch reference, calculates kinetic energy and exposes the explicit compatibility mapping to existing solver units. New rifle events snapshot their launch data; old events retain their saved paths and previous replay timing. No material resistance was recalibrated or disguised as measured data.

Replay weights each recorded leg by its mean speed (speed proportional to square root of remaining energy), with constant work per distance within the leg. Cavity-front arrival uses the inverse mapping, cached when geometry is rebuilt rather than recalculated per vertex every frame. A short outbound marker follows only a recorded skin exit and remaining energy; it creates no extra damage/collision record. The UI identifies the cartridge reference and About explains launch evidence versus uncalibrated gel response. Package/signature/data keys remain unchanged. Rollback: 923ca5980835bb0b7cd75cde726fc79783c2b7b5, delivered 2.2.0.
