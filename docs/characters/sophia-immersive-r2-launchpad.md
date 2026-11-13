# Sophia immersive R2 — launch cradle and boarding

Status: **STRUCTURAL_PASS / CPU_GEOMETRY_AND_RIG_PASS / VISUAL_QA_PENDING /
ARTISTIC_ACCEPTANCE_PENDING**.

Base: `5d3232142ee4adc217fc1acfa8dc239ce740766e`, the merge of PR #295.
Branch: `feat/sophia-immersive-launchpad-r2-20261113`.
PR #295 was already merged when implementation began; it cannot be updated as
an open draft. This revision therefore uses one new feature PR, without merge
or production publication. The final PR and exact head are reported with delivery.

## Result

The original black intro, Roguepunk start text, and `ExperimentalMenu` remain.
After Start, the first scene shows only the horizontal rocket on a separate
procedural `LaunchCradle_R1`. Ignition begins at 1.10 s and the countdown shows
5, 4, 3, 2, 1, 0 at exactly one-second intervals of active scene time.

The astronaut enters from the left at 2.10 s using the existing `Andar_R6`.
The approach turns around the actual hip centre, rather than the off-centre
mesh origin. Anticipation, a small knee brace, and an absolute curved jump
lead into the existing seated flight pose. **Safe boarding variant:** docking
finishes at 5.80 s, 0.30 s before release at 6.10 s. Overlapping boarding with
an already moving rocket was deliberately not claimed without visual evidence.

Clamps and the umbilical arm release while the carrier starts moving slowly.
The carrier then accelerates toward world −X. Ribbons become visible only
after movement starts, and the existing master flight animation takes over
continuously at 8.20 s. The carrier keeps moving, with a continuous position
and first derivative; it does not stop abruptly at the loop boundary.

The camera widens for approach/jump, follows departure, and enables orbit and
zoom after takeoff. User orbit takes precedence over automatic composition.
Pause, replay, visibility suspension, reduced-motion and WebGL context-loss
handling use one monotonic active clock. Reduced motion retains the five-second
countdown and narrative, with a smaller arc and no pulsing/smoke/brace.

## Structure and preservation

- Pure functions: `sophia-launch-timeline.mjs` contains state, boarding pose,
  rocket pose, and the active clock; results do not depend on frame history.
- `sophia-launch-cradle.ts` derives support positions/radii from actual fuselage
  geometry and its world matrix. The base is a scene sibling of the flight
  carrier, never its child. Two lower semicircular supports, four opening arms,
  mast, umbilical, restrained lamps, contact pool and eight small smoke sprites
  form the platform. Static geometry is merged per material.
- `sophia-launch-director.ts` uses one AnimationMixer. Runtime copies of tracks
  separate rider and effect ownership. Walking excludes Root_Motion tracks to
  prevent the locomotion clip from translating its own carrier. Original GLB
  clips and Root_Motion definitions are not rewritten.
- Docking restores the exact original mount transform. No second Sophia,
  replacement rig, new GLB, external asset, physics package or Blendstra job.
- Same public HEAD + one GET through `/api/sophia/rocket`; no login or upload
  flow. The API, Cloudflare configuration, secrets, Hsin, Shorekeeper, and
  `/modo-experimental/` are untouched.
- Unknown model hierarchies retain an explicit original-flight fallback.
  It is reported as a fallback, not as a successful launch choreography.

## Validation performed

`npm run check:sophia`, `npm run check`, and `npm run build` passed locally.
The Sophia suite includes 12 behavioral tests covering exact countdown
boundaries, clock pause reasons, docking, seek/replay, initial visibility,
carrier continuity, fixed-base hierarchy, clamp reset, real Three.js property
bindings with synthetic fixtures, and unchanged original animation clips.

CPU QA also parsed the actual delivered astronaut/rocket reference with
GLTFLoader and applied the director at 11 times between 0 and 9 s:

- 46,787,612 bytes; SHA-256
  `e9bddcd76eae3607227b58f5d1a71ae2fedc51e2ddcaeb0900c013e710d3e674`.
- 47 source clips retained, 275 rider tracks and 272 walking tracks resolved.
- Rider hidden at reveal; no visible ribbons before movement; mount error
  below 1e-6 world units after docking; base world position unchanged.
- Random-order seeking reproduces exact world transforms.
- CPU base: 1,380 triangles / 15 meshes before the optional eight DOM smoke
  sprites. This is a geometry count, not a measured GPU draw-call benchmark.
- The two support sections use measured hull radii of approximately 0.16012 m
  and 0.13797 m. Their inner cradle radii match those sections analytically.

Reproduce CPU geometry/rig QA with:

```sh
node scripts/qa-sophia-launch-model.mjs /path/to/Sophia_Astronauta_no_Foguete_R1.glb report.json
```

The script intentionally skips texture decoding and has no WebGL context.
It cannot approve textures, silhouettes, collisions or artistic quality.
The reference JSON results are stored beside this report.

## Visual QA limitation

The managed preview loaded the intro and original orbital menu. The available
Chrome browser failed to create a WebGL context, reporting `GL_VENDOR = Disabled`,
`GL_RENDERER = Disabled` and `BindToCurrentSequence failed`. No 3D launch frame
could be observed. **Do not label this revision VISUAL_PASS.**

A temporary local-only Astro endpoint was prepared to serve the exact reference
GLB for QA; it was removed before build and is not part of this PR. Since WebGL
initialization failed first, it did not establish production R2/browser success.
The production route remains unchanged and its API regression tests pass.

Pending on a real WebGL browser: capture t=0, 1.10, 4.10, 5.10, 5.45, 5.80,
6.10, 6.40, 8.20 from front/oblique cameras and a portrait Android viewport.
Check actual boot-ground contact, suit/joint clipping, support and clamp
clearance, jump silhouette, camera framing, trail onset, orbit hand-off,
context recovery, and real 404/503 states. Physical Android performance and
artistic acceptance remain pending. Do not add heavy assets before this review.
