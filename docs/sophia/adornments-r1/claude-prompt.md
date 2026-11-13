# Claude Sonnet — SOPHIA Adornments R1.C / R1.D (only after Work source lock)

Repo `indiolibanes/portfolio`; base is a separately approved Work R1.A/B draft/head. Do not begin from the 6H archive alone. Read source-lock report, `asset-manifest.json`, `sockets.json`, GLB source hashes, contact/bone matrix and screenshots first.

## Goal
Integrate **verified** geometry without reconstructing Sophia or changing original rigging/identity. Start with a single optional authorial scene; retain every vector 2D fallback and route. Expand to `/curiosidades/`, `/404` and music only after the owner approves the pilot.

### Responsibilities
- Implement a small, typed accessory registry that maps verified mesh IDs to attachment bones/sockets and source SHA; no fuzzy guessing on nodes in production.
- Rigid props (Book/Pen/star/brooch/ear jewelry) follow existing bones. For a coat, use verified *skin weights* to original shoulder, forearm, spine and pelvis skeleton. Do not add an unrelated Tripo skeleton, new AnimationMixer, second RAF or cloth physics engine.
- No morphs are required for rigid accessories; corrective garment morphs are optional if shoulder/elbow collision tests prove the need. Keep face morphs untouched.
- Preserve material UVs/color; protect geometry ownership/dispose and skeleton cloning; use lazy load with visible fallback and pixel-sane responsive framing.
- Keep astronaut R3 47 animations, `/api/sophia/rocket`, keyboard controls, music, Access and 404 Tetris untouched.
- For the 404 lounge, never claim that the unrigged `sophia-7b-e1-latest.glb` has walk or independent arms; accept explicit NO_GO.

### Acceptance
Screenshots from the actual skinned GLB at 0°, 45°, 90°, 180°, 16:9 and 9:16. 3 s animation loops Write/idle/Wave, collision CSV, Node/TypeScript/build tests, memory and disposal after 10 cycles, Samsung Internet QA. Distinguish GPU from SwiftShader. Source access failures = `VISUAL_QA_BLOCKED`.
Return one draft PR, no merge. Do not expand to a multi-page replacement without approval.
