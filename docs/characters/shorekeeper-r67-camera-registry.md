# R6.7 — CameraDirectorRegistry

Base: #260 at 103442eef4d699dfe593efb80880998cc2c316a7. Separate stacked draft; G7 remains NO_GO. Status: IMPLEMENTED / AUTHENTICATED_VISUAL_QA_PENDING.

## Preflight

The exact head matched. Before editing, all four PR workflows succeeded: Portfolio build (42404397374), Hsin acting and V2 stage regressions (42404397393), Shorekeeper synthetic and inspection lab (42404397402), Shorekeeper R3 structural gates (42404397409). Baseline local build also passed. R6.5 stable VFX lease, seven source schedule, shared arena, original body clips and ownership fixes are retained. R6.6 restored Shorekeeper-only smart:true profile; no two-subject frameTransform is added to it.

## A — Cameras

`camera-director-registry.mjs` registers logical directors with ID, readiness, geometry/root, anchors, constraints, priority, pose supplier, active presentation and disposal. Auto selects active Shorekeeper cinematography, otherwise Hsin. Explicit Hsin/SK/Free wins over automatic selection. Phrolova/Sophia are false-readiness contracts until verified rigs/models/animations exist. Priority describes the contract; automatic policy currently specifically prioritizes G11.3, not an unvalidated generic future contest between performances.

The original G11.3 stage's restoreCamera now submits the authored pose to the registry rather than writing the actual camera. Only the registry applies a selected automatic/follow pose in draw(), after body updates. Free mode leaves OrbitControls in charge; automatic/follow modes skip its update to avoid competing writes. Same renderer, camera, RAF, loading clock and scene. Standalone Shorekeeper lab and Hsin solo bypass the registry.

The 0.6-second smoothstep handover starts at the current rendered position/target/FOV, is cancelled on selection or manual gesture, and converges to the selected director's live pose. After handover, the original Shorekeeper azimuth/lens/close-up/rhythm is applied without fitting Hsin. Quaternion orientation is derived by lookAt(target); no independent roll is introduced. The follow supplier smooths bone-anchor displacement exponentially and keeps the user's current camera offset. It performs no per-frame skinned surface scan.

Existing canvas-scoped wheel/pointer capture revokes only camera ownership; it never interrupts body/VFX. Manual gestures now select Free even from a non-cinematic follow. OrbitControls zoomToCursor/enablePan are retained, two-touch DOLLY_PAN is explicit, and duet yaw limits are removed. Provider controls outside the canvas are unaffected. Pinch behavior and cursor-centred dolly remain device/browser acceptance items, not assertions from Node tests.

Optional tap selection uses a small (32 CSS-pixel) projected anchor hotspot, not a claim of exact surface picking. It rejects drags over 5px, non-primary/multiple pointers, off-frustum anchors and ambiguous hits within 16px. The camera dropdown is the authoritative selection mechanism. No triangle raycast of a dense model is performed.

Diagnostics with ?r6Guest=1&hsin-metrics: window.__hsinMetrics.report().cameras and .duetCinematic. Phrolova/Sophia availability is not faked. Disposing the attempt clears the registry through its AbortSignal.

## B — Garden

See `astral-tidal-garden-design.md`. This delivery intentionally uses the requested technical-design fallback. No unreviewed scenery prototype is enabled and the approved terrace remains the only active scene. Scenario configuration and assets are proposed, not shipped functionality.

## Validation and limits

112/112 focused R6/combo tests passed, including three new registry behavior tests: explicit priority/readiness/free/disposal, cancellable position/target/FOV interpolation with one write per step, and mode switches at all seven G11.3 segments over three synthetic cycles without body termination. Existing R6.5/R6.6 suites passed. npm run check and production build passed; 8 routes, OG and hygiene checks passed. These are synthetic/code validations, not GPU FPS or private-source visual evidence.

Authenticated visual QA is pending: previous Work browser reached Cloudflare Access sign-in and no credential/session was provided. No private bytes or Access/R2 configurations are changed. Physical Android/Samsung pinch/pan, 1280×720/390×844/832×384 composition, player occlusion, real concurrent performers, context restoration and GPU performance are NOT_RUN. No 30 FPS claim is made.

## Acceptance checklist

- [x] Exact base, four successful workflows and baseline build.
- [x] Single camera arbitration; user choices outrank auto; disabled future actors.
- [x] Original G11.3 smart camera supplied unchanged after handover.
- [x] Synthetic seven-segment, three-cycle camera-switch regression.
- [ ] Authenticate current preview and record all three viewports, including widget occlusion.
- [ ] During each Basic/Heavy/Skill/Burst/recovery: Auto→Hsin→Free→SK→Auto. Confirm no body/VFX restart; examine transitional orientation/FOV and original SK close-ups.
- [ ] Wheel at four quadrants; Android pinch/pan on each quadrant. Confirm provider controls receive their own touches and manual mode remains Free.
- [ ] Test primary tap hotspots, ambiguous overlap rejection and drag/pinch rejection.
- [ ] PLAYING/PAUSED/BUFFERING/ENDED/resume, three actual cycles, moving Hsin during combat.
- [ ] Actual WebGL loss/restore and disposal; one renderer/loop and no growing retained registries/listeners.
- [ ] Solo Hsin and SK laboratory perceptual regression.
- [ ] Measure FPS/frame-time distribution/CPU/GPU on identified mobile hardware; 30 FPS is a target only.

No merge, main update, GLB publication or G7 reopening.

## Concurrent base reconciliation

While publishing, #260 advanced to a89c87cdadb2daf7a789ed0dd397d82bc0c217c9 (5–8s interludes, arena/terrace and moon refinements). That commit is merged into this draft, preserving its runtime changes. Two older quiet-only source-text assertions were aligned with the new expressly permitted interlude facial condition. No body/VFX schedule or idle repertoire was replaced. Repeated merged validation is recorded below.
