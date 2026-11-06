# Shorekeeper S6-B — G11.3 × G7 convergence (QA only)
Status: S6B_PARTIAL. Source: S5/R6.2.3 @ 5380f43533ac5db455f6d5a057fac5764dcd8a7c.
G11.3's accepted VFX and camera are already integrated in S5. Never reimport or change effects merely for style. G7 remains NO_GO and S4 deferred (legacy R6 facial).
S6-A's original mechanical tool measures buildInspectableCombo (lab schedule). The new s5-seams tool measures buildR61Plan (the S5 runtime schedule): seven original source IDs, six joins, 30/60 Hz. Its REBASED and ROOT_BODY_OWNED variants are diagnostic only.
Local tests: node --test .qa-s6b/g7/*.test.mjs
Public CI also runs all Shorekeeper tests, all Node tests, npm run check and npm run build. Synthetic tests are NOT source parity or visual approval.
Private authorized kit (outside Git): shorekeeper-f20a.glb, basic.glb, advanced.glb, burst.glb, expected.json. Run:
node .qa-s6b/g7/run-private-s5.mjs /outside-git/private-kit /outside-git/s6b-evidence
The runner verifies file bytes and SHA-256 BEFORE parsing and writes private numeric outputs exclusively outside Git. No tokens, screenshots, GLBs or private sources shall enter a commit. Access must not be bypassed.
No merge, production, DNS/Worker/Access/R2 changes, force-push, change to draft PR #256, or release authorization.