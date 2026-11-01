# Hsin — Facial Acting Pass A

The author lab starts a deterministic facial candidate after local model selection. The initial expression of each skinned primitive is captured exactly; manual expression edits relinquish automatic ownership and restore this captured reference first. The original file, materials, bones and body animation are untouched. No asset, texture or private render is part of this change.

## Channels and timing

`hsin-face-acting.mjs` is a pure clock with a seeded PRNG. A single eyelid arbiter schedules either a bilateral blink or a right-side wink, never both. Blink closing takes 75–105 ms, holding 22–42 ms and opening 145–205 ms. Winks close in 120 ms, hold 160–240 ms and open in 240–320 ms. Blinks are scheduled about 3.4–7.8 seconds apart after an eye event completes; winks have longer 18–32 second intervals. These are initial tuning parameters, not an artistic approval.

The mouth channel adds a slow overlay up to 0.10 of the right smile's available headroom and 18% of that to the left. It owns `M_Smile_R/L` only. The eyelid channel owns `E_Close_R/L`. Pupil controls are a third independent channel. All other targets keep their exact captured values. No new jaw, head or gaze bones are animated. Stop freezes the current face; explicit Restore restores the full captured arrays without rounding.

## Measured gaze binding

`hsin-face-rig.mjs` measures up to 64 meaningfully displaced vertices per available pupil target through `getVertexPosition`, including the existing skinning. It transforms the displacement into the actual head's local coordinates, checks opposing direction pairs, and fails closed if controls or a unique head are absent or degenerate. No public per-character coordinate table is shipped. This runtime measurement is a geometric calibration, not proof of artistic gaze quality.

The cursor ray intersects a camera-facing plane through the measured eye center. The resulting offset is converted into the current head coordinate system and projected onto a tangent basis measured from the pupils. Opposing controls receive positive weights according to their measured displacement directions; screen-left is never equated with a particular named eye or In/Out. The attention radius derives from the measured inter-eye separation, with an 8% dead zone, 0.18 second exponential damping and a maximum gaze vector magnitude of 0.24. Returning to center snaps only numerical residuals below 1e-7 to zero. Touch-down supplies attention for 1.3 seconds of active scene time; touch-drag remains a camera gesture and does not continually renew the stimulus.

The supplied private v1.0.5 was checked with GLTFLoader in Node and placeholder images: all eight pupil directions were measurable, calibration preserved the complete initial weights, channel composition ran and exact restoration passed. This test does not decode or render the original textures and is not evidence of WebGL or Samsung Internet appearance.

## Session, author QA and local presentation

`hsin-face-session.mjs` owns the browser listeners and one rAF chain. Hidden/offscreen/context-loss states cancel its scheduled frame and suspend its clock; resuming starts with dt=0. Reduced motion suspends facial changes in the current state and starts a fresh model in its static reference. Dispose removes the pointer listeners and rAF. The session has no interval or remote endpoint.

The lab includes separate blink/wink tests, channel switches, pause/resume, exact Restore, diagnostics and a facial A/B toggle. A/B freezes the candidate and the existing body motion, then toggles between the full captured reference and frozen candidate in the same scene. The camera is left unchanged. Manual author expression edits restore the reference before changing a value; a subsequent Start captures the newly authored expression.

“Ver apresentação local” hides the author panels and all model/animation controls. Expressions continue autonomously; the visitor can orbit/drag and provide attention through the cursor or a temporary touch. Browser Back or Esc returns to the author lab. This mode uses the already locally selected GLB in memory; refreshing or visiting the public code does not download any protected character. There is no public model provider or rights grant implied by the preview. Reduced motion also applies in this view.

## Validation and acceptance

Run `node tests/hsin-face-acting.test.mjs`, the existing gesture/director tests, `npm run build` and `npm run check:ux`. An optional private geometry audit can be run as `node tests/hsin-face-private.test.mjs /path/to/permitted.glb`; it never fetches a model. Synthetic tests cover deterministic event timing, event exclusion, right-only wink, bounded gaze, camera-to-head rotation, unknown morph preservation, A/B, hidden/reduced-motion pause, touch expiry and disposal.

Visual gates remain PENDING until the candidate is observed on desktop and Samsung Internet with the actual local file. Use the same expression, framing, camera, material and lighting: isolate blink, then right wink, then smile, then gaze; finally enable all channels and compare A/B. Record front and oblique views. Confirm anatomical right, iris direction with camera orbit, eyelid closure without clipping, preservation of the approved mouth/eyelid expression, touch return and exact Restore. No FPS, GPU memory or artistic approval can be inferred from these tests.
