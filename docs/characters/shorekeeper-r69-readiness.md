# R6.9 — Technical integration and release readiness

Date: 2026-11-07. PR #263 remains draft on #260. Audited base: 39567c8a23a2baebb77ac9abee7ab9d2f72b39ec. Recommendation: **PARTIAL technical / BLOCKED_PUBLIC_RELEASE distribution**.

## Review and proven defects

Read both PR descriptions and complete discussion timelines (deployment bot and R6.8 audit), commit history from #259 through #260/#263, R6.8 source/endpoint/client changes and pertinent stage/camera/source documentation. Four base workflows passed: 42409220080, 42409220103, 42409220095, 42409220151. No model, choreography or source rig was reconstructed.

1. The public gateway pinned the canonical model, but accepted changing basic/advanced/burst hashes from current.json. Fix: an operator-reviewed release digest binds each published ID, R2 key, SHA-256 and size. A change in any member fails closed. Existing private manifest validation also runs on public helper input, preventing duplicate/malformed entries.
2. A one-year immutable asset response plus a cacheable stale manifest could bypass the switch after disabling public access. Fix: manifest no-store; versioned assets max-age=0,must-revalidate and CDN no-store. Errors remain no-store; public manifest HEAD now has matching headers/status and no body. This deliberately defers immutable caching until an authorized permanence/takedown policy exists.
3. Download verification created a File and consumers immediately re-created an ArrayBuffer. Fix: optional asBuffer handoff returns the exact verified buffer through model preparation and GLTF parsing. File-returning API remains backward compatible. This removes JS wrapper/re-read operations; physical memory savings have not been measured.
4. If GLTF parse completed after disposal/abort, its scene could survive the earlier cleanup. Fix: dispose the newly parsed scene before admitting it to ownership and throw AbortError. Parsing itself is not falsely described as cancellable.
5. First guest frame was marked NOT_MEASURED. Added first CPU render-submission elapsed time, parse time and preparation excluding parse. Preparation includes waiting/loading/setup; it is not a pure materials-only measurement. Render-submission is not presentation/GPU time.
6. Public page still had English preparation/failure/zoom labels and technical candidate headings. Localized those strings and simplified headings while preserving the 25 R5/R6 choices, collapsible panels and protected lab controls.

## Release authorization and pinning

No evidence of public redistribution rights for all model/rig/texture/animation assets was supplied or found in the reviewed project documentation. Credits are retained and do not satisfy this gate. No distribution flag, R2 object, Pages binding or Access policy was changed remotely. The candidate must remain disabled.

After documented rights approval, a separately authorized operator must:

1. Inspect the exact current manifest and audit each authorized model/library and provenance. Do not compute a pin from an unreviewed mutable manifest and call that approval.
2. Compute await releaseDigest(manifest) exported by functions/_lib/shorekeeper-public.mjs. It hashes a deterministic ordered descriptor: [id-or-model,key,sha256,bytes] for model,basic,advanced,burst. Optional libraries are excluded from public delivery.
3. Set SK_PUBLIC_STAGE_RELEASE_SHA256 to the reviewed digest only in a controlled preview, with SK_PUBLIC_STAGE_ENABLED=1 and the correct Pages binding. Missing/malformed pin or mismatched content remains closed. These variables were NOT set by this task.
4. Verify anonymous GET/HEAD and the current source schema, full client hashes, invalid IDs/versions, disabled switch, stale manifest and old asset URL after disable. Private/admin endpoints must still require Access. No Access exception is created by code alone.
5. When retiring a release previously served with immutable headers, separately purge the old CDN URLs and announce that browser/downloaded copies cannot be revoked retroactively. New revalidation headers do not erase old browser caches or downloaded files. Revalidation reduces accidental stale reuse; it is not DRM and cannot withdraw a File already open in a running scene.

The pin is deployment integrity metadata, not a licence or a secret. Re-enabling distribution requires explicit approval after rights and visual/performance gates pass.

## Performance before/after

| Measurement | Audited base | R6.9 | Evidence |
|---|---|---|---|
| Canonical model bytes | 39,487,548 | unchanged | pinned manifest constant |
| Verified downloader handoff | buffer → File → consumer buffer | original verified ArrayBuffer when requested | test asserts object identity; File API compatibility retained |
| Cold/warm download, HIT/MISS | NOT_RUN | NOT_RUN | Access sign-in blocks scene/assets |
| Actual model parse/setup/first visible frame | NOT_RUN | NOT_RUN | new hooks are not measurements |
| CPU/GPU memory, FPS, frame times | NOT_RUN | NOT_RUN | no real model/device session |
| Meshopt/Draco/KTX2 comparison | NOT_RUN | NOT_RUN | canonical private bytes unavailable; no substitute generated |

No percentage speed-up or memory/FPS improvement is claimed. Existing Hsin-first loop remains independent of async guest attachment; combat libraries remain music-demand-loaded. The network/parse buffers still cannot be streamed into GLTFLoader as partial data.

Compression gate: obtain authorized private bytes; inventory vertex/morph/skin/animation/texture payload; create derivatives in separate local filenames; test Meshopt for compatible mesh/animation data, Draco only if morph/skin preservation is demonstrated, KTX2 only with verified decoder support and visual texture comparisons. Compare neutral/R5/R6/blink, every source clip and material/UV/skin/morph counts and hashes of unchanged components. Measure total bytes, decode/parse/first frame, memory and physical Samsung Internet performance. No codec was installed or canonical object replaced without these inputs.

## Visual and stage limits

Current Work browser navigation to https://85a39893.kaue.pages.dev/experimentos/palco/ reached Cloudflare Access sign-in. No authentication/session was available. No anonymous file delivery was enabled to bypass that restriction. Therefore real duet positioning, expressions, music, network recovery, context restoration, moon and widget composition could not be qualified. Samsung Internet/physical Android NOT_RUN. No scene screenshot is fabricated.

The existing R6.7 36×24 solid floor, approved spacing, moon, lake, lanterns and reserved future actors remain. Further platform/mountain/pavilion changes and facial-legibility tuning are pending actual source motion envelopes and portrait/landscape renders; current bounds are not proof feet stay on stone. No global facial weight multiplication, expensive postprocessing or second scene/renderer/loop/camera was added. The R6.7 registry PR #262 is a separate unmerged draft and is not silently merged here.

## Acceptance checklist

- [x] Exact base, PR histories/comments and four successful base workflows.
- [x] Fail-closed release pin, cache policy, HEAD, integrity/MIME checks and old API compatibility tested locally.
- [x] Cancellation cleanup and metrics instrumentation implemented.
- [x] Public wording localized; protected technical controls retained.
- [ ] Rights/provenance approval for every publicly distributed asset.
- [ ] Controlled preview configuration and anonymous endpoints, cache/takedown verification after authorization.
- [ ] Actual cold/warm download/HIT/MISS, parse/material setup/first frame and memory/GPU/FPS measurements.
- [ ] Real facial neutral/smile/surprise/serenity/blink at normal portrait/landscape distance.
- [ ] G11.3, music-confirmed cycles, 5–8s interludes, motion reduction, feet/cloth/hair continuity.
- [ ] Solo Hsin visual regression, dual-source network failures, retry, lost/restored WebGL and disposal in browser.
- [ ] Android/Samsung gestures, public layout/credits, scene/widget occlusion and sustained performance.

Do not merge or describe the stage as publicly released based on tests/deploy alone.
