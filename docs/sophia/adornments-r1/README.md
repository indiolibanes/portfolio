# SOPHIA — Adornments Recovery R1 · Source Lock & Compatibility

**State:** planning-only handoff. Not a finished costume, not a new GLB, not certified against rendered imagery. Do not merge automatically.
**Base:** current `main` after merged PRs #297–#302; independently audit head before implementation.
**Owner intent:** restore authorial Sophia's **lab coat / jaleco, notebook, pen, star beneath fringe, ear adornments, brooch/bows, tail and optional music headphones**, and later reuse in `/curiosidades/` and `/404`. The astronaut/rocket mode is a separate approved runtime and must remain unchanged.

## Sources actually located (no undocumented cross-model assumptions)

| Source | Evidence | Scope | Important limit |
|---|---|---|---|
| `public/experimental/sophia-alpha.glb` | Current `src/scripts/sophia-404-renderer.js` uses this for the legacy portrait; code calls it 6H alpha | Potential rigid props, ear ornaments, rig, source of Write clip | Its byte-for-byte identity with archived `Sophia_6H_visual_candidate.glb` **not proven**. Hash before reuse |
| `docs/archive/sophia6h/Relatorio_6H.md`, `Verdict.json` | Archived 6H documents 101 joints, five clips, four morph targets, Book and Pen, accessory intersections, coat issues | Extraction candidates and known collision tests | 6H **NOT** artistically approved. Coat, hands and gaze incomplete |
| `public/experimental/sophia-7b-e1-latest.glb` | `docs/sophia-404-legacy-7b.md`, `scripts/check-sophia-7b.mjs` | Candidate for identifying Sophia 7B silhouette/texture | Unrigged, no glTF embedded animations. Do not treat as animated source |
| `/api/sophia/rocket` (R3) | `docs/sophia/immersive-r3-technical-notes.md`; #302 | Public immersive astronaut and 47 existing clips | Do **not** modify or automatically re-rig; physically separate costume and code path |
| `src/components/SophiaAnimation.astro` | 2D lab/music Sophia with notebook/lab coat | Visual target, fallback preserved | Current artwork is not a 3D mesh |
| `src/sophia-portrait.ts` | Authored SVG portrait describes white coat, golden trim, red bow/brooch, ears, stars | Geometric/color reference, not a mesh | Its proportions may differ from Sophia 7B; preserve the user's C1 identity reference first |
| `src/scripts/sophia-404-renderer.js` | Legacy hides `Book` and `Pen`, lounge loads unrigged 7B | Potential naming and existing route QA | Do not break `/404` / Tetris fallback |

The #302 audit covers **delivery/performance** of the immersive asset, not adornment geometry. Therefore do not claim that all ornaments require remodeling, nor that all can be reused. A model-level census is required.

## Decisions: choose the least destructive tool

**PRIMARY: GPT-6 Work, high effort, with Blender/GLB tools when actually available.**
1. Read-only GLB census + hashes for each source; document mesh node paths, material/texture IDs, skins, animations, morphs, anchors/bones and bounding boxes.
2. Extract every salvageable accessory into separate nodes or GLBs, preserving original transform, UV and textures. Do not reconstruct a mesh if identical source exists.
3. Fit a pilot set to the selected authorial body without changing geometry or rig. Prove collisions and renderability. If unavailable, stop at `MISSING_SOURCE`.

**SECOND: Claude Sonnet** for targeted modeling scripts, Astro/Three.js integration, optional socket/attachment/skin constraints, UI switching and testing **after** a concrete source lock. Claude should not invent geometry provenance or declare QA without the GLB.

**ONLY IF REQUIRED: Tripo3D (Smart Mesh / multi-view)** for new isolated meshes where salvage fails: coat shell, unique ear ornaments, headphones. Export *mesh+UV+PBR*, not a newly auto-rigged character. Work/Blender then transfer/paint weights to the **existing** skeleton. Tripo supports multi-view generation, segmentation, retopology, texturing and auto-rig, but an automatically generated character skeleton does not prove compatibility with this specific existing rig.

## Orthogonal geometric choices

| Asset | Proposed motion implementation | Morphs? | Need independent rig? |
|---|---|---|---|
| Notebook (`Book`) | Rigid mesh on non-destructive left-hand socket; optional hinged cover | No, unless designed as deforming pages | No |
| Pen/quill (`Pen`) | Rigid mesh parented to right-hand attachment; fingertip/contact QA | No | No |
| Forehead star / brooch / ear charms | Rigid socket to head, chest or original ear bone | No | No |
| Bow/ribbons | Rigid root on chest; 1–3 secondary joints only if visibly required and safe | Generally no | Optional secondary bones (not new armature) |
| Lab coat / jaleco, sleeves, lapels | **Skinned** mesh with existing upper-arm, forearm, spine, pelvis weights; optional correctives at shoulder/elbow | Optional corrective shape keys after pose QA | No independent skeleton |
| Tail ornament | Attach to existing tail chain, weight transfer if deformation needed | Not initially | Reuse tail bones |
| Music headphones | Parent rigid pieces to head; adjust clearances over ears/fringe | No | No |
| Astronaut outfit | Leave R3 untouched | Not in this phase | No |

## Recommended phases

1. **R1.A SOURCE LOCK:** model inventories, SHA, orthographic reference, measurement of attachment anchors, five representative original clips/poses (or more where relevant). Proof of source vs speculation.
2. **R1.B SALVAGE PILOT:** **notebook + pen + forehead star** first. This validates sockets, skinning boundaries, identity and hand contact at low cost.
3. **R1.C COAT FIT:** recover original coat as baseline; repair topology, coat weights, lapels, sleeves and intersections. Only regenerate isolated coat if impossible/uneconomical. No whole-body replacement.
4. **R1.D UI INTEGRATION:** add optional authorial 3D pilot to a single selected scene (`/sophia/` or existing lab), preserve 2D fallback. Do not convert all `/curiosidades/`, `/404`, music and immersive modes in one PR.
5. **R1.E EXPANSION** only after artistic approval and Android QA.

## Gates
- G0 `SOURCE_MATCHED`: proven node paths, hashes and independent render.
- G1 `IDENTITY_LOCK`: C1 reference preserved; correct eyes, ears, star beneath fringe, hair, white/gold coat.
- G2 `SKIN_AND_CONTACT`: elbow and shoulder deformation, writing grip, no clipping in representative animations.
- G3 `RUNTIME`: no mutation of existing 47 astronaut clips, no new mixer/RAF, 2D fallbacks preserved, lazy load.
- G4 `WEBGL_AND_MOBILE`: real glTF render, 16:9 and 9:16, Samsung Internet, context loss/dispose, resource accounting.
- G5 `ARTISTIC`: screenshots + short 3 s loops of Write, Wave, Walk and idle, then user acceptance.
- Never promote `CANONICAL_PENDING` to PASS solely from synthetic checks.

**Handoff:** see `asset-manifest.json`, `work-prompt.md`, `claude-prompt.md`, `tripo-prompts.md`, `qa-contract.md`.
