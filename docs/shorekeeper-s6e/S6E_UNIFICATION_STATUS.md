# Shorekeeper S6-E · unified Hsin duet, facial catalog and music modes

Status: **S6E_IMPLEMENTED_PREVIEW / R2_ASSETS_MISSING / G7_NO_GO / HUMAN_QA_PENDING**.
Base S6-D: `85b3d707de0e110e2e2b692e346d099ba936de4c`. Private-only route: `/experimentos/duo/` on the experimental branch. Production and PR #256 remain unchanged.

## Which facial revision is newest?
R6 anatomical acting is most recent (`anatomical-face.mjs`; eight `R6_ACTING_CANDIDATE` profiles). It is NOT human-certified; `VISUAL_QA_PENDING` remains accurate. R5 is the latest geometric mouth-rim refinement (and R5 VFX base), **not a more recently verified R6 facial gallery**. The seven historical approved gestures remain in `approved-manual-gallery.mjs` exactly as they were. R5 mouth geometry requires a separate explicit decision and is not automatically applied to canonical GLB in this S6-E stage.

## Semantic deduplication, no deletion
The active S6-E catalog defines seven unique semantic families: discreet smile, star, hello, serenity, surprise, worry, bilateral glance.
- R6 candidate is preferred where its source morphs bind.
- If missing/unsupported, use an **approved historical baseline** for that family, where available. Never schedule both the R6 variant and its baseline under distinct user-facing names.
- The historical approved archive keeps **all**: LITTLE_SMILE_V2, MY_STAR_V2, MY_STAR_R3_EYES_SOFT, HELLO_R2_CANDIDATE, LOVE, HOPE, SURPRISE_SOFT. Afeto crescente and LOVE are preserved but not repeated automatically as pseudo-different versions of My Star/serenity.
- R6 worry/glance lack a human-approved fallback; if they fail, skip them without substitutions. No new visual approval status has been inferred.

## One autonomous stage / one clock
`/experimentos/duo/` mounts Hsin's existing **one** renderer, scene, camera, OrbitControls and requestAnimationFrame. Each character retains independent body/facial controllers. No double RAF or shared rig transform.
- **No playing track:** Shorekeeper cycles original three idles and R6 expression families, one at a time, with approved alternatives and natural facial reset. Blinks remain in the existing anatomical controller.
- **Confirmed playing:** a bounded, *frontal* yaw (max ~0.26 rad, not full back rotation) and repeated source-original S5/R6.2.3 cinematic combat with G11.3 visual score from `createR62Integration` + R5 VFX. Playback only counts when existing provider reports `status=playing` AND `playbackConfirmed=true`. Selecting a provider, buffering, paused or ended never starts combat. Not beat-locked.
- Hsin's existing independent motion/dance policy is unchanged. Shorekeeper cinematic camera is **disabled on the shared stage**, keeping both performers within Hsin's wider framing; no camera ownership conflict.
- Music interrupted: call authentic S5 recovery, wait for the original director to exit, release that body's owner, return to original idles and drop the optional VFX GPU resources. Change of music alone does not authorize sound autoplay.
- Reduced motion, paused, hidden and lost-context frames stop autonomous updating per Hsin's existing stage loop. A failed S5 source/VFX gate fails closed and does not fabricate a combat clip.
- Full authenticated R2 model + basic/advanced/burst bundles, **10/10** original combat clips, three original idles, and the seven S5 source identities required before guest enters the scene. Each GLB is size/SHA-256 verified before GLTF parsing. No private model or asset is embedded in Git/dist.

## Remaining gates
As last checked, Cloudflare Pages Preview binding points to R2 `private-assets` and Access AUD/domain are consistent, but `characters/shorekeeper/` has **zero objects**. The private G11.3/S6-A ZIPs exist as Project references but raw-byte materialization was denied, so no GLBs were uploaded. Therefore live duet, real Face/Eye deformation, G11.3 VFX visual appearance, 10-minute desktop GPU, physical Android, responsiveness, skinned foot-contact and G7 are **NOT VERIFIED**. G7 remains NO_GO and sourceFrame remains unknown.

Do not make a public release/merge, update PR #256, disable Access, expose assets or claim canonical game choreography. Owner must supply/privately publish the four canonical GLBs and manifest before final visual certification.
