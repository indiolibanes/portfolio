# HSIN — Facial Legibility Pass B.1

**Status:** DIAGNOSTIC_IMPLEMENTED / VISUAL_QA_PENDING / ART_DIRECTION_PENDING

**Base:** PR #155, `d41ac0035d6c2203abad9cee3caed2e63aa03f8d`.
**Model contract:** `hsin-v.1.0.5.glb`, expected SHA-256 `938a86162d5b431638ff46f2d30c78ecea74c95587835e1a8883e2b7f6c740fe` (not shipped in repo; not rehashed in this connector-only run).

## Code findings

Pass B's geometry audit assigns intentionally conservative candidate ceilings (typically 0.12 for mouth/brow, 0.08 for eye, 0.04 for nose). Its expression director multiplies a smile amplitude by 0.12 **before** `createFaceBinding` caps it again. That attenuation is a plausible cause of invisibility, but does not prove a visually legible outcome.

The B.1 implementation adds a *laboratory-only* diagnostic route that avoids the automatic ceiling while respecting normalized influence bounds [0, 1]. It leaves A, B and the default presentation's automatic policy unchanged. The isolated B.1 morph owner writes the snapshot-relative weights; every other channel is restored from the same immutable baseline on each frame.

## Candidate expressions

| Profile | Primary mouth R/L diagnostic weights | Secondary channels | Status |
|---|---:|---|---|
| S1 — Subtle Smirk | 0.32 / 0.06 | slight squint, brow and meow | VISUAL_PENDING |
| S2 — Playful Smirk | 0.58 / 0.14 | cheek/eye/brow support | VISUAL_PENDING |
| S3 — Signature Smile | 0.82 / 0.23 | stronger mouth, eyes and asymmetric brow | VISUAL_PENDING |

Weights are **diagnostic candidates**, not approved settings. The lab offers additional intensity factors 25%, 50% and 100%; the facial intensity slider also applies. Each test has a 0.55 s entry, 0.70 s hold and 0.85 s exit, with cancellation by profile switch, restore, page/model lifecycle and existing session disposal. At the end, the existing automatic baseline returns.

When a target is missing or degenerate in the active GLB it is omitted from the candidate; a completely missing mouth rejects the profile. Additional mouth controls `M_meow_R/L` and `M_Squint_R/L` are audited only when B.1 is selected, preserving the previous 12-row inventory for Pass B.

## Nasal policy

`P_Nose_Up` and `P_Nose_Down` can be tested separately through the existing isolated-morph selector while B.1 is active. Each receives the same explicit, full-range laboratory path. The audit reports affected region, skinned head-local displacement, sampled maximum, directional projection and overlaps. **No nasal target is used by the automatic B.1 director.** Inadequate movement or visible mesh deformation requires future Blender correction; do not simulate a result.

## Manual evaluation protocol

1. On Samsung Internet, open the branch Cloudflare preview once GitHub/Cloudflare reports success; choose the unmodified private GLB locally. Confirm checksum independently before use.
2. Select **Laboratório**, use fixed material, light and zoom; compare Pass B and Pass B.1 without changing camera. Select S1, then S2, then S3 and test each at 25%, 50%, 100%. Export user-owned captures at the same front, three-quarter and side orientations.
3. Select `P_Nose_Up` then `P_Nose_Down` with the isolated morph tester. Compare the same three angles. Inspect mouth, eyelashes, bangs, cheeks and any mesh tears. Keep nose disabled automatically absent explicit visual approval.
4. Repeat bilateral blinks, dual winks, cursor/touch attention, left-hand pose, full Restore, reduced-motion, visibility changes, context loss and reload. Confirm no drift, clipping or changed baseline weights. Verify the presentation contains no extra controls.
5. Approve **only** after actual screenshots/video and browser/performance measurements. CPU numeric tests are not a substitute for artistic QA.

## Test commands (to run in a checked-out Work environment)

```bash
npm ci
node tests/hsin-face-acting.test.mjs
node tests/hsin-face-pass-b.test.mjs
node tests/hsin-presentation.test.mjs
node tests/hsin-face-b1.test.mjs
node tests/hsin-gesture-ik.test.mjs
node tests/hsin-acting-director.test.mjs
npm run build
npm run check:ux
git diff --check
```

Test filenames for the gesture/director suite must be confirmed against the actual repository before treating that command block as an execution log. **Tests were added, not executed by this connector-only implementation.** CI status and Cloudflare deploy require independent confirmation.

## Boundaries

- Only source code, test, and documentation are committed. No GLB, textures, private art, extracted vertex data or character screenshots.
- The original GLB and the left/right bone chains are unchanged.
- The public presentation remains the PR #155 behavior. Pass C (right arm) is **not started** while B.1 visual and regression approval is pending.
- No merge into main. All changes belong to a stacked draft PR.
