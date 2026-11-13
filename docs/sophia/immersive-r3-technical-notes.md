# Sophia immersive R3 — vertical launch, orbit and audio

Status: **STRUCTURAL_PASS / CPU_TRANSFORM_RIG_CONTACT_TARGET_PASS / VISUAL_QA_PENDING / ARTISTIC_APPROVAL_PENDING / MOBILE_GPU_PENDING**. No merge, production deploy, asset regeneration or Blendstra job.

## Continuation and routes

Started from remote main `9ab27e2601d048064a8b5af53d410052019b399d`, the merge of #296 (R2), itself after #295. No separate unfinished R3 branch was found in the accessible repository. This is a continuation of those working modules, not a new character/model pipeline. One branch: `feat/sophia-immersive-r3-vertical-launch-20261113`; final draft URL/head accompany delivery.

Additional owner request applied: current route **`/modo-imersivo`**. Both historical `/experimentos/modo-imersivo` forms redirect there (301). Removed `src/pages/modo-experimental.astro`, whose title explicitly identified it as the orbital-menu prototype. Shared `ExperimentalMenu.astro`, its script and styling remain for the immersive page. Legacy model/assets are not indiscriminately deleted. Scoped noindex/GLB blob-image CSP moves with the new route; global and Shorekeeper Access policies do not change. Old docs describe historical URLs, not current routing.

## Actual public model audit

Anonymous HTTPS GET from `https://kaue.pages.dev/api/sophia/rocket` yielded **46,787,612 bytes**, SHA-256 **`e9bddcd76eae3607227b58f5d1a71ae2fedc51e2ddcaeb0900c013e710d3e674`**, matching the R2 model report. 47 clips; no Jump/Grip/Orbit/Settle source clip. Actual bones sanitize to names such as `mixamorigLeftHandMiddle1` when loaded by GLTFLoader, so the solver matches suffixes rather than assuming colon names. Running uses `Correr_R6`, falling back only to the actual `Andar_R6` when necessary; seated acting and waves derive from `Sophia_Foguete_Voo_Esquerda_Ondas_R2`. Original GLB, clip arrays, skin/bind matrices, UVs and morph definitions are not edited or duplicated into public.

Measured source fuselage axis is approximately **world −X**, with nozzle origin `[.3000000000,.23,-.1771031761]`. A quaternion from that axis to +Y gives approximately `[0,0,-.7071067812,.7071067812]`. The asset offset removes the measured nozzle origin; a common carrier applies the pad quaternion first and later slerps to identity (the existing left-flight orientation). This moves the rocket, original saddle/gold supports, original hierarchy, rider and ribbons together; no rig reparenting or changing track names. The world pad is a sibling, never a descendant of that carrier.

Logical tree:

- Scene → `LaunchPad_R3`: foundation, exhaust trench, tower, hold-down pivots, retracting umbilical, beacons, instanced steam.
- Scene → `LaunchVehicleCarrier_R3` → `OriginalAssetOffset_R3` → unchanged original glTF hierarchy.
- Carrier → `RocketAxisFrame_R3`: mathematical +Y vehicle frame and named `Grip_L/R` anchors; no rendered character clone.
- Scene → ignition light; independent camera controlled by OrbitControls/director authority.

Pad hull measurements: height **.6560000324**, radius **.1602000046** in imported scene units, not assumed metres. Procedural pad: **640 triangles / 10 mesh nodes** (including eight instances in the conservative triangle tally); material batches and one steam InstancedMesh. Umbilical length terminates at the measured hull surface; foundation stays at its initial world transform throughout flight. No heavyweight physics, volumetrics or bloom.

## Single timeline and ownership

`sampleImmersiveR3At(t)` is pure active-time sampling. Reveal 0–.9; preignition .9–1.6; ignition 1.6–2.1; digits 5–1 at 2.1/3.1/4.1/5.1/6.1; **zero and release 7.1**; grip orbit 7.1–8.7; settle 8.7–9.4; pitch to left 9.4–11.2; original flight thereafter. Zero is a marker shown for .32 s, not a sixth countdown interval. Translation and its first derivative are continuous at launch, pitch start and flight boundary. Rocket remains vertical until tower clearance; tilt never happens while clamped.

The existing one AnimationMixer owns sampled actor/effect channels in disjoint runtime copies. Walking excludes `Root_Motion`; no source root translation can fight the runtime carrier. Each seek stops/re-enables actions and restores the recorded transforms before sampling: this also invalidates PropertyMixer caching that otherwise skipped an unchanged result after a procedural pose was restored. Mixer sampling precedes the bounded CCD arm compositor; the compositor is the only subsequent writer of those arm rotations. No second mixer, timer or physics solver.

The walker is kept upright around its measured hip pivot; boot bounds calibrate initial support height. Jump is an authored continuous arc. A fixed reference based on the original saddle side establishes far-side approach and the π orbit; moving the user's camera cannot move the boarding trajectory. Original seat-local position/quaternion are recovered exactly at 9.4. From then on the common carrier and original left-flight clips preserve saddle alignment.

## Grip candidate and its limits

`createGripSolver` uses the existing hand-middle proximal bone as palm effector and ForeArm/Arm/Shoulder rotations, 18 bounded CCD iterations (per-step angle ≤.3 rad, baseline-relative limits .7 rad shoulder / 1.9 rad other joints). No bone position or length changes. Anchors lie just outside the measured cylinder and advance in four alternating handovers: one target is stationary while the other reaches. During settlement right hand releases before left. The rig and every frame reset make random-order seek reproducible rather than integrating errors.

Actual-model CPU QA samples **97 orbit instants** and finds maximum palm-bone→target error **.000014922 scene units**, against **.009612** (3% hull diameter). This proves numerical endpoint proximity in the existing rig. It **does not prove** palm mesh contact, normal orientation, natural elbow anatomy, foot bracing, suit/tail/helmet clearance or an artistically convincing grip. `PROCEDURAL_IK_CANDIDATE` remains unapproved. Partial reach and release are not falsely counted as fully planted-hand samples. No rig export was requested to hide this pending gate.

## Intro, camera, audio and lifecycle

The original black intro, Roguepunk text and circular navigation are retained. A transient aria-hidden START clone scales from its measured DOMRect, rotating +360° over 950 ms; an opaque black veil prevents cracks in hollow lettering. Reduced motion uses a 300 ms nonrotating dissolve. A single logical start gate survives key/click repetition. Modifiers, IME, editable fields, Escape and menu interactions do not start it. Asset loading may retain the veil with accessible status; a known HTTP failure remains visible rather than becoming an endless spinner. The scene clock/engine start only after the wipe and actual director are ready.

Orbit/zoom/pan work from the first revealed scene, including countdown. Control start immediately grants USER authority; stage changes and resize cannot overwrite it. User mode follows carrier translation without changing the chosen viewing angle. Auto reset interpolates for .8 s, including while choreography is paused; camera time is distinct from authored pose time and cannot change audio/countdown. The current conservative camera envelope was CPU-projected at 16:9 and 390×640; max absolute NDC bounds .5899/.7422. This is a geometric visibility check, not proof of attractive composition or projected left-flight readability.

Sound is initialized only by a real Start/unmute gesture. Seven locally served MP3 files total **102,402 bytes**; six independently cropped voice digits and one engine loop. CC0 sources, edit ranges and hashes: [audio credits](../audio/sophia-launch-r3-credits.md). Whoosh, pneumatic hiss and clamp transient are original filtered-noise synthesis. Engine/voice buses, moderate master, compressor, ~7.36 dB ducking, mute, silence-on-error and future-only cue scheduling are implemented. No external-host audio request in the public runtime. Audible mixing and MP3 decoder padding still need browser/listening QA.

One RAF owner reuses `createRenderLoop`; no animation frame polling while hidden/context-lost. Desktop cap 60, coarse pointer 30 FPS, DPR cap 1.65/1.3 and 2.4 Mpx. Reduced motion removes start spin and steam/damping while retaining the complete narrative. Pause/visibility/context loss freeze scene and AudioContext together; replay cancels old audio sources and restores poses/arms/visibility. Source bitmaps, geometry, materials, textures, skeletons, controls, listeners, loop, observer, downloads and audio are released on route exit. Stale async results are disposed before adoption; partial director initialization rolls back its resources. No microphone or new auth path.

## Validation actually performed

- `npm run check:sophia`: **40 Node tests PASS** (includes five new R3 timeline/routing cases and three AudioContext-mock behaviors; existing fixture/director/API coverage retained).
- `npm run check`: PASS (SEO, UX, APIs, music, Hsin, Sophia, performance and Shorekeeper R2 fail-closed regressions).
- `npm run build`: PASS including OG, SEO and build hygiene; old prototype and old immersive HTML paths absent from dist.
- `node scripts/qa-sophia-launch-model.mjs MODEL.glb docs/sophia/immersive-r3-model-qa.json`: real public model, 18 phase samples + 97 orbit samples, unchanged 47 clips, exact seat restoration, fixed pad, randomized seek/replay, user→auto camera, two aspect projections PASS. Textures deliberately skipped.
- Last container CPU orbit-update p50 ~1.67 ms / p95 ~2.17 ms. Not sustained browser FPS, draw calls, VRAM or Samsung performance. Full measured values: [model QA](immersive-r3-model-qa.json).

## WebGL and evidence gate

Managed preview was attempted using the supplied preview service. It launched Astro through the local CLI, which returned a background-server result, then the preview service exited/stopped. Status confirmed no running preview. No sandbox/network bypass, alternative browser driver, replacement server or public deployment was used to disguise this limitation. **No new browser screenshots or launch videos were obtained.** No SwiftShader, physical GPU, Samsung or human-artistic PASS is claimed. This differs from R2's prior Chrome WebGL-disabled report; do not count either as a rendered R3 proof.

| Gate | This delivery | Still needed |
| --- | --- | --- |
| G0 baseline | SOURCE_PASS; current main and #296 preserved | Draft remains unmerged |
| G1 intro/menu | SOURCE/BUILD_PASS | Desktop/mobile screenshots |
| G2 START wipe | MEASURED_SCALE_CONTRACT_PASS | 0/35/75/100% frames; visibly clockwise, complete disappearance |
| G3 vertical independent base | REAL_MODEL_CPU_PASS | Nozzle/support/gantry visual contact |
| G4 ignition first | TIMELINE/AUDIO_CONTRACT_PASS | Audible ignition and plume before 5 |
| G5 countdown | EXACT_BOUNDARY/MOCK_AUDIO_PASS | Video with audio on real browser |
| G6 far-side boarding | CPU_POSE_CANDIDATE | Jump/boots/tower/costume clearance |
| G7 grip orbit | CPU_PALM_TARGET_PASS | Surface contact and natural pose in two views |
| G8 settle | CPU_EXACT_MOUNT_PASS | One-hand-at-a-time release, no mesh clipping |
| G9 left flight | CPU_TRANSFORM/C1_PASS | Screen-left readability and original waves |
| G10 camera | CPU_AUTHORITY_PASS | Mouse/touch AUTO→USER→AUTO |
| G11 sound | CC0_BYTES/MOCK_SCHEDULING_PASS | Intelligibility/mix/decoder/mute/404 in browser |
| G12 public/safety | ANONYMOUS_MODEL_GET/API_REGRESSION_PASS | Preview route headers and live anonymous load |
| G13 quality | CHECK/BUILD_PASS | Actual WebGL, 3 reloads, context recovery, Samsung sustained session |

## Reproducible external inspection and rollback

1. Check out the exact delivered PR head and run the commands above; acquire the same public GLB, verify its SHA, keep it outside Git. The CPU script needs no R2 credentials.
2. Use an authorized preview that serves this draft and the existing public Sophia API. Anonymous HEAD must be `model/gltf-binary`; no Access login should be introduced. A 404/503 is a load gate to fix, not permission to weaken Shorekeeper auth. No production publication is authorized by this PR.
3. Open `/modo-imersivo` in desktop and 390×640. Record the untouched intro, menu click and the whole Start/launch with system audio. Verify mute before Start, key repeats, slow loading and failed SFX.
4. For static phase capture, append `?launchQA=1`. After the model loads, `window.__SOPHIA_LAUNCH_QA__.seek(t)` pauses at an exact time; `snapshot()` exports safe metrics; `resume()` continues. This opt-in exposes only pose sampling/metrics of the public Sophia, no private URLs or assets. Capture 0,1.6,2.1,5.1,6.1,7.1,7.6,8.1,8.7,9.4,11.2 and front/side viewpoints. Inspect the START separately through normal input; seek deliberately bypasses its transition.
5. Repeat twice/replay, hide/resume, lose/restore context, drag/zoom during countdown and reset while paused. Record renderer.info, audio alignment and 600 s Samsung Internet session. Inspect actual palms, elbows, feet and tail against hull/gantry; CPU endpoint error alone is insufficient. Confirm no white flash, residual giant text or spectator-camera snap.
6. No Blendstra was needed for the low-cost procedural pad. If genuine visual proof shows unacceptable rig deformation, retain this candidate and request editable animation source for the authorized additive Grip/Orbit/Settle pass. Do not regenerate the astronaut or claim that absent source clips exist.

Rollback is the revert of this feature commit on its branch: no R2 write, model replacement, migration, auth change or irreversible publication. main and the original GLB remain untouched. The legacy page removal and URL move are deliberate owner instructions, not incidental cleanup.
