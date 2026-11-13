# GPT-6 Work — SOPHIA Adornments Recovery R1.A + R1.B

**Model:** GPT-6 Sol · High effort; Astra after implementation for an independent audit.
**Repo:** `indiolibanes/portfolio`.
**Starting point:** latest `main` after merged #302; compare with documentation-only branch `planning/sophia-adornments-recovery-r1-20261113`.
**Deliverable:** independent draft PR or updated planning PR (choose only one), without automatic merge. Do not touch `main`, Hsin, Shorekeeper, Cloudflare Access, R2 policy, Rocket R3 public GLB, or route `/modo-imersivo/`.

## Mission
Before generating *any* new Sophia meshes, determine which existing ornaments can be extracted from source and fitted to the current authorial Sophia. Implement **only a modest pilot** (Book, Pen, forehead star), unless a blocked source or material incompatibility makes it infeasible. Coat is census/fit plan, not full new garment in the pilot.

Read:
- `docs/sophia/adornments-r1/README.md`
- `docs/sophia/adornments-r1/asset-manifest.json`
- `docs/sophia/adornments-r1/qa-contract.md`
- `docs/archive/sophia6h/Relatorio_6H.md`, `Verdict.json`
- `docs/sophia-404-legacy-7b.md`
- `docs/sophia/immersive-r3-technical-notes.md`
- `src/scripts/sophia-404-renderer.js`
- `src/components/SophiaAnimation.astro`, `src/sophia-portrait.ts`

## R1.A — Asset source lock
1. Check each GLB actually present and authorized: `public/experimental/sophia-alpha.glb`, `public/experimental/sophia-7b-e1-latest.glb`, and the R3 astronaut **as comparison only** if lawful/source access is available.
2. Record SHA256, glTF scene graph nodes, mesh primitive names, skins, armatures, animation names, morphs, UV maps, materials/images, local/world transforms, units, bounding boxes and bone socket candidates. Distinguish *archive documented* from *verified binary*.
3. Inspect 6H Book/Pen, clothing, ear ornaments and forehead star; compare silhouette/scale to C1 author-approved 2D references. **Do not assume the checked-in alpha equals the archived 6H candidate** until hashes/hierarchy confirm it.
4. Export neutral front/¾/profile/back orthographic screenshots of real GLBs at same camera/scale. Include textured and wireframe where useful; no AI screenshots substituted.
5. Test historical 6H Write/Idle/Wave/Walk where present, noting collisions and whether assets are independent meshes, skinned meshes or buried in the body geometry.
6. Determine a canonical parent body for authorial Sophia. Prefer a single consistent geometry for authorial scenes, not three incompatible silhouettes. **Do not switch authorial identity to astronaut or unrigged 7B without explicit approval.**
7. Produce `model-inventory.json`, `mesh-provenance.csv`, `sockets.json`, and `go-no-go.md`. If source is inaccessible or ambiguous, stop with `SOURCE_UNAVAILABLE`.

## R1.B — Low-risk salvage pilot
1. Extract/reuse **Book** and **Pen** if actual mesh source verified. If absent, implement light clean mesh procedurally rather than consume Tripo credits on simple rigid props.
2. Attach via reusable `Socket_Hand_L_Notebook` and `Socket_Hand_R_Pen`. Preserve coordinate, pivot and hand contact. Book may have hinged cover, but no independent skeleton for a rigid notebook.
3. Retain the *forehead star under the fringe* using existing mesh or very low-cost geometric prop, bound to Head. Do not add an external forehead halo.
4. Make the pilot toggleable in a staging harness; leave current 2D SVG fallback intact. Show `Write` and one non-Write pose; no new animation baked into existing source clips.
5. Measure wrists, coat sleeves, chin and tail clearance. No mesh intersections at accepted pilot poses; if nonzero, report exact joint/time and visually show rather than hide.
6. Record mesh count, tris, materials, textures, draw calls, texture decoding cost, and memory after 10 mount/dismount cycles. On mobile, load only when visible and only one source model at a time.
7. Build `*.blend` and `*.glb` only if Blender and original mesh access are available; version output under a private authorized review path. Do not commit a large GLB just to demonstrate a plan. If only read-only auditing possible, report it and STOP.

## Coat feasibility (decision gate, not wholesale reconstruction)
- Inspect whether the coat is a separate mesh with UV and acceptable topology; check shoulder, elbow, collar, hem and sleeve clipping in representative poses.
- Candidate A: retain and repair current coat, transfer/paint weights to existing spine/upper-arm/forearm/pelvis.
- Candidate B: partial remesh only (lapels/sleeves/hem).
- Candidate C: isolated new coat from Tripo multi-view, ONLY when A/B are infeasible. Export meshes/UV/textures then bind to the *existing* skeleton in Blender; never auto-rig a new Sophia to solve costume weights.
- None of the three is pre-approved: present a GO/NO_GO matrix supported by close-ups.

## Mandatory gates and output
- Complete read-only census and provenance report; if not done, `SOURCE_LOCK_PENDING`.
- C1 authorial face/hair/star/ears/body proportions preserved.
- 6H source remains marked candidate, never canonized from test-only results.
- 47 clips/astronaut/single WebGL loop untouched.
- `npm run check:sophia`, `npm run check`, `npm run build` when environment permits, and real mobile visual test requested separately.
- QA screenshots: source × recovered (front, ¾, profile, back), Write close-up and one Wave/Walk frame.
- Draft PR with before/after, sources and limitations, no merge or public asset leaks.
- Do not start coat full reconstruction, `/404` conversion or Curiosidades integration automatically.
