# R6.5 validation results

- Reference HEAD matched `b0a0b9cf8603bd365dda5b7130b8061e5b04c3e9`; PR #260 open/draft, base #259 unchanged.
- `npm ci --ignore-scripts`: PASS, 207 packages.
- `npm run check`: PASS (UX/API/Tetris/music/Hsin/Sophia/performance/private-R2 checks).
- `node --test tests/shorekeeper-r6*.test.mjs tests/shorekeeper-combo*.test.mjs`: 103/103 PASS, including six new R6.5 runtime tests.
- `npm run build`: PASS, 8 routes, OG and build hygiene passed.
- `git diff --check`: PASS.
- First focused run hit a source-text regex after a redundant reduced-motion condition was added. The music condition was restored; reduced motion already has its own preceding interruption. Subsequent full focused run passed.
- Old closure first-frame `VFX_UNAVAILABLE`: REPRODUCED using real integration classes with synthetic bone rig. Stable lease: seven segments, three cycles PASS on synthetic sources.
- Camera envelope tests: PASS at requested aspects, synthetic actor bounds. Visual composition: NOT_RUN.
- Authenticated hosted scene: BLOCKED_BY_ACCESS_SIGN_IN in the Work browser; no active session. Not classified as bot detection or Sophia/renderer failure.
- Actual private clip inventory/keyframe/foot-contact traces: NOT_RUN. Capture hooks shipped; no fabricated source results.
- Physical Samsung Internet/Android: NOT_RUN. WebGL context restoration on actual duet: NOT_RUN.
- Shared Stellarealm rendered containment, widget occlusion, moon photographic composition, prolonged real playback, GPU/FPS/VRAM: NOT_RUN.

Overall: PARTIAL; source-runtime interruption fixed, source visual/locomotion acceptance remains open. Synthetic trace is marked as such.
