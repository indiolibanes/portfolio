# Shorekeeper — approved facial gallery and authored celestial environment

**Branch:** `experiment/shorekeeper-approved-gallery-environment-20261104`, based on the R5 + R6 approval-lock integration carried by #234. This draft is separate from active R6 anatomical work.

## Intent and scope

Expose only the exact manually reviewed **appearance recipes** in the experimental laboratory, not a new autonomous scheduler or a blanket final release. The face controller stays the sole morph writer, `E_Close` remains blink-owned, and the original three idles and clips are unchanged.

The available gestures are LITTLE_SMILE_V2, MY_STAR_V2, MY_STAR_R3_EYES_SOFT, HELLO_R2_CANDIDATE, LOVE (seen as Ternura), HOPE (seen as Esperança/Serenidade), and SURPRISE_SOFT. The mappings of Ternura/Serenidade to actual recipes must be confirmed under identical camera/material/geometry. Source weights remain byte-for-byte the same; manual timings are limited to several seconds so the face returns to neutral. The R2/R3 candidates considered duplicates, the unfinished WORRIED/GLANCE and the original opened-mouth HELLO are not promoted.

**The approved appearances were evaluated by the author; this does not establish R2/R3/R4/R5 geometry equivalence.** The refined R5 mouth geometry remains selectable in the private diagnostic bench; this gallery never changes the canonical GLB, clones the face by itself, or silently switches geometry. Verify visually with the actual geometry and label the limitation.

## Atmosphere

Default to the existing R5 procedural director in this experimental route only. After loading the model, AMBIENT is selected manually by the runtime as the lightweight environmental default; no powerful Burst/Resonance effects or 18-second narrative autoplay. Existing OFF, AMBIENT, PREPARATION, STELLAREALM, RESONANCE_PEAK, RECOVERY, field/canopy controls, reduced-motion and visual budget remain functional. There are no new music, combat, timer, postprocessing or separate RAF resources.

## Privacy and hosting

Cloudflare R2 bucket `private-assets` under `characters/shorekeeper/` using Pages Functions binding `SHOREKEEPER_ASSETS_R2`. The existing protected endpoints are `/api/shorekeeper/manifest` and `/api/shorekeeper/asset`; they require Access JWT verification through `SK_ACCESS_TEAM_DOMAIN`/`SK_ACCESS_AUD`, not merely a hidden URL. Do not set a public R2 custom domain, public bucket access, GitHub LFS, public release asset or public/ folder.

**Existing publisher restriction:** at most 4 registered `.glb` library objects in the manifest, while the private combat corpus has Attack01–04, Skill01, Burst01, Burst02 (seven source libraries). Do not publish all seven as separate library IDs until a separate publisher + schema + API + loader expansion has been tested; alternatively combine clips into at most four validated GLB bundles preserving source names, bones and durations.

The model + source animations are proprietary to KURO GAMES. Storage access control limits exposure but does not supply distribution rights. Do not disclose raw model/animations to site visitors without the relevant permission; local import remains an alternative.

## Merge gates

1. Verify the PR is based on the merged R5/approval-lock head, not the active Sol R6 branch. No merge into main automatically.
2. Build, structural, route-isolation, face/blink and environment lifecycle tests pass.
3. Manual view frontal/45°/profile at original scale with the canonical GLB and matching selected geometry; confirm two smiles, HELLO, Ternura, Serenidade, Surpresa, blink/neutral and 3 idles.
4. Confirm ambient butterflies and celestial background on desktop + mobile dimensions. GPU/Android measurements remain pending.
5. Confirm the Access-protected asset flow fails closed; no GLB/PSA/textures/private reference media in Git or dist.
6. Keep R6/R7 morphological revisions opt-in on their branches.
