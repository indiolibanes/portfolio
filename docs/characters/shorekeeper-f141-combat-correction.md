# Shorekeeper F1.4.1 — initial correction (historical)

> Historical record of initial HEAD `e83435abdf0d1dafaffb73077f985f67e522e02f`, artistically rejected. Current code/correction: [Revision B](shorekeeper-f141-revision-b.md).

**VISUAL_CANDIDATE / VISUAL_QA_BLOCKED.** This is an engineering draft, not artistic completion. CANONICAL_PENDING; G7_NO_GO. Owner review must precede the requested final Astra audit. No new body ability, canonical clip mapping, model, skin, morph or source curve was produced.

## F1.4 inspected before editing

PRs #282–#286 were open drafts, unmerged at preflight. #286 HEAD matched `8410c9e58c38b5edaa01dc540a01fd7e3f35e169`; its base was #285, `936bf64ff1728c000a257eaf14ff6215a016dbd5`. F1.4's implementation report and actual modules were read. Its three workflows had succeeded. In this environment, all **354 baseline tests passed**, including the three sharp-dependent tests previously reported as blocked.

F1.4 implemented head-facing trigger masking (`0.05h`), conditional lateral clearance (`0.30h`), reversible STUDY_COLOR and extended STUDY_PRESENTATION. These remain intact. F1.4 did **not** replace `blueHeavySingularity`: it is still a PlaneGeometry with a radial fragment shader, using camera-facing BILLBOARD_VS. Its apparent shading is not geometric volume. The existing Skill computes a fan in the body frame and shows a reticle; endpoints are not an independently editable spatial entity. Its WING_VS computes a velocity basis but then chooses camera-right/up vectors for the actual wings. F1.4's third Liberation shot is a low viewpoint privileging the dome.

The canonical GLB (39,487,548 bytes, SHA-256 `4f03b6fdf859ece1eaa9b334ff7eeb9a1979c678ba7a8a0b90a5e5aea3e7bc30`) and the three animation libraries were located locally and full hashes verified. The private F1.4 videos A/B/C and original screenshots were not recovered from the available evidence search; the report's visual measurements are attributed to Sonnet, not remeasured here. New visual details/placement remain candidates; no invented game timecodes.

## Opt-in and isolation

In `/experimentos/sk/?r61=1&r62=s5`, open the study controls and explicitly enable **F1.4.1**. This adds `combatStudy:{id:'F141'}` to FIDELIDADE only. It applies to either the short cycle or the existing study duration. Uncheck and start a new cycle to restore the unchanged F3/F1.4 presentation. Legacy rejects the new option at the integration boundary. No shared-stage/duet caller enables it; no public target was added.

Only four existing production files change: laboratory Astro/UI, laboratory controller, VFX adapter and R62 integration. New layers are constructed only when selected and share the existing renderer, scene, body owner, presentation time and camera owner. `combat-vfx-liberation.mjs`, `combat-vfx-shaders.mjs`, `combat-vfx-skill.mjs`, `fidelity-camera.mjs`, `study-color.mjs`, `study-presentation.mjs`, `r61-plan.mjs` and original animation/face files remain unmodified.

## Heavy — geometry rather than a brighter quad

`heavy-volumetric.mjs` replaces the singularity quad only in F1.4.1. It uses a dark 24×16 sphere, a shared-geometry Fresnel shell, three toroids in distinct planes merged into one mesh, and 32 converging line segments in a fixed buffer. Angular motion is an absolute-time function; reduced motion disables that motion. Depth testing is retained; the opaque core writes depth, while translucent layers do not.

Four draws replace the old singularity's one draw when active (structural increment +3, not measured GPU calls). The sphere/shell and tilted rings have genuine XYZ extent independent of camera orientation. No raymarching, bloom, gravity simulation or extra renderer. Actual four-angle/180° rendered acceptance is **NOT_RUN**.

Placement is a **world-fixed study candidate**, derived from the source chest history at Heavy preparation and the initial anatomical forward. It no longer moves with viewport aspect. This is a deliberate reproducible study choice, **not** a verified reconstruction of the reference's anchor/motion. No five-stack Empirical Data counter or Illation certification exists; the explicit F1.4.1 opt-in is the simulated trigger, labelled HEAVY_VOLUMETRIC_STUDY.

## Skill — real target and shared trajectory geometry

`qa-target.mjs` defines a spherical QA_TARGET with position/radius, selection, enabled state and a bounded timestamped edit history. The laboratory exposes front/left/right, slow movement, out-of-range and removal. There is no HP, damage or combat engine. Edits are chronological; editing before an existing event after a reverse seek requires restarting rather than silently rewriting history.

Exactly five flights start from the **existing body-anchor history**, at staggered times inside the existing authored Skill event. Each owns a cubic path to a distinct point on the target sphere's near hemisphere. Slow target motion is analytic and predictable. An edit splices the remaining path at the old position and velocity (C1 continuity). If the required control-edge velocities would exceed 4 model heights/s, or the target is removed/out of range, the existing flight dissipates at its last world position over 0.25 s. It does not reacquire in mid-flight after cancellation. No teleport or instant homing is used.

`skill-targeted.mjs` batches ten actual velocity-oriented wings in one instanced draw. It reuses the original wing atlas without taking disposal ownership. Five ribbons occupy one indexed dynamic buffer; their centerline samples are taken from the **same flight at earlier timestamps**, not a line from actor to target. Contact creates a brief local instanced wire-sphere pulse. No valid target means no substitute flight/hit. The existing Skill layer keeps its healing-only presentation; its decorative fan/reticle are suppressed only in the new profile.

Flight timing, beam shape, wing orientation details and impact geometry are explicitly authored presentation candidates. The count of five is preserved; no exact audiovisual correspondence is claimed. This first candidate uses local pulses, not an asserted canonical star-fragment reconstruction. Ribbon width is a fixed world-space offset; readability at edge-on views still needs visual QA.

## Liberation — third shot only

`combat-study-camera.mjs` is a frame transform after the existing F2/F1.4 camera. Shots 1/2, their cut boundaries and the small butterfly/occlusion correction are untouched. Only shot 3 within Burst02 becomes an approximately 35° elevated oblique view, 30° off anatomical front. It targets the upper torso and uses a conservative sphere fit around head/hands/pelvis, with FOV 34° landscape / 38° portrait. Source clip duration is unchanged. The old study-observation shots after the Burst and camera return/manual ownership remain unchanged.

With the real source rig, 13 instants per aspect (16:9 and 9:16) kept the tested anchors inside NDC. Maximum absolute coordinate: 0.469 / 0.527; camera clearance above Head: at least 0.663h / 1.148h; pitch 35°. These are anchor projection checks, **not** hair/face/silhouette or cinematic approval. The camera change is requested composition, not original-game CAMERA_MATCHED.

## Executed validation and costs

- Baseline: 354/354 tests. Candidate: **363/363 tests**, including nine risk-focused additions; `npm run check`, production build and diff hygiene PASS. Existing golden tests for Legacy, F3 trigger animation, F1 Root and F1.4 studies remain enabled.
- Full canonical file/library SHA checks and real skinned-node CPU comparison: local/world Root, Pelvis, Head and both hands agree with baseline at all 13 sampled times; maximum numerical difference **0**. Original clip arrays unchanged.
- Ten real-source create/seek/pause/interrupt/dispose cycles: body lease released every time; post-disposal CPU graph/resource inventories stable. This does not establish WebGL/GPU-memory stability.
- Real-source short duration: **28.868666126 s**, identical to F1.4. The loaded default extended plan computes **75 s**; hold **26.473532778–46.473532778 s**, plus existing fade 0.8 s. F1.4's older report quotes 74.97 s; these values describe the plan computed from the current verified files, not a newly recorded video.
- A single sequential Node run (not a benchmark) observed constructor 525.6 / 458.7 ms and mean sampled seek CPU 2.891 / 2.030 ms (F1.4 / F1.4.1). Order/JIT/GC affect these numbers; **no speedup or FPS improvement is claimed**.
- Active CPU graph inventory: 42→48 unique geometries; 35→43 material objects; 2→2 texture objects in the CPU parser that deliberately skips original images/materials. Increment is +6 geometries / +8 materials / no atlas duplication. These are not renderer.info counters or VRAM figures.
- Score-visible draw estimates at the sampled instants were 6→8; real draw calls/triangles, shader compile, browser CPU/GPU timing, textures/VRAM, rendered ten-cycle leaks and Samsung FPS remain **NOT_RUN**. The JSON includes Node memory snapshots, not GPU/mobile measurements.

## Audiovisual blocker — four required videos missing

The model is available; **private-origin rendering is blocked**. Sky input failed with an unavailable accessibility provider. The bound native window API allowed navigation, but both native and cloud browsers refused the private localhost server. A native file-page test was blocked by the organization's browser policy. No security warning or policy was bypassed, no browser protection disabled and no private origin/model was exposed publicly.

Videos A Heavy 3D, B Skill, C Liberation and D complete study were **not produced**. No synthetic shader screenshot, source-reference montage or CPU diagram is offered as a substitute. The three visually observable differences therefore remain unaccepted: **VISUAL_QA_BLOCKED**, not technical/artistic completion. Physical GPU and Samsung Internet are NOT_RUN. The final Astra audit should wait for the owner's visual judgment as requested.

## Reproduction and pending owner review

Run ordinary tests, check and build. For the private CPU audit, use authorized original files and a detached F1.4 worktree:

```sh
node scripts/shorekeeper/qa-f141-private-cpu.mjs \
  "$PRIVATE_MODEL" "$PRIVATE_LIB_DIRECTORY" \
  "$PRIVATE_OUTPUT/real-source-cpu.json" "$F14_WORKTREE"
```

The script pins the base SHA and all four file hashes, rejects output in either repository or through a symlink, and does not write GLBs. Library filenames are `basic.glb`, `advanced.glb`, `burst.glb`. It strips material/image references in its disposable in-memory CPU parse; it neither tests appearance nor changes originals.

In an environment with a working private origin, run the actual laboratory, load the verified model/libraries with its local file controls, select F1.4.1 and record privately:

1. **A:** F1.4 versus F1.4.1 same Heavy times, fixed 0°/45°/90°/135° views, then 180° inspection orbit. Reject a disk/portal/cylinder appearance, wrong depth or ungrounded placement.
2. **B:** before/after Skill, five distinguishable flights, target volume visible, ribbons tracking flight, local contact/dissipation. Repeat left/right/slow motion/out of range/removal. Check that grazing/edge-on wings and ribbon widths read well.
3. **C:** identical F2 hand close-up through both cuts; compare the elevated third shot and return in 1280×720 and 390×844. Check hair/hands/face/trigger/field, not just bone anchors.
4. **D:** default 75 s study, source clips at 1×, explicit color selections and 20 s hold; no implied canonical duration/stage promotion. Record pause/resume/interruption, context loss/restore and manual camera recovery separately.
5. Encode private recordings as H.264 MP4/yuv420p, without audio. Measure renderer.info, frame CPU/GPU when available, memory and ten rendered cycles. Test physical Samsung Internet before any 60 FPS assertion. Keep videos/GLBs outside Git/workflow artifacts.

Do not merge this draft on the basis of Node results. Unbound Form, Discernment, new Basics, F1.4.2/F1.5, shared stage, security and canonical private assets remain outside this change.
