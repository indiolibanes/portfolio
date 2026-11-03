# Shorekeeper VFX R1 — Celestial Butterflies & Stellarealm

Status: **IMPLEMENTATION_PASS / VISUAL_QA_PENDING**.
Base: `cc80c9b45cf30f7117e731044496e2278c31ddd2`.
Route: `/experimentos/sk/`. Independent draft; no merge or production publication.

## Result

`ShorekeeperVfxDirector` adds one owned subtree to the existing Three.js scene. The existing RAF loop advances it before drawing. It creates no mixer or animation tracks and never writes character transforms, morphs or materials. The right hand and head are read-only anchors for the Collapsed Core, not targets for animation.

- **Celestial Butterflies:** one InstancedMesh, two positive-scale wing instances per butterfly, original four-lobed wing geometry, per-instance icy/white/violet color, independent phase, size, orbit speed, orientation and wingbeat. Double-sided thin wings use `forceSinglePass` to avoid a second transparency draw.
- **Stellarealm:** one star Points geometry, one shared LineSegments geometry for three elliptical arcs and sparse constellations, and one gradient sphere seen from inside. The sphere belongs to the VFX subtree; existing background, lights and canonical materials are unchanged.
- **Collapsed Core:** one Points geometry, precomputed curl paths, staggered lifetimes and smooth per-particle fades. Its small envelope follows the right hand; a local head exclusion volume moves motes behind the face. This is an unapproved procedural approximation, not a verified game choreography or physical light source.

The SVG prototypes remain unchanged as original authoring references. The runtime uses original geometry and a small analytic star/halo shader instead of loading image textures. No game shaders, images, animations or audio were added. No bloom, postprocessing or extra render targets.

## Manual states and controls

`OFF → AMBIENT → PREPARATION → STELLAREALM → RESONANCE_PEAK → RECOVERY → AMBIENT`.

Initial state OFF. Every state is selected manually; a state holds until another command. Recovery smoothly removes the domain/core while retaining the ambient butterfly level; the AMBIENT command completes the named cycle. Direct selection is supported for A/B comparisons. A 1.25-second smoothstep transition starts from current weights, including when another fade is interrupted.

The “Atmosfera celestial” section exposes six phases, three independent system toggles, and pause. “Comparar e registrar” offers fixed frontal/three-quarter cameras, local PNG capture, JSON metrics and optional WebGL context loss/restore simulation. Phase changes preserve the selected camera. Effects-only inspection is possible without importing a GLB.

No phase is selected by combat, music, facial events or a Burst clip. ORIGINAL, REBASED and ROOT_BODY_OWNED handling is unchanged, including the Burst02 turn.

## Performance and lifecycle

| Profile | Butterflies | Stars | Energy motes | Maximum additional draws |
| --- | ---: | ---: | ---: | ---: |
| Desktop | 18 | 320 | 40 | 5 estimated |
| Touch device or initial width ≤768px | 8 | 110 | 12 | 5 estimated |

Counts are selected once at mount from the existing presets. The mobile budget is conservative for touch devices, including tablets. The five-draw estimate comprises wings, stars, arcs, core and atmospheric sphere; **actual GPU draws remain unmeasured**. This exceeds the R0 aspirational three-draw mobile target and remains below its approximate eight-draw ceiling.

The director reuses matrices, vectors, typed arrays, paths and geometries during updates. JSON metrics are computed on demand/at the lab's existing diagnostic interval. No per-frame fetches or asset decoding. Existing DPR/pixel ceiling, renderer and FPS controls are untouched. Frame suspension covers hidden documents, offscreen viewport, loading, page cache and lost context. User pause also freezes effects; the VFX-only pause leaves character playback independent. Reduced motion fixes all trajectories and wingbeats and suppresses energy motes; manual opacity transitions remain available.

On disposal, every owned geometry/material and InstancedMesh instance resource is released once. No references to released models are retained. Context restoration relies on Three.js resource re-upload from retained CPU arrays; actual recovery is **not yet tested in WebGL**.

## Validation and measurement

Passed locally:

- Astro build and OG checks (the existing large-chunk warning remains).
- Six VFX tests: budgets, independent systems, smooth interrupted fades, manual state holds, suspension, reduced motion, unchanged model/clip/morph/material ownership, deterministic seed, positive instance scales, stable buffer identities, finite output and disposal.
- Publication/local-file/credits smoke test and route isolation regression.
- 36,000 update steps per profile, representing **600 simulated seconds**, including repeated phase changes. This is not a 600-second live browser soak test.

The reproducible CPU-only results are in `shorekeeper-vfx-r1-cpu.json`; run `node scripts/bench-shorekeeper-vfx.mjs`. That benchmark excludes GLB loading, rendering, GPU work and the rest of the application. It cannot predict Samsung Internet FPS.

The managed Chrome preview opened the actual route. It reported **WebGL2 unavailable** at context creation. The unavailable state and disabled VFX controls were verified in the browser. No effect shaders were executed, no canonical-model WebGL comparison occurred, and no frontal/three-quarter effect screenshots were produced. Samsung Internet, touch interaction, actual draw calls, GPU frame stability, context recovery and 600-second live sessions remain pending. No artistic approval is claimed.

The idle director, blink controller, expression library, combat director, Burst variant transformer, local GLB loader/cache and stage source files have the same Git blob hashes as the base. This source regression check and synthetic ownership test do not replace visual testing with the canonical model.

## Short review procedure

1. Use this branch's build/preview at `/experimentos/sk/`; the published main branch is unchanged.
2. Select Ambiente, Preparação, Stellarealm, Ápice, Recuperação, then Ambiente; compare each with Desligado. Toggle each system separately.
3. Load the canonical GLB locally if desired. Compare all three approved idles and blink with effects OFF/ON; verify face and hands remain readable. No assets are uploaded.
4. Choose Frontal and capture each phase. Repeat in Três quartos with matching idle, camera, lighting and pause state. Use local PNG capture; keep private model screenshots out of GitHub.
5. Manually compare all Burst01/02 variants; do not change orientation or infer Liberation timing. Import libraries only while the existing loader permits it.
6. Export metrics after a live 600-second session. Record device/browser, profile, renderer draws, FPS/frame time and director CPU measurements. CPU wall timing includes possible runtime/GC pauses; no GPU timer is claimed.
7. Pause/resume effects and playback; hide the tab, scroll offscreen, restore the page, and test context recovery. Repeat on Samsung Internet/Android. Check effects fade back to Ambient and OFF without residue.

## Private asset compartment

GitHub privacy belongs to the repository, not an individual folder. Use a separate private repository for archival source or a private R2 bucket for authenticated delivery. For R2 + Cloudflare Access, create the Access policy before exposing a custom domain, and leave public `r2.dev` access disabled. A server can alternatively authorize users and issue short-lived object URLs; never embed storage credentials in browser code. A public frontend does not make every asset request private automatically. This PR configures no hosting or account permissions and retains browser-local loading.

Official references:
- https://docs.github.com/en/repositories/creating-and-managing-repositories/about-repositories
- https://developers.cloudflare.com/r2/tutorials/cloudflare-access/
- https://developers.cloudflare.com/r2/api/s3/presigned-urls/

## Credits

Wuthering Waves and Shorekeeper © KURO GAMES. Independent, unofficial fan experiment, not affiliated with KURO GAMES. The procedural effect code and geometric reinterpretations are original to this experiment. Attribution is not permission to redistribute extracted game files. Existing visible credits are preserved.
