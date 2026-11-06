# S6B_R2_LIVE_QA
Status: AUTHENTICATED_BROWSER_QA_BLOCKED, not a demonstrated runtime failure.
The S6-A tests of synthetic Access contracts and unauthenticated HTTP headers do not establish authenticated R2 availability.
A valid owner session must confirm Cloudflare Access, exact R2 manifest inventory, SHA-256 and byte size before GLTF parsing, source IDs and browser load, in the authorized preview route tied to the candidate commit. Interpret 401/403 as denial, 503 as unconfigured and 404 as missing.
No Access bypass: no cookies, proxy, JWT extraction, CDP, alternative origin, direct R2 read or user-token reuse. No private asset, screenshot, sensitive manifest or raw provenance in Git.
Document privately the actual route/SHA, browser, real desktop GPU, physical Samsung, 600-second session, model orientation, memory, VFX, sourceFrame and library continuity. Until those observations exist: BLOCKED.
