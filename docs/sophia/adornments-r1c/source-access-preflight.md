# SOPHIA R1.C.1 — Mandatory live-source access preflight (Claude Sonnet)

**State:** OWNER-AUTHORIZED READ-ONLY INSPECTION, not a grant of credentials and not automatic Cloudflare Access bypass.
**PR:** #305; branch `planning/sophia-adornments-r1c-identity-contact-20261113`. Continue same draft, no merge.
**ABSOLUTE STOP GATE:** Do not write mesh/rig/skin/animation adjustments until the latest authoritative asset and references have been discovered and their origin proven. Do not assume `sophia-alpha.glb` is the current Sophia just because it is tracked by Git.

## Scope of the owner's permission

The owner authorizes Claude/Work to inspect the sources necessary for this Sophia task, including:
1. Read-only metadata/list/download of **Sophia-related** private objects through an authorized R2 integration or explicitly delegated credential, for authorized directories only.
2. An authenticated **Cloud Browser / WebView** interactive session for Cloudflare Access–protected previews and the current Sophia authorial/immersive routes, following the owner's interactive sign-in where required.
3. Real source models, 2D C1 master, private 6H/R1.B/R1.C review packages, BLEND, images/GIFs/MP4s, manifests, commits and other relevant files the owner makes available.
4. Inspect current deployment's network requests and asset bytes (if permitted); compare what the browser actually loads with source inventory.
5. Use local/offline Blender, Python, Node, Three.js and WebGL QA only with authorized files.

**This instruction is not a usable R2 token, account credential, session cookie or Access policy change.** If a connector is disconnected or an Access challenge appears, request the owner's required interactive authorization and resume after confirmed access. Never ask the owner to paste passwords, API tokens, cookies, signed URLs or MFA codes into chat or PR. Never fabricate login success. Do not broaden access to unrelated models or buckets. Never expose protected files through public Pages endpoints, commits, build logs, or screenshots.

## Evidence-first source discovery

Before any modeling or source reuse:

1. Read PRs #303/#304/#305 and their latest SHA, plus `main` and current relevant deployments; list the current user-approved C1 and Sophia authorial models by role. Record source, asset key **only in a private manifest**, version, updated date, byte size, etag and computed SHA-256 from actual downloaded bytes. Validate glTF mesh, skin, joints, animations, morph targets and textures; don't infer from filename.
2. Compare the current **authorial C1 target** separately from the current **astronaut R3** and historical 6H/7B. The R3 astronaut delivery endpoint is deliberately allowlisted for **one specific asset** and must not be treated as a general R2 listing API or proof of current C1.
3. Open the *live authorial/immersive UI* in authenticated Cloud Browser/WebView. Record exact URL, route, build SHA if exposed, browser, Access status, actual model request & response, etag/hash, and screenshots at 0°/¾/profile if the runtime permits it.
4. Confirm that the source discovered via R2 is **the exact model loaded by the current UI** (or explain the mismatch, e.g. stale cache, old preview head, unauthorized URL, build variant). Respect versioned cache and Cloudflare edge/stale behavior. A successful request alone does not demonstrate WebGL render; if the browser lacks WebGL, mark `WEBGL_UNAVAILABLE` and inspect source from local native Blender/WebGL on a supported device.
5. Rank candidates by evidence, NOT date or filenames alone: (a) owner-approved identity + exact usage in current UI; (b) owner-approved GLB+reference SHA; (c) recently authored, source-verifiable C1 candidate; (d) historical 6H and 7B for donor geometry; (e) astronaut R3 is separate and read-only. When source authority is unclear, issue `AUTHORITATIVE_C1_MODEL_UNVERIFIED` and STOP before skinning.

## Required preflight private outputs
- `private/sophia-source-lock-latest.json`: object identifiers/keys and signed links only in owner's private channel; UTC version timestamps, byte sizes, SHA-256, skin/morph/animation counts, role, asset owner approval, confidence.
- `private/sophia-live-preview-capture/...`: captures from real browser and network evidence, sanitized for sharing.
- A **public-safe** `docs/sophia/adornments-r1c/results/r1c-source-selection.md`: factual identities (6H vs 7B vs C1 vs R3), hashes where acceptable, source-selection GO/NO_GO, preview status and missing accesses; **no private R2 object keys, storage names, auth, signed URLs, request headers or screenshots containing access information**.
- Prior to work, provide an explicit verdict per source: `CURRENT_C1_SOURCE_VERIFIED` / `CURRENT_C1_SOURCE_NOT_FOUND` / `ACCESS_BLOCKED` / `SOURCE_MISMATCH` / `PREVIEW_WEBGL_PENDING`.

## Work gate
Only when `CURRENT_C1_SOURCE_VERIFIED` and identity comparison supports it may Claude consider **porting** recovered accessories/coat to that approved C1 body; first study matrices, UV and skeleton compatibility (6H 101 joints may not map). No automatic retarget, skeleton replacement, auto-rig, Tripo character generation or modification of R3's 47 clips.

If the current C1 model isn't available but historical 6H is, Claude may still run **non-destructive QA/diagnosis on the 6H**, explicitly labeled `LEGACY_6H_DONOR_ONLY`, but may **not** spend substantial tokens optimizing its visible anatomy or garment for production. Provide a source blocker report instead.

## Security and compatibility
Read-only Sophia prefixes (least privilege, expiry where feasible), interactive Cloudflare Access login performed by the user, no blanket public R2 access, no private Cloudflare policy changes, and no direct exposure of unrelated Shorekeeper assets. Existing `/api/sophia/rocket` may be read as an already public-authorized model, but must not be repurposed for other assets.

Finish preflight with a 1-page decision table (source, verified version/date/hash, browser loaded? C1 identity approval?, target/donor/reject). STOP if insufficient. Only then proceed with R1.C.1 contact/garment work and independent visual QA.
