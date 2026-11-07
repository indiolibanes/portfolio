# Jardim das Marés Astrais — R6.7 technical design

DESIGN_ONLY. No prototype, scenario selector or new assets were deployed. Activate a future module only after a separate implementation/visual acceptance gate; keep the lunar terrace as the default and fallback.

## Coordinates and movement

Use current world Y-up coordinates and median verified actor height H (not source model raw units). Proposed circular island radius 6H; central unobstructed action disc radius 4.8H, platform top at current floorY. Place Phrolova at (-2.3H,0,0), Hsin at (-.35H,0,0), Shorekeeper at (2.1H,0,0), Sophia at (.65H,0,.8H). These are layout hypotheses; real verified source motion envelopes decide final separations. Reserve each actor's full performance envelope plus .35H clearance, not only its idle bounding box. Do not attach invisible walls or walk obstacles inside these envelopes.

The shared Stellarealm is anchored at the combined action-envelope centre on the same floor. Compute required horizontal radius from all four envelopes, retain the G11.3 vast minimum, and verify canopy height and every moving performer in actual rendering. An unready actor contributes no fake geometry. Do not multiply hand effects/trails by the arena radius or create a separate scene/world.

## Modular implementation contract

Proposed createAstralTidalGarden({THREE,mergeGeometries,floorY,actorEnvelopes,quality,seed}) returns {group,bounds,resources,dispose,frameSky}. Configuration scenario='lunar-terrace'|'astral-tidal-garden' remains session-local behind explicit experimental flag; import failure or unsupported quality retains the terrace. Use the existing moon attachment/camera, one renderer and existing frame loop. No module-owned RAF, animation mixer or reflection pass. Contract is a design, not an exported function in this revision.

## Geometry and materials

Pale stone/jade island: merged low-poly concentric terraces, shallow grooves and matte gold inlays. Peripheral lake: one procedural MeshBasic/ShaderMaterial plane with low-amplitude analytical ripples and a baked lunar reflection streak, no mirrored render target. Open circular gates at radial distances ≥5.1H; pavilions on the outer rim, silhouettes below the lunar lower face and outside the four motion envelopes. Portal/pavilion stone, metal and jade can share three material batches. No pillars across character action lanes.

Lanterns: instanced low-poly shapes with baked/emissive cards, no dynamic point light per lantern. Lotus clusters and grasses: instanced cards peripheral to the island; shallow depth-write-tested alpha cutouts, mobile density tier. Butterflies: reuse the existing ambient/VFX systems, avoid a second swarm. Night sky: existing background/baked texture. Monumental moon remains camera-centred horizontally with elevated normalized-screen position and no foreground depth write. Ivory/deep blue/matte gold; crimson/blue/silver accents distinguish zones without hard dividing walls.

## Proposed resource budget (not measured)

Scenery-only ceiling: 18 draw calls, 45k triangles, 4 material families plus lake/vegetation specializations; ≤16 MiB decoded textures at low quality, ≤32 MiB high. Baked atlas ≤1024² mobile, 2048² optional desktop. Instancing target: 48 lanterns, 96 lotus cards, 256 grass clusters maximum; low tier halves counts. Reuse shared primitive buffers, dispose only module-owned assets. No bloom, real-time reflections, volumetric fog, shadow cascades or heavyweight postprocessing. Renderer/device budgets must include the four characters and G11.3 effects; these ceilings do not promise 30 FPS.

## Assets required

1. Authored stone/jade/gold trim atlas with licence/provenance and normal/roughness packing.
2. Modular open moon-gate and pavilion meshes with LOD and verified collision-free envelopes.
3. Lotus/grass alpha atlas, lantern emissive details, optional lake reflection mask.
4. Verified Phrolova/Sophia models, rigs, source clips, load/integrity manifests and permissible distribution status, before enabling their cameras/zones.
5. Three-viewport concept/comparison boards and authenticated render captures against the existing terrace; lighting/colour acceptance by the user.

## Gates before activation

Validate actual movement envelopes and floor contacts; static/dynamic moon, gates, widget and canopy occlusion; complete shared field render during four-actor performance; cursor zoom/pinch/pan in all quadrants; three music cycles and context restoration; disposal/retained-resource audit; frame times and thermal stability on physical Android/Samsung. Record browser, GPU, DPR, network and decoded texture cost. If budget or composition fails, lower scenery density/LOD and keep the approved terrace available. No art approval is implied by this technical design.
