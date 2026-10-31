# Hsin 1.1.0 — reversible acting study

This branch contains code only. Load a permitted GLB locally in the author lab. Nothing selects, ships, or fetches the Hsin asset; no public character presentation is implemented. The existing 1.0.8/1.0.9 CCD solver and target-selection workflow remain the baseline.

## What can be tested

After loading the GLB and explicitly picking a lip target, the author can start or stop a diagnostic loop in the lab. A deterministic director runs idle → anticipation → gesture → hold → release → idle. The gesture and release still use the existing 1.0.9 solver and motions. Anticipation is a timed pause, not a new body pose. The idle interval is seeded and bounded. The loop stops and restores on manual stop; it pauses when hidden, offscreen or context is lost. Reduced motion prevents starting and stops the loop if the preference changes.

The optional author-lab “Trajetória espacial CCD” samples `sampleGestureArc` and runs the existing CCD from rest at each waypoint. It preserves the solved endpoint on the synthetic rig, but is not proven stable on Hsin or Android. The pure `solveTwoLink` pole geometry remains an isolated study: it is **not wired to the Hsin arm**. Neither study solves wrist orientation independently or implements collision; neither has been validated with real bone axes. A spatial arc or a pole-stable movement on Hsin must not be claimed on this basis. In particular, applying their result requires an explicitly audited adapter for ORG drivers and parallel DEF deformers and visual tests against the existing endpoint. Do not map these bones onto another character.

## Rig adapter contract for future work

A character-specific adapter should resolve unique named joints and hierarchy, expose rest-local transforms and world positions, provide a verified fingertip and lip target, define tested local limits and pole orientation, synchronize only its own audited deformers, restore the rest state, and report solver error. An adapter must fail closed on missing/ambiguous names. The current Hsin CCD helper already performs alias and hierarchy checks but is not a generalized adapter. Morph targets and geometry ownership must remain with the calling scene. No automatic anatomical axes are inferred from names.

## Gates

- Production build and synthetic solver/director/legacy tests: run locally and report results in PR.
- Browser GLB import, animation comparison, contact, elbow stability and collision: pending real private browser QA.
- Autonomous presentation without author controls: not implemented; requires a permitted asset provider and validated, non-interactive contact landmark. No asset may be made public by this study.
- Android FPS, GPU memory, accessibility and Cloudflare preview: not measured by unit tests.
