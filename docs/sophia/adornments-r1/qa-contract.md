# Sophia Adornments R1 — QA contract and stop/go matrix

## Gates

| Gate | Required evidence | Verdict |
|---|---|---|
| A. Source provenance | SHA256 per GLB, exact node/mesh path, scene transform, UV/material count, source screenshot | `SOURCE_VERIFIED` / `UNAVAILABLE` |
| B. Canonical 2D identity | Same silver hair, gold eyes, forehead star below fringe, fox ears, lab coat silhouette, adornment colors | `IDENTITY_MATCHED` / `ARTISTIC_PENDING` |
| C. Attachment | Socket position/orientation, hand-to-notebook and pen-to-page measured in correct bone coordinates | `CONTACT_PASS` / `FAIL` |
| D. Garment deformation | Shoulder, elbow, cuff, lapel, hem, tail clearance at representative clips; no visual implosion | `SKIN_PASS` / `FAIL` |
| E. Motion authenticity | Original five 6H clips or their documented equivalents; no imaginary 7B clips; astronaut 47 untouched | `MOTION_SOURCE_LOCK` |
| F. Runtime | 2D fallback retained, 404 Tetris functional, lazy GLB, no second RAF/mixer, no new auth | `RUNTIME_PASS` |
| G. Mobile | Samsung Internet real GPU with 16:9/9:16, offscreen pause, context restoration, disposal | `MOBILE_PENDING/PASS` |
| H. Owner approval | 3s loops and 4 orthographic model images; screenshot evidence | `ARTISTIC_PENDING/APPROVED` |

## Minimum comparative cases
- Idle front, ¾, side and back with coat closed/open.
- Write: notebook cover front; pen tip close to page; wrist twist; cuff clearance.
- Wave: shoulder and right sleeve clearance against head/ears.
- Walk: coat hem, leg and tail clearance.
- Blend Smile/Blink/BrowRaise/MouthOpen only on a mesh actually carrying those morphs; no assumptions that 7B supports them.
- /404: gaming sofa and portrait 2D fallback, no black GLB overlays or duplicate GPU downloads.
- Repeated 10× open/close/replay to check draw calls, objects/textures/geometries, listeners and GPU memory.

## Explicit red lines
- Work/Claude must never rewrite the astronaut's 47 source clips, modify `/api/sophia/rocket`, or commit a >40 MB duplicate GLB for accessories.
- No claim of high-fidelity coat before showing arm deformation. Rigid parenting of an entire coat to pelvis is unacceptable.
- Do not describe geometry inferred from screenshots as source-proven. Do not confuse node path existence with usable topology.
- If both archive and model files are inaccessible, return `BLOCKED_SOURCE` rather than a speculative 3D reconstruction.
- Do not merge before visual user acceptance; preserve all 2D and currently public behavior.
