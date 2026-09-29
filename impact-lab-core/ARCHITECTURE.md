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
