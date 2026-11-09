# Shorekeeper F1.4.1 — Revision B correction note

**Same draft PR #287; previous HEAD `e83435abdf0d1dafaffb73077f985f67e522e02f`; base #286 unchanged.** Initial F1.4.1 was artistically rejected. This revision is an implementation candidate, **not artistic completion**: VISUAL_QA_BLOCKED / CANONICAL_PENDING / G7_NO_GO. No component receives artistic PASS from Node results.

## Reference availability

The three named attachments were absent from the current workspace and the exact-name Library search. No image bytes, dimensions or hashes were inspected. Their descriptions in the owner's request are used as composition requirements only:

| Requested image | Available evidence | Direction used |
|---|---|---|
| 201990.jpg | SOURCE_UNAVAILABLE; USER_DESCRIPTION_ONLY | Energy sphere, dark center, cyan/magenta rings around a predominantly vertical axis |
| 201988.jpg | SOURCE_UNAVAILABLE; USER_DESCRIPTION_ONLY | Directed butterflies and continuous energy paths/impact; no visible QA marker |
| 201976.jpg | SOURCE_UNAVAILABLE; USER_DESCRIPTION_ONLY | Close face/hands and small cyan-blue butterfly |

No continuous game video was recovered for this revision. There are no new game timecodes or PSA→ability certifications. The older cut positions and source-role candidates remain attributed to the existing F2/F3 evidence, not certified by these unavailable stills.

## 1. Heavy: horizontal orientation and energy-sphere identity

The prior code created TorusGeometry in its native **XY plane** and applied large tilts, then animated parent rotation on **X, Y and Z**. The rings could therefore remain upright or tumble into a portal-like composition. A dark near-black sphere and strongly noncoplanar toroids reinforced the rejected gravitational reading.

`heavy-volumetric.mjs` is retained. Each torus is now rotated **π/2 around X before its fixed tilt**, placing its main plane in world XZ. The three fixed tilts are 0°, approximately 4.3°, and approximately 6.7°; their parent rotates **only around Y**. Plane-normal vertical components stay above 0.99 during the tested animation times. No camera-dependent ring orientation is used. The sphere and Fresnel shell remain real 24×16 geometry, so the horizontal ring arrangement does not flatten the sphere.

Ring radii changed from 1.32/1.57/1.78 to **1.28/1.46/1.62 sphere radii**, with the same tube complexity and merged draw. Cyan/magenta bands receive deterministic angular intensity variation, so Y rotation reads as orbiting energy rather than stationary uniformly colored circles. The procedural core retains a dark center but gains blue plasma gradation at its edge; no gravity simulation is introduced. World anchoring and body curves are unchanged. Sphere size was not increased to compensate for readability.

Structural tests establish horizontal orientation and XYZ volume; they do **not** approve the four requested rendered viewpoints or visual parallax.

## 2. Skill: invisible logical target, distinct beams and contact stars

`qa-target.mjs` is **byte-identical** to the previous HEAD (SHA-256 `0c82507a42d1e13d3813453d702b9c3f3df494ab2ecea53de924cdb219f1dc8d`). Its entity/history, target-sphere contacts, motion, selection, retargeting and cancellation remain intact.

The renderer now starts with both its root and target mesh hidden. In presentation, `showTarget` is false. **Mostrar alvo de QA (diagnóstico)** is an unchecked laboratory-only control; `setTargetVisible()` changes only mesh visibility. Tests compare all five flights, target history, revision, timing and positions with the control on/off: identical. A removed target cannot be made visible by the diagnostic checkbox.

The same five flight curves still drive the wings and ribbons. Beam history increased from about **0.414 s to 0.68 s**, sampled across the same 24 cross-sections. Width now responds to actual sampled velocity and dissipating alpha; the fragment profile has a bright core and a smooth edge fade. These are trajectory samples, not arbitrary actor→target lines. No additional beam draw, random particle cloud, dynamic light or clock was added.

The previous cyan **wire-icosahedron impact** could also read as debug geometry. It is replaced by short local star fragments: two intersecting star plates in one shared geometry, six deterministic fragments per contact, batched in one existing instanced draw. Their origin is the actual planned surface contact. Their displacement, color and scale decay are functions of the existing impact age (0.3 s), with no independent simulation. The orange target remains available only in diagnostics. Five butterflies and target pursuit logic are not replaced by a fixed coordinate.

These beam/fragment choices are presentation reconstruction from the owner's description, not SKILL_BEAM_FIDELITY certification without the image/video.

## 3. Liberation: fixed small butterfly → one energy release → field

The prior trigger expression was `0.31*h*(1+3.2*exp3)` in FID, reaching a quad size of **1.302h**, 4.2 times its starting size. Separately, the old hand-over core grew with `0.6+7.5*exp3`, while the F3 rupture was already active. This mixed wing growth and a second expanding bloom with the intended energy release.

Only the explicitly selected F1.4.1 path now enables `triggerDetonation`. Plain F3 short, F1.4 study and G11.3 Legacy defaults retain their existing code path and golden tests.

| Revision B phase | Implementation |
|---|---|
| Contact | Trigger quad stays at its original **0.31h** size. Wing shader, veins, transparency, palette, flap, hand blend and F1.4 facing/clearance rules are retained. |
| Local concentration | A small existing core slot gives a bounded local pre-glow during a proposed 0.16 s window. It does not compress the world or expand the butterfly. |
| Rupture | The **existing F3 pulse**, at its existing candidate onset, takes over. The butterfly fades out across the onset and is hidden by approximately onset+0.035 s. The old expanding hand-over bloom is disabled only here. |
| Propagation | Existing F3 wavefront, motes and field/canopy response; no second impact, renderer or particle simulation. Flash still ends by 0.10 s; reduced-motion behavior is retained. |
| Reveal | Existing Stellarealm reveal/hold/decay timing remains unchanged. No Intro, Discernment or stage promotion is inferred. |

`butterflyDetonationScore()` wraps the original pure F3 score; it does not modify the default score or create another onset. Its anticipation/fade durations are **proposed presentation timing**, not measured canonical durations.

The local pre-glow and rupture use the **same current hand blend, relative offset, push and existing F1.4 facing/clearance shader** as the trigger. This removes the prior origin mismatch (right hand+0.04h versus the trigger's interpolated hand+rise). They reuse existing core/rupture slots; no Liberation mesh, material, texture or render target is added. Depth testing remains enabled. This alignment is tested at the shader-input level, not yet in pixels.

## 4. Camera: preserve the scoped elevated shot

`combat-study-camera.mjs` and `fidelity-camera.mjs` are unchanged. Inspection confirmed that elevation already acts **only during Burst02 shot three**. The first two close-ups, two cuts, Basic/Heavy/Skill camera frames, study observation shots and normal return are preserved. A new regression test explicitly samples times before, inside and after Burst, including reduced motion and both aspects.

Real-rig projection checks again show head, pelvis and hands inside 16:9 and 9:16 with the existing 35° oblique shot. This does not prove hair/finger clipping, face visibility, trigger occlusion or deliberate cinematic composition. No camera change was made merely to hide a VFX or pose defect.

## 5. Tests, resources and remaining acceptance

- **Node: 368/368 PASS** (363 previous plus five new Revision B tests). One prior Heavy geometry assertion was deliberately changed from thick/noncoplanar ring bounds to horizontal plane normals; sphere volume and ten-cycle disposal checks remain.
- **npm run check / production build / diff hygiene: PASS.**
- **Astro/TypeScript checker: FAIL, pre-existing.** Isolated official `@astrojs/check 0.9.12` + TypeScript were run on both this revision and the exact prior worktree. Both report **36 errors**; normalized diagnostic multisets are identical, with zero new/removed diagnostics (the added checkbox shifts some line numbers). No unrelated Hsin/typewriter/config fix is included.
- Real private canonical GLB and libraries were hash-checked. CPU comparison against **prior F1.4.1**, not an invented fixture: Root/Pelvis/Head/hands local/world error **0** at 13 sampled instants; original clip arrays intact; ten create/seek/pause/interrupt/dispose cycles release body ownership and have stable post-disposal resource inventories.
- Short plan remains **28.868666126 s**; loaded study remains **75 s**, with the same **20 s hold**. STUDY_COLOR, body speeds, idles, facial modules, music gating, canonical files and shared stage are unchanged.
- Relative to initial F1.4.1, **+1 geometry** for star fragments; **0 additional materials, textures, scene objects, renderers, scenes, RAFs or render targets**. Impacts stay one instanced draw, wings/ribbons reuse their buffers and atlas. The hidden QA target removes one visible draw in presentation. Actual renderer calls/triangles, GPU memory/time and Samsung performance remain unmeasured.
- One sequential Node run observed constructors **443.4 / 445.2 ms**, sampled seeks **1.979 / 1.615 ms** (prior/B). These are not browser timings or evidence of a speedup; JIT/order/GC differ. CPU graph geometry/material/texture counts were **48/43/2 → 49/43/2**, with original images/materials skipped by the CPU parser. They are not GPU texture/VRAM counters.

## 6. Visual acceptance is still blocked

**A Heavy, B Skill/diagnostic, C Liberation comparative videos were NOT produced.** The previous run could not reach the private localhost server; local file navigation was blocked by organization policy, and the hosted preview required Cloudflare Access authentication. This revision does not bypass any of those controls or expose private files. The current CPU tests do not substitute for a new rendered comparison. GPU/Samsung and rendered ten-cycle/context-loss tests are NOT_RUN.

All ten requested component verdicts remain **VISUAL_QA_BLOCKED / NOT_ARTISTICALLY_APPROVED** despite passing technical subchecks. CANONICAL_PENDING is retained. No visual FAIL is invented for a frame that was not rendered; the owner's rejection of initial F1.4.1 remains the last artistic verdict.

Private QA needed before approval:

1. **A:** exact same Heavy time/camera for prior HEAD and B: front, ¾, profile and elevated. Check horizontal axes, sphere depth, ring occlusion/size and absence of portal/cylinder/gravity reading.
2. **B:** same target state/edits, diagnostic OFF in presentation. Show origin, continuous curved beam, contact stars and dissipation. Record diagnostics separately with the checkbox ON; prove identical trajectories. Repeat moving/out-of-range/removal cases.
3. **C:** compare fingers/small butterfly/concentration/one rupture/reveal, fixed QA and cinematic cameras, 16:9 and 9:16. Check that the wing never grows, that light starts at the trigger and that the flash is brief. Keep original body speed/duration.
4. Record privately as H.264 MP4; no private assets, captures or signed URLs in Git/CI. Run rendered resource/context tests and physical Samsung measurements before a resource/performance PASS.

The private CPU reproducer now accepts the audited F1.4 base **or prior F1.4.1 HEAD** and records which one was used. It still pins all source hashes and rejects output in repositories or through symlinks. For this comparison use a detached worktree at `e83435abdf0d1dafaffb73077f985f67e522e02f`.

**No new PR, merge, main/Access/R2/shared-stage changes, new ability or F1.5.** This is a correction candidate in the same draft #287, awaiting the owner's visual judgment.
