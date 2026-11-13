# SOPHIA — Claude Sonnet · R1.B handoff conditional (2026-11-13)

**Status:** `CONDITIONAL_GO_FOR_QA_ONLY` — **NOT APPROVED FOR FINAL INTEGRATION**.
**Repo:** `indiolibanes/portfolio`, planning PR #303, branch `planning/sophia-adornments-recovery-r1-20261113`, base `main` `ffab5343d95c7f59232c26428d6f4301f1d58199`.
**Authority:** continue only after receiving actual pilot outputs from GPT-6 Work and validating them; not from chat descriptions alone.
**Preserve:** existing Sophia body, rig, face, 2D fallbacks, public `/modo-imersivo/` and its 47 astronaut clips, `/404`, `/curiosidades/`, Hsin, Shorekeeper, Cloudflare Access and `main`. No merge.

## Verified at GitHub
- PR #303 contains **exactly six docs** and no pilot mesh, exported GLB, blend source, runtime code or geometry reports. GitHub head: `d638f6e3a608cf953ffcb0322b41fb0dd051416d`.
- `public/experimental/sophia-alpha.glb` and `public/experimental/sophia-7b-e1-latest.glb` are existing source files; `/404` uses the former for a legacy portrait. 7B E1 is unrigged.
- 6H archive: five clips, four morphs, 101 joints reported, Book and Pen; 6H candidate **not visually approved**.
- GPT-6 Work's separate session **reported**: the checked-in alpha 6H source matches its archived candidate hash; Book and Pen exist independently with hand-related channels; a structural pilot with intermediate sockets and separated stars sampled 255 poses. These claims require the actual **report + pilot asset + manifest + reproducible QA** before Claude accepts them. That local Work result is NOT in GitHub.

## Mandatory source delivery from Work before implementation
See `handoff-artifacts-required.md`. DO NOT guess file names or turn source archive into production geometry from textual description.

## Major identity correction — forehead star
C1 canonical artwork defines a **flat four-point golden birthmark ON FOREHEAD SKIN**, partially occluded by ivory-white bangs, often fully hidden in the frontal hero view. It is **not** a separate metallic ornament, hairclip, halo, decal over hair, or three raised stars. The archived 6H reports *three raised stars*: technically extractable does NOT mean C1-approved. **Do not integrate three raised stars**. Assess whether a forehead material mark / localized texture or skin-conforming decal UNDER the fringe is possible on the chosen body. If canonical skin UV/base cannot be safely edited or the body's identity is not locked, mark `IDENTITY_BLOCKED` and stop that subtask. No extra morphs or bones just for the star.

## Phase 0 — file acceptance (read-only)
1. Receive the exact Work export archive, internal asset SHA256s, source SHA256s and evidence; enumerate uncompressed paths without extracting unsafe absolute/.. entries.
2. Confirm alpha GLB matches archived 6H candidate with independently recomputed checksum, not just a report.
3. Confirm Book/Pen mesh node paths, UV and materials, parent bone/local transform, animation channel mapping and texture dependencies. Check the pilot reuses source meshes rather than proxy re-creations.
4. Diff all base body meshes/skins/IBMs/morphs/materials/clip arrays between source and pilot. Report whether only addition/parenting changed. Verify that the five original 6H clips are preserved.
5. Reproduce 255-pose contact sampling, but also render source/pilot in Three.js WebGL with real skin at Idle, Write, Wave, Walk and an expression. Observe actual pen nib/cover/palm intersections, wrist rotation and sleeves. Numeric socket alignment alone is insufficient.
6. Confirm 2D C1 identity vs alpha 6H appearance; label `6H_VISUAL_CANDIDATE` and never canonize 6H automatically.

## Phase 1 — Claude work allowed only after Phase 0
Implement a **read-only experimental harness** showing existing 6H + Book/Pen sockets, original movements, toggle of each recovered prop, and material views. No routes publicly replaced, no astronaut asset modifications. Keep 2D fallback and ensure no new RAF/AnimationMixer conflicts. Make clips toggleable in a private QA route or local-only harness.
- Socket naming must be deterministic and sourced in `sockets.json`; do not fuzzy-match production skeleton nodes.
- Write contact validation: pen-tip→page, hand→notebook, wrist→sleeve and book→body at representative times. No invented `Write` if source missing.
- Star is **identity R1.C pending**, unless skin-under-fringe solution is demonstrated and approved.
- Do not start full jaleco/coat, headphones, sofa 404 or curiosity conversion.

## Results
Return separate statuses:
`SOURCE_VERIFIED`, `BOOK_RECOVERED`, `PEN_RECOVERED`, `SOCKETS_VALIDATED`, `WRITE_CONTACT_PENDING/PASS`, `STAR_IDENTITY_PENDING`, `BODY_AND_RIG_UNCHANGED`, `VISUAL_QA_PENDING/PASS`.
Include actual WebGL screenshots from front, ¾, profile and Write close-up; 3s video of actual source writing cycle if available; tests `check:sophia`, `check`, `build` plus Android caveat. No fake screenshots or optimistic report.
**If any required source or Work pilot is missing:** stop at `SOURCE_UNAVAILABLE`. Report which concrete files to request. Do not generate replacement meshes with Tripo as an implicit fallback.

Continue in a separate draft branch stacked on #303 only after a verified pilot is available; never merge without owner approval.
