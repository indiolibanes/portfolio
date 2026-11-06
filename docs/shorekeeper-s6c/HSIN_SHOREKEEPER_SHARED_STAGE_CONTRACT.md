# Hsin × Shorekeeper — one-stage contract (S6-C)
Status: ARCHITECTURE_READY / IMPLEMENTATION_BLOCKED_BY_PRIVATE_ASSETS_AND_QA.
Goal: TWO performers in ONE WebGL scene, ONE renderer/RAF/camera, per-character animation owners.
Existing Hsin player `src/scripts/hsin-stage.ts` owns lunar environment, renderer, adaptive mobile budget, independent facial/dance drivers, disposal and music. S5 Shorekeeper lab owns its own renderer and camera: mounting the full lab alongside Hsin would create two canvases, NOT a shared stage. Do not claim such a solution is complete.
Integration after canonical Shorekeeper R2 assets are authenticated:
- Introduce a separate **private preview** route and explicit GuestAdapter to Hsin stage. Reuse Hsin scene without mutating public Hsin's default route.
- Guest is loaded ONLY using Access-protected same-origin R2 manifest and SHA-256 validated bytes; no public GLB URL or embedding into dist, Cache-Control private no-store.
- Guest has its own body mixer; its owner is exclusive for Shorekeeper only, and never alters Hsin's bones, textures or choreography. Hsin maintains its existing animation director. Distinct facial owners and a shared presentation clock/RAF; avoid nested createStage() or dual WebGL contexts.
- Spatial calibration: floor plane, scale, root transform, stable facing, distance between bodies, skinned bounding boxes; Hsin position as baseline. Camera frames BOTH performers, no back-view; 16:9 and portrait.
- G11.3 single-owner VFX cannot inherit Hsin's renderer unsafely; add a scoped stage adapter, draw-call/memory budget, dispose on Access/logout/context loss.
- Test transitions: all 7 S5 clip sequence, 3 original idles, selected facial families, Hsin autonomous acting, 30/60 Hz deterministic scrubbing, pause/reduced-motion, 10-minute desktop GPU and physical Samsung.
Do not route private model to production or merge any experimental GLB. The shared DUO must be observed on real source and approved before publication. CURRENT S6-C DOES NOT mount two real performers yet.
