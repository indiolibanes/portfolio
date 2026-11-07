# Shorekeeper R6.8 — Public stage delivery: controlled release plan

**Draft stacked on PR #260.** This change prepares **/experimentos/palco/** as a candidate public stage while keeping /experimentos/ (Hsin solo) and the private QA endpoints intact. No production merge. No hidden or invented Cloudflare bindings.

## Technical model

- Pages Functions `/api/stage/shorekeeper/manifest` and `/api/stage/shorekeeper/asset` deliver only an explicit, version-pinned allowlist from R2. The bucket **remains private** (no public r2.dev, no listing, no arbitrary GET, no PUT/DELETE).
- The **visitor does not authenticate**. The public route is enabled only by `SK_PUBLIC_STAGE_ENABLED=1` and a valid **Pages** binding `SHOREKEEPER_ASSETS_R2`. Old `/api/shorekeeper/*` administrative routes still require Access.
- The public manifest is sanitized; it contains no R2 object keys, origin filenames, account details or administrative metadata. Public GLBs are versioned by SHA-256 in request URL and delivered with immutable cache headers. Manifest max-age 60 seconds. On first release or model update, test and measure **Cf-Cache-Status**, not just response headers.
- Cloudflare Access may protect a host/path **before** Pages Functions run. The production and preview Zero Trust policies must explicitly **exclude** public stage URLs and endpoints while retaining protection for admin endpoints. Adjusting a function does not override an edge Access application.
- The client uses the same Hash SHA-256, byte-length and MIME validation logic as the private loader, with browser HTTP caching allowed for versioned public URLs; the Hsin loading fan-out overlaps remote preparation.
- User-visible public copy omits storage architecture and sign-in instructions. Technical docs retain infrastructure details. Copyright attribution is preserved.

## Activation sequence — not completed from GitHub

1. Verify that public distribution of the game-derived GLB and source animation libraries is permitted by the relevant rights holders, including third-party rig/texture authors. Credit alone is not permission. Kuro Games derivative guidelines do not appear to confer a license to redistribute extracted 3D game resources.
2. Bind R2 to the **Pages project that hosts /experimentos/palco**, not just to a separate Worker named kaue. Alternatively configure a service binding to an audited Worker; do not treat a Worker binding as a Pages binding.
3. Confirm `current.json` and all three verified combat library entries exist; keep the private canonical GLB from PR260 pinned until alternate optimized versions pass visual/source QA.
4. Set `SK_PUBLIC_STAGE_ENABLED=1` in a controlled preview environment only. Update Access edge routing so only the public stage endpoints bypass login; leave admin/debug endpoints protected.
5. Test anonymous GET/HEAD of manifest and model (200, versioned cache headers) plus failure modes (invalid id/hash/path -> 404). Test Cloudflare edge cache HIT on repeat requests and browser cache re-use; confirm no stale asset after version update and how to purge on takedown.
6. Measure first render and warm repeat in Samsung Internet: HTTP bytes and latency, JavaScript parse, GLTF parse, GPU textures, memory and idle FPS. Track cache MISS/HIT and demand spikes.
7. After rights, runtime and performance verification, promote candidate stage from /experimentos/palco/ to /experimentos/ with a preserved Hsin-solo route, then merge only by explicit approval.

## Performance work for Work
- Current canonical GLB: **39,487,548 bytes**. Target a tested compressed *derivative* using glTF Transform, Meshopt/Draco where compatible and KTX2 textures. Preserve rig, morph targets, blendshapes, source animations, R5 oral contour, source-to-source G11.3 timings and skinned bounds; never overwrite canonical object in R2.
- Measure payload breakdown before choosing codecs. Batch small animations or split model/clips by criticality, **lazy-load Basic/Advanced/Burst only after music playback**. Prewarm verified data after an explicit gesture if useful, without autoplay. Avoid duplicate 40 MB ArrayBuffers/Files in browser memory when possible; seek streaming digest/import strategy compatible with WebGL and current Three.js, but do not claim parse streaming if GLTFLoader still buffers.
- Preload strategically (Hsin poster and critical code first; Shorekeeper fetch overlaps but does not block Hsin). Add robust cancellation, pause-offscreen, context restoration and compatibility fallbacks for Samsung Internet. Measure DPR and draw calls after new scenery.
- No public R2 storage metadata, source key paths or private wording in interface, but maintain clear non-official character credits.

## Facial acting
- User-approved Shorekeeper R6 needs expressions to be perceptible at common mobile camera distances. Do NOT indiscriminately multiply all morph weights.
- Use the R5 geometry baseline + anatomical R6 facial writer. Collect at least neutral, warm smile, surprise, serenity and blink in portrait/landscape with the REAL model, at each camera mode.
- Improve visible expression only where supported by morph map: bounded brows, lids, cheek+mouth coordination, gaze and hold/recovery timing; preserve single facial writer, bilateral blink, R5 oral continuity and manual 25-state QA menu in the lab. Public UI may expose a compact expressive mode, not 25 QA controls by default.
- Default automatic facial cadence can be slightly more legible during quiet intervals; during combat, retain G11.3 body ownership and do not overwrite required facial frames.

## Final stage and scenery
- Promote the R6.7 expanded arena, moon and balanced Hsin/SK spacing.
- Rebuild **Jardim das Marés Astrais** modularly with open performance footprint, lake, distant Chinese architecture, nocturnal flowers/lanterns and affordable lighting. Keep all seven G11.3 stages and later Phrolova/Sophia motion envelopes on solid ground.
- One renderer/scene/RAF; no multiple full-screen bloom passes, unbounded DPR, or extra camera render targets. Stage supports four virtual camera directors but only one actual WebGL PerspectiveCamera.
- Preserve public credits, mobile pointer zoom and native music widget as one surface.

**Release gate:** no anonymous public delivery of game-derived GLBs until rights are confirmed, Cloudflare Pages/Zero Trust is configured and anonymous WebGL QA succeeds. This PR is public-delivery code behind a disabled-by-default switch, NOT a completed public launch.
