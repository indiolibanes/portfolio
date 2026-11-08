# HSIN Combat R2.1.2 — consolidation and video QA

Base: main @ a5c49a29a4e5d8fa4018648a3b5e15398e9f4957 (which already contains unexpected merge PR #275).
Source of left elbow-plane adjustment: R2.1.1 PR #273 @ 507f85cd2708d200cb742ac60fc3f4cd25689ce4.
Do not revert or re-merge #275 automatically. The unmerged #273 remains a historical source; this new branch is independent and based on current main.

The only authored pose difference from main is three elbow pole vectors (L_NEAR, L_APEX, L_SETTLE); the baked asset and SHA manifest are taken from the passing R2.1.1 candidate. Current main's camera, facial recipe, VFX, collapsible panel, scene and other features remain unchanged.

The CI workflow regenerates the bake to confirm byte identity, tests real-GLB anatomy, acting and lab regressions, then produces exact-clock WebGL captures and two silent, continuous H.264 videos of the true 8.4-second animated GLB (not a slideshow):
- qa-video/hsin-combat-r212-landscape.mp4 — 960×540, 24 fps
- qa-video/hsin-combat-r212-portrait.mp4 — 540×960, 24 fps

They use a fixed 3/4 camera and software WebGL, not the public lab's automatic camera. They prove composition and visual continuity, never GPU performance. CI artifacts expire after 14 days; preserve accepted clips separately. Keep the 7-mesh/4-geometry/5-material effects budget without adding heavy field effects now.

Approval gates: (1) deterministic bake and CI; (2) side-by-side Basic 02 face clearance at 3.3–3.5 s; (3) Skill legibility, VFX envelope and camera framing; (4) direct Samsung Internet GPU testing including frame time, interrupts, restart, DPR and 10 cycles; (5) user artistic approval.

Experimental; PR stays draft; no merge to main, no GLB/skin-weight changes, no edits to public V2.0.1, Lunar Dance, Shorekeeper or Cloudflare Access.
