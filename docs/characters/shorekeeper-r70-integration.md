# R7.0 — implemented recovery and garden

Base: effective #263 head **28ab6eacd334c75b76c55831c497ab8794a60bae** (includes R6.9 conditional GET fixes). Separate draft stacked on #263. Technical **PARTIAL**, distribution **BLOCKED_PUBLIC_RELEASE**. No canonical assets, main, Access/R2/Pages settings or choreography changed.

## Shipped code

- Implemented `astral-tidal-garden.mjs`: original procedural garden, 36×24 authorial stone/jade floor for standalone presentation, lake, matte painted lunar reflection, instanced mountain silhouettes, peripheral circular gates, low horizon pavilions, 20 instanced lanterns and 72 instanced flowers. Raised props are outside the full reserved floor. Shared geometry/materials, no extra lights, render targets, reflection pass or bloom. Existing duet terrace gets the peripheral addition only; its floor and approved performer spacing remain unchanged.
- `/experimentos/palco/` now mounts scenery-only authorial fallback. It does not import GLTFLoader or request character manifests/GLBs, and the inherited Hsin poster image has been removed from this fallback. It retains native music controls, camera exploration, credits and disabled character/expression slots. No new unlicensed model/texture is published. `/experimentos/duo/?r6Guest=1` remains the complete authenticated laboratory and uses private endpoints exclusively.
- Selectively reconciled #262's camera registry, anchor follow, gesture priority, tap hotspots and tests. Fixed paused-loop handover starvation and initialization-time metrics access to the registry. Resolved integration conflicts by retaining both R6.9 timing hooks and registry application. Only one automatic writer in draw; manual mode retains OrbitControls. Original Shorekeeper smart:true camera, musical G11.3, VFX lease, body ownership and 5–8s interludes remain unchanged. Future actor contracts stay disabled.
- Manifest inspection now recognizes Access redirects. Guest loading distinguishes denied/auth redirect, missing endpoint, service/configuration unavailable, invalid manifest and network failure, rather than reporting all non-ready states as missing assets. Parse and rig initialization failure stages are retained separately for protected diagnostics. Public fallback contains no such technical messages.
- Read-only `createFloorOccupancy` records actual Root/Pelvis/head/hands/feet min/max and XZ exits against the floor on existing G11.3 ticks, only when metrics are requested. It neither writes bones nor clamps source movement. Reports are bone envelopes, not proof of skin/cloth/foot contact. The seven-source private trace is still required before any evidence-based floor enlargement.

## Environment findings and exact continuation

Cloudflare read-only inspection: `kaue.preview` has `SHOREKEEPER_ASSETS_R2`, `SK_ACCESS_TEAM_DOMAIN` in valid https://*.cloudflareaccess.com form and `SK_ACCESS_AUD` in expected token format. Public switch is false. Production has no R2 binding; it was not modified. Presence/format does not prove bucket payload availability or audience equality with the correct Access application.

The browser previously reached Cloudflare Access sign-in on the protected preview; no authenticated session was available. No service token, bypass or anonymous publication was created. Therefore Shorekeeper's successful actual render is **NOT_RUN**, not MODEL_MISSING or MODEL_CORRUPT. This is the remaining principal technical acceptance gate.

Use the preview's exact hostname and authenticate through the existing Access application, then open `/experimentos/duo/?r6Guest=1&hsin-metrics`:

1. Navigation login: obtain the normal authorized session. Do not change Access to public to work around it.
2. API 403 after successful login: check that `SK_ACCESS_AUD` matches that Access application's audience and `SK_ACCESS_TEAM_DOMAIN` matches its issuer. Never paste tokens into PR logs. No mismatch was established here.
3. API 503: verify the Pages-preview binding `SHOREKEEPER_ASSETS_R2` points to the expected existing bucket and the two Access variables are present. Read `characters/shorekeeper/manifests/current.json` in the authorized environment; validate the declared canonical hash/size and basic/advanced/burst entries. This session did not establish object absence.
4. API 404/409: verify declared object key and size. Invalid manifest/full client hash/MIME failures are asset validation failures. GLTF_PARSE means verified bytes could not be parsed; INITIALIZATION_OR_RIG means initialization failed. These must not be described as login errors.

No remote remediation was needed or authorized without a proven configuration error. Existing private endpoints and anonymous release gates remain distinct. Browser receipt of model bytes is download access, even when R2 keys are hidden.

## Validation

- Node Shorekeeper suites: **272/272 PASS**, including new garden resource/disposal, floor occupancy and public non-loading tests plus incorporated registry/seven-segment synthetic tests.
- `npm run check` and production build/OG/hygiene: PASS. Syntax checks and resolved diff: PASS.
- Typecheck executed with TypeScript using npm exec: **FAIL — 30 diagnostics**. Exact same 30 normalized file/code/message diagnostics reproduced on untouched effective base 28ab6ea; no new normalized diagnostics. Mostly existing TS/JS inference and soundtrack nullability. Build success is not typecheck success.
- Scene budget test measures procedural geometry counts under 35 meshes / 20k instanced triangles, not GPU FPS. No private payload was available for GLB composition, Meshopt/Draco/KTX2 or cold/warm-load benchmarks. Canonical remains 39,487,548 bytes. No performance percentage claimed.
- Local browser attempt: cloud-browser localhost request failed ERR_CONNECTION_REFUSED (different browser host); native desktop input failed with unavailable AT-SPI provider. No fake screenshot or visual approval. Hosted Access QA, physical Samsung Internet, actual context restoration, facial/clothing inspection and source floor traces remain NOT_RUN.

## Remaining acceptance checklist

- [ ] Complete normal authorized login and show Hsin + Shorekeeper together in private laboratory; record manifest/API/parse/first frame independently.
- [ ] Inspect garden and both performers at 1280×720, 390×844, 832×384, plus Samsung Internet on physical Android.
- [ ] Play at least three real seven-segment G11.3 cycles; inspect returned `duetCinematic.occupancy` and trace; resolve real floor exits if measured. Inspect cloth, hair, hands, all facial states and interludes.
- [ ] Verify camera user takeovers and return, pinch/pan, native player exclusions, context loss/restore and repeated disposal in actual WebGL.
- [ ] Benchmark canonical bytes and decoded contents before separate derivative compression experiments. Preserve all morphs/rig/material/animation identities and visual fidelity.
- [ ] Independently address inherited typecheck debt before claiming full technical readiness.
- [ ] Rights/provenance approval plus release pin/configuration/anonymous QA before any public character distribution. Scenery fallback does not grant those rights.

Do not merge. The actual garden and loading corrections are delivered; full technical completion cannot be claimed until the authorized Shorekeeper session succeeds.
