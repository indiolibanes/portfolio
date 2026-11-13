# Hsin Combat R2.3 — independent Basic studies

Base: PR #280 / `70c4b47315be527d27d87d66a284d9e209a4859a`. Draft stacked on `experiment/hsin-combat-r22-env-vfx-20261108`; no merge. Preflight on 2026-11-08: #273 open draft at 507f85cd; #275 already merged by the owner; #279 open draft at 07d74804; #280 open draft at the requested HEAD. No R2.2.2 assumed.

## Diagnosis and changes

The original R2.2 bake remains byte-identical and selectable in the R2.3 lab as a complete reference. Its two attacks were dependent on the shared preparation and the transition into the sphere. New offline bakes reuse the R2.1 score, actual rig, hinge solver, hand intentions, corrected elbow planes, lower-body solver and recovery lattice. They author rest/entry, anticipation, attack, impact, follow-through, down/out guard and rest. They are not runtime offsets or video cuts.

Basic 01 (4.2 s): concentrated entry, short coil and weight transfer, preserved crescent hand trajectory, small thoracic continuation (+1.8° maximum) after the hand reaches the strike, then a distinct outward/downward recovery. This does not claim a defective earlier velocity peak or move the impact to that peak. Basic 02 (3.8 s): enters independently from rest into the left load; keeps R2.1.2 elbow-plane vectors; adds up to 25 mm outward and 15 mm downward to the left hand intention around the apex for facial clearance. Combo (5.5 s) joins the same language through the original inter-strike guard, then its own recovery. No broad leg motion or skin edits.

Experimental Skill Study (6.1 s) reuses the existing sphere study with an independent entry/recovery. It is **not verified as Heartward by Moon**. Neither Basic nor sphere is claimed to reproduce a canonical animation. Audiovisual references specific to each canonical stage are still required. No Formshift, Pillars Across Heaven, full rotation or new effects.

## Ability contract

One stage RAF, one combat director, one active pose and one set of pooled VFX. Ability definitions: `hsin-combat-abilities.mjs`. Type/category describes the triggered action, not its damage classification.

| Category | Entries | Status |
| --- | --- | --- |
| Basic Attacks / Answering Form | Basic 01, Basic 02, Combo 01 → 02 | Experimental authored studies |
| Resonance Skills / Heartward by Moon | Experimental Skill Study (sphere) | No demonstrated canonical correspondence |
| Resonance Liberations / Ultimates | Formshift; Pillars Across Heaven | Disabled future items |
| Forte / Heavy | Transitions between skills and forms | Contract reserved, no animation |
| Reference | Complete R2.2 cinematic sequence | Original bake and sequence |

- **Local clock**: starts at 0, ends at each bake's `seconds`; no source-clock slicing in body playback. The original clock map is used only to reuse facial/camera cues.
- **Entry/exit**: first/last quaternions and root position equal reference rest; support is solved offline at every frame and throughout interruption recovery. Secondary motion fades to rest.
- **Ownership**: only the active director writes the body. Selection while owned requests the existing 0.65 s recovery; latest selection wins, then the next clip acquires from rest. A rejected body/dance takeover does not write a competing pose.
- **Events**: each clip contains only its own markers. Crossed markers sample their exact baked poses before callback, including after a long frame. Basic clips contain no charge/ring/recovery Skill markers. VFX and environment remain driven by the same local time.
- **Pause/restart/interrupt**: pause freezes clock; restart recovers before acquiring again; stop clears pending selections, in-flight selection generation and effects. No second director, mixer, RAF or physics system.
- **Async loading**: one lazily loaded active bake, identity checked by SHA-256/model/profile. Generations reject stale reads and reads completed after disposal. No cache retaining every decoded clip.
- **Disposal**: releases pose, removes listeners, invalidates reads and disposes existing shared pools once. No extra GPU material, geometry, texture, buffer or render target.

## Feet

The issue reproduces when `matrixAutoUpdate=false` (as in the real stage), and world queries consume dirty flags in separate skeleton branches after the common root changes. Updating the full model after all pose writes fixes the stale ancestor transforms before palm/toe reads. The patch is restricted to `createCombatPose`: apply, recovery and restoration. It also restores the exact position baseline at endpoints.

`node scripts/qa/hsin-combat-r23-feet.mjs` measures the actual skinned vertices weighted to foot/toe bones, including the sole near the stone plane, with the stage's frozen matrices and upper-body-first reads. `feet.json` records root positions, bone positions and sole minima at every frame. Stone top remains y=0; model scale and import offsets unchanged. Reference sole minimum is near y=0, whereas the toe pivot is about 0.45 mm above it. No model, root, pelvis, camera, effect or floor offset compensation; original bake untouched.

## Reproduction and evidence

```
for id in basic01 basic02 combo skill; do node scripts/bake-hsin-combat-r23.mjs "$id"; done
node tests/hsin-combat-r23.test.mjs
node tests/hsin-combat-r23-lab.test.mjs
node scripts/qa/hsin-combat-r23-feet.mjs
```

New gates cover both arms with the unchanged anatomical/surface limits; standalone clips, combo, exact rest, pause, restart, interruptions before/at/after impacts, selection races, sphere→Basic isolation, 10 cycles with stable object identity, 30/60 Hz pose/events, long-frame recovery and endpoint hand speed. These are deterministic CPU/rig evidence. Existing anatomy, acting, R2, screen, environment, lab, ingestion, `check` and build are also required by CI.

The R2.3 workflow additionally renders continuous real-GLB WebGL frames as H.264/yuv420p MP4 without audio, checks decoding with ffmpeg and records ffprobe metadata. A/B synchronise original R2.2 excerpts and independent clips at impact, at original speed. The original naturally continues into its next action; the R2.3 side recovers independently. A: front and ¾; B: ¾ and profile. C: continuous combo with the existing restrained camera cues, plus a vertical version. Foot correction applies to both comparison sides to isolate choreography changes.

Real-page WebGL checks load every entry and measure renderer geometry/texture counts over ten alternating cycles at 1280×720 and 390×640. Software WebGL is structural and visual evidence, never physical GPU/FPS evidence. No 30 FPS claim for Samsung Internet. Final artistic assessment and independent audit remain separate gates.

Performance: active Basic bakes are smaller than the original 1,469,307-byte bake; the sphere and legacy are fetched only when selected. Environment retains the exact existing 3 InstancedMeshes/1 material/3 draw-call ceiling; no VFX source code or budget change. Added CPU cost is a propagated model matrix update before world reads; quantify device cost separately on physical hardware.

Protected: public Hsin V2.0.1, original R2.2 bake/score/facial curves/VFX/environment, canonical GLB and weights, stage, contemplatives, Lunar Dance, Shorekeeper, Sophia, Phrolova, Cloudflare Access/R2 and main.
