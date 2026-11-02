# SINGULARITY — AppFarm Experiment 001

Offline, cinematic, touch-controlled black-hole arcade. The visual centerpiece is a procedural WebGL2 shader that simulates a glowing accretion disc, gravitationally bent background stars, a photon ring, and luminous jets. A no-network Canvas2D fallback keeps the game playable on systems without WebGL2.

**Gameplay:** tap ENTER, then aim anywhere on the screen and release to fire a probe. Trajectory preview predicts curvature using velocity Verlet integration. Collect the orbiting crystals, skim the event horizon for bonus points, and spend six probes in one run. Personal best persists locally. Sound, small haptics, and resolution adaptation improve the experience.

**Run locally:** open `web/index.html` in a desktop browser or serve the `web/` folder with a local static server. No npm dependencies are required. `npm test` tests physics; `npm run lint` syntax-checks JavaScript. Android code uses a minimal offline WebView shell and bundles the web assets. No backend, account, analytics, or network permission.

**APK:** use the `Build SINGULARITY APK` GitHub Actions workflow. It builds a debug-signed APK (sideloadable, not release-signed), checks package/version/signature and packaged assets, and uploads one artifact. Do not mistake this source project for an APK until the workflow has actually completed.

**Known verification gap:** Chromium in the current constrained sandbox refuses WebGL2 contexts, so local automated browser checks exercise the Canvas2D fallback only. The shader is unverified on GPU until Android GPU/emulator or compatible desktop GPU testing. Device install/background/resume tests still required.
