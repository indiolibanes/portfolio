# Shorekeeper F2.0-B.3 — Presentation cleanup and facial feasibility gate

**Base:** PR #202 `38a55c54226355ac70cac37c34c209f1261373b4`, stacked on #201/#200/#199. **No merge into main.**

## Requested presentation changes

- Remove the CSS butterfly layer entirely: it was visually inadequate, and the supplied cinematic GIF requires a rigged, filmed/effected 3D butterfly. No claim of equivalent game VFX.
- Remove obsolete butterfly state/controls from JS and diagnostic output.
- Keep visible presentation focused on original animations, expression cards and play/pause. Rig, material, polygon/wireframe, inspector, configurable timing and quality controls stay in hidden DOM only as compatibility hooks until the runtime is safely decoupled in a separate refactor.
- User-facing original animation selection, expressive toggle, contemplative scheduler, cinematic camera, and expression intensity remain.
- Select 60 FPS by default, DPR cap 2, high-performance WebGL context preference and 3,000,000 render-pixel ceiling. These are **targets**; GPU refresh, context availability, pixel budget and real frame time may yield less. Do not claim 60 FPS measured without actual browser/GPU session.
- Facial controller and all three approved original idle clips are unchanged. No private GLB/GIF/PSA committed.

## Critical observation from F2.0-B.2

The previous CPU test verified existence of 19 morph names and finite weights across 33 combinations, but did **not** establish that the morph geometries produce cutscene-like facial motion. This is not evidence of facial artistic equivalence. The exported rig, game cutscene rig and cutscene materials may have different expressive systems; this has not been proven one way or another.

The new GIF provided by the user depicts an eyes-closed shot with hand at chest, a blue butterfly transition, then a close-up with opening eyes. Its overall effect involves composition, camera, lighting, visual effects and character animation. The existing F2.0-B.2 morph-only controller cannot recreate all of that.

## Mandatory next gate: isolated facial deformation

1. Load the **user-provided private GLB locally**; inventory `Face`, `Eye`, `Down`, `Alpha` morph dictionary indices and primitive/material association, including duplicates under shared names. Do not infer from names.
2. For every candidate morph, measure actual vertex delta magnitudes, percent non-zero deltas and local-space bounding boxes. Differentiate zero/near-zero, affected mesh and high-impact regions. Include material visibility, alpha/transparency, and draw-order diagnostics.
3. In browser with a real WebGL2 context, capture paired **0 vs 1 weight** and 0/.25/.5/.75/1 close-ups under fixed frontal/three-quarter face camera and fixed light. Programmatic CPU calculations alone do not satisfy visual QA.
4. Compare facial silhouettes, mouth corners, upper/lower lids, pupils and eyebrow shifts with reference frames, with *clear limits*; if needed create a side-by-side comparison contact sheet for private QA only. Preserve user-provided GIFs as private references.
5. Confirm whether video/cutscene expressions use morph targets actually present in the private GLB; do not claim the whole cutscene can be reconstructed without proof.
6. Only then curate 1–2 facial expressions using verified effective morphs. If the required motions cannot be reproduced by existing targets, report `FACIAL_ASSET_LIMITATION` and propose a separate, consensual local-only Blender corrective-shape workflow, preserving approved rest geometry, or an additive compatible facial rig after testing. Never silently rebuild the model.
7. Preserve all source clips exactly and keep `Reference QA` as an isolated baseline. No decorative UI or new battle animations in this gate.

## Visual QA still pending

CI and builds are numerical/structural checks, not artistic sign-off. Test on Samsung Internet and a desktop WebGL2 browser. Maintain privacy of original game assets and credit KURO GAMES, the Wuthering Waves developers, and the source extraction community. No auto-merge.
