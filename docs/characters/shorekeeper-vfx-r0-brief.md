# SHOREKEEPER VFX R0 — Butterflies · Stellarealm · Collapsed Core
**Status:** ASSETS_AND_PROMPT_PREPARED / NOT_IMPLEMENTED / VISUAL_QA_PENDING
**Route:** \`/experimentos/sk/\`. **Owner:** independent technical fan experiment. Wuthering Waves and Shorekeeper © KURO GAMES.

## Art direction
Original procedural reinterpretation, NOT a reconstruction extracted from the game. White-ice and pastel cyan butterflies with violet edges; sparse points of starlight and an expansive blue stellar domain; delicate constellation arcs and light from a Collapsed Core. Preserve Shorekeeper's calm celestial identity and legibility against silver hair and white clothing. Avoid saturated “generic BlueGPT” UI style, excessive particle glare or neon pollution.

## Scene graph and states
Use current Three.js scene, renderer and **one RAF loop**. Register a separate \`skVfxDirector\` responsible only for its own meshes, never rig bones, morphs, materials of the character or original AnimationMixer tracks. States:
\`OFF\` → \`PREPARE\` → \`BUTTERFLIES_AMBIENT\` → \`STELLAREALM_OPEN\` → \`RESONANCE_PEAK\` → \`RECOVER\` → \`OFF\`. Initial state OFF. Expose a manual QA trigger. No auto-synchronization to Burst01/02 until the correct original footage, event mapping and times have been independently verified.

Butterflies: instanced quads/small procedural meshes, phase-offset asymmetric wingbeats, gentle cubic splines, elliptical orbit and occasional roosting near the character. Do not rely on heavy physics or CPU per-wing draw calls.

Stellarealm: \`THREE.Points\` / lightweight \`BufferGeometry\` for a stable starfield; one translucent low-segment elliptical ring, subtle rising particles, and optional spatial warp through vertex motion rather than screen-space postprocessing. No heavy bloom composer, volumetric raymarching or multiple render targets.

Collapsed Core: 12–40 small motes arranged along a verified choreography envelope; introduce a subtle cyan-purple pulse and graceful fade/restitution. Show restraint: particle effects should illuminate a story, not hide the Shorekeeper.

## Hard performance and behavior constraints
- Mobile target: 8 butterflies, 110 stars, 12 motes. Desktop: 18 butterflies, 320 stars, 40 motes. Max additional draw calls approximately 8, ideally ≤ 3 on mobile.
- DPR capped at 2 and 3 million canvas pixels; existing user renderer quality settings win.
- Pause on document hidden, offscreen and WebGL context lost; honor prefers-reduced-motion (static or disabled VFX).
- Deterministic procedural seed; no allocations or network fetches each frame; dispose textures/materials/instanced geometries. Avoid external third-party bundles.
- Never modify the three approved idles, bilateral blink, ten combat clip sources, or the distinct Burst variants; do not modify Hsin, Phrolova, Sophia or unrelated site layout.
- Burst01 and Burst02 are still candidate Liberation animations, with CL.1 / CL.1.1 orientation QA pending. Do not claim canonical timing or camera until verified.

## Assets in this bundle
- \`public/assets/shorekeeper-vfx/butterfly-ice.svg\`: original ice-blue butterfly with transparent wings.
- \`public/assets/shorekeeper-vfx/butterfly-violet.svg\`: original violet-tinted butterfly.
- \`public/assets/shorekeeper-vfx/star-sprite.svg\`: original soft spectral star sprite.
- \`src/scripts/shorekeeper/vfx-presets.mjs\`: dormant VFX budgets, NO active effect code.

Asset hunt found the private \`T_StarrySkyNoise_D.png\` as a possible in-game mask, not a complete VFX system. **Do not upload or embed it.** These SVGs are newly authored and are not game files.

## QA and deliverables for the implementation PR
1. A/B capture of butterflies, constellation, and Stellarealm states in WebGL using the canonical local GLB with approved idles.
2. Independent manual test of original/rebased/ROOT_BODY_OWNED Burst variants with identical camera and explicit frame offsets; include first/peak/recovery.
3. 600 s deterministic test, offscreen/context-loss recovery, Android Samsung Internet, GPU draw-call and FPS instrumentation.
4. Source manifest, attribution text, permission guardrails, clear \`WEBGL_VISUAL_QA_PENDING\` if no browser verification.
5. PR draft independent of release, **no automatic merge**. No copyrighted GLB/PSA/textures/screenshots checked in.

**Credits and rights:** Wuthering Waves, Shorekeeper and original game effects © KURO GAMES; original code/effect reinterpretations are independent, unofficial. Attribution is not permission to redistribute extracted files. Guidelines: https://wutheringwaves.kurogames.com/p/en/produce.html

## Copyable implementation prompt
"Implement Shorekeeper VFX R1 in \`indiolibanes/portfolio\` at \`/experimentos/sk/\`, using this R0 package and the Three.js scene graph as the only authoring base. Create low-cost original procedural butterflies, Collapsed Core particles and an elegant starry Stellarealm, with a manual preview director separate from character animation. Protect the original 3 idles, bilateral wink/blink, all imported combat clips, original/rebased/root-body-owned Burst variants. Do not infer canon timings or redistribute copyrighted game shaders, textures, GLB or animations. Use no more than one existing render loop, cap mobile density, use InstancedMesh/Points, skip heavyweight post-FX, support reduced motion, cleanup and context loss. Keep the palette pale ice-cyan, white and soft violet, with a convincing nocturnal stellar atmosphere—not generic dashboard blue. Provide desktop and Samsung Internet QA images and reproducible metrics. Work in a new draft PR; do not merge without review."