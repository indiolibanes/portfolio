# Shorekeeper S6-C · protected autonomy pilot
Revision: S6C_PARTIAL (preview-only, human visual QA pending).
Base: S6-B @ eb807cee816a337c2aab1a2d38a74a7e7f25bf84.
Scope: change S6 preview runtime only through opt-in `?r61=1&r62=s5&s6Auto=1`.
No change to original source animations, G11.3 VFX, camera, R5 materials, facial recipes or private GLBs. One existing frame clock. No second body mixer or facial writer.
## Verified infrastructure, 2026-11-06
Cloudflare Pages project `kaue` preview binding `SHOREKEEPER_ASSETS_R2` targets bucket `private-assets`; Access AUD matches the Pages app and domain matches Zero Trust team. Bucket had been **404** and was provisioned as a dedicated R2 Standard bucket. R2 public-development domain remains disabled. Its `characters/shorekeeper/` inventory is EMPTY: no model, libraries or current manifest. This is a genuine blocker. Production has no such R2 binding; do not enable it or change production.
Existing publisher (already in repo): `npm run publish:shorekeeper -- --init --model /PRIVATE/shorekeeper-f20a.glb --library basic=/PRIVATE/basic.glb --library advanced=/PRIVATE/advanced.glb --library burst=/PRIVATE/burst.glb` only after authorized canonical bytes and rights are available, and after a dry-run. It hashes files, uploads to R2, downloads to verify SHA-256, then atomically writes current.json. DO NOT run from CI, Cloud Browser or use public URLs. Never put local private bytes in Git.
## Preview logic
The UI inventory is expected clip NAMES, not proof of R2 existence. Distinguish manifest from downloaded and SHA-verified files.
When `s6Auto=1`, the new pure conductor waits for F2.0-A canonical SHA, authenticated R2 manifest, model downloaded through R2, all three declared combat libraries hash-verified & parsed, original seven S5 clips, three original idles, WebGL, viewport and no reduced-motion. Only then it triggers the existing G11.3/S5 start button; after natural completion and camera return it disposes the cinematic body writer and enables the existing original-idle scheduler. Facial writer remains `createGentleFace`, with only MY_STAR_V2, SURPRISE_SOFT, HOPE selected as three different semantic families (manual alternatives remain). No facial reclassification as canonical. Existing G7 stays NO_GO. A pause/missing source prevents automatic starts. Manual controls remain authoritative.
## Blocking gates
1. Private source kit bytes not present in available connected files; zero uploaded so far; expected.json and hashes must be checked privately before R2 upload.
2. Authenticated Access/R2 round-trip cannot be verified without legitimate user-owned browser session.
3. G7 physical/surface seams, real GPU and mobile QA, sourceFrame mapping, Hsin duo scene and rights remain PENDING.
4. No production merge, PR #256 edit or public release is authorized by this candidate.
