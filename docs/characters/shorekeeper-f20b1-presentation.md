# Shorekeeper F2.0-B.1 — My Star / Presentation Finish

Base: PR #200 (F2.0-B), head `14a6dd74eb69ea2bf94b826eb5f570cd717f6e9c`.
Branch: `experiment/shorekeeper-f20b1-my-star-butterflies-20261103`.
Status: **VISUAL_QA_PENDING**. The game cutscene and the user's observations inform the artistic direction, not verified frame-by-frame retargeting.

## Direction

- Preserve all three original one-shot idles, their timing, ownership, rig and secondary animation.
- Original Reference QA still exists in the acting mode dropdown; it disables the custom facial pass.
- The F2.0-B smile was hard to see (mouth ~0.22). The proposed smile uses 0.43–0.48 on the mouth and 0.28–0.31 on the eyes.
- The new **My Star** expression is a more legible, slightly asymmetric smile: M_Smile_L .58, M_Smile_R .63, E_Smile_L .34, E_Smile_R .38, B_Happy .23, E_Focus .14, Pupil_R .12.
- **Wonder** is a low-amplitude cutscene-inspired curiosity preset, not an extracted game animation.
- All facial presets automatically return to the neutral base; no neutral button is exposed to ordinary visitors.
- The 83 morph names/97 instances are otherwise unchanged; the facial pass only uses the 11 F2.0-B approved morph names. Head and neck TRS remain owned by the source idle.
- The scheduler now includes My Star and Wonder among intermittent expressions.
- The page auto-selects and starts the composed first idle in expressive mode if it finds all three private original idles and the visitor does not request reduced motion.

## Presentation-only simplification

The visible tabs are Presentation and Expressions (which points back to the curated presentation actions). The legacy rig and materials panes remain hidden in the DOM as internal compatibility anchors for the existing inspection runtime and tests; they are **not public menu choices**. Technical speed, Rib layer selection and transition timings are also hidden. Front/back/side buttons are removed, leaving ¾, Face and Recenter.

The original material is always selected; the DPR default is 2 with the existing 1.6M-pixel cap and 30-FPS limit, so maximum visual quality is bounded by device capabilities rather than forced at the expense of mobile stability. QA exports are retained in a collapsed diagnostics section.

Four decorative CSS butterflies float across the studio viewport, without textures, new GLTF data, external images, WebGL draw calls, or extra JS render loops. They do not represent official game VFX. `prefers-reduced-motion` disables them and suppresses automatic acting.

## Private model handling and credits

Canonical **local** filename suggestion: `PRIVATE_shorekeeper_f20b1_canonical.glb` (rename a validated F2.0-A private combined GLB without changing its bytes; retain its SHA-256 manifest). File bytes are **not** committed to GitHub or Cloudflare assets.

Original character and game: **KURO GAMES, Wuthering Waves**. Thanks to the game's creators and to the original preservation/animation-extraction community (including the supplied NekoPixil source package). This is independent fan engineering, not an officially endorsed release.

KURO GAMES' derivatives policy is not a blanket license for public distribution of extracted original 3D game assets. Keep GLBs, PSA, textures and other extracted files in the local/private workflow unless separate explicit authorization exists: https://wutheringwaves.kurogames.com/p/en/produce.html

## QA

Unit checks cover numerical smile/wonder amplitude, finite morph weights and return to neutral. Browser WebGL2 and Samsung Internet visual inspection are still required, particularly to evaluate mouth/iris/eyelashes from the ¾ and Face cameras. Adjust the proposed weights only after inspection and keep Reference QA unchanged.

No main-branch modifications or automatic merges.
