# R6.5 — G11.3/S5 cinematic recovery (PR #260)

Reference: `b0a0b9cf8603bd365dda5b7130b8061e5b04c3e9`, stacked on #259. Date: 2026-11-07. Status: **PARTIAL — implementation tested, authenticated artistic/locomotion QA pending**. G7 stays NO_GO.

## Proven cause of the short motion

`startG113()` passed `getVfx:()=>nextVfx` to the director, then transferred ownership and set `nextVfx=null`. `createR62Cinematic.advance()` checks `getVfx()===sourceVfx` before consuming frame time. Therefore the very first normal frame interrupts the presentation with `VFX_UNAVAILABLE`, starts the sequencer's 0.45-second recovery and skips the attack/Skill/Burst sequence. Finding the integration call was insufficient: this closure invalidated its lifetime.

A regression test reproduces precisely that first-frame failure using the real R62/R5 classes and a synthetic bone rig. The corrected callback captures a stable `activeVfx` lease. A second test traverses all seven source windows for three complete cycles without termination; the trace is explicitly synthetic and contains no private assets.

## Proven snap paths and implemented handoff

Original idle disposal stops its mixer and restores its captured bone TRS. Combo construction/start applied its first source pose immediately (`entry:0`); trail/camera precomputation also sampled all poses. End-of-combo disposal similarly restores mixer baselines. These are synchronous pose changes before a new owner renders its entry, independent of a global `group.position` write.

Duet opts into pose-preserving exclusive ownership transfers and a 0.65-second entry. Sampling is restored to the captured entry pose before returning the new director. The combo and original idle retain their existing single-mixer/body ownership leases. Solo defaults stay unchanged. At natural completion, the duet waits for the 0.7-second camera return before disposing the integration, then blends to an original idle. Interruptions retain the short source-to-recovery transition and stop consuming the attack clock.

**This is a continuous pose handoff, not certified walking.** No verified locomotion source is available in this session. No fabricated walk, root-track rewrite or interpolated translation of a motionless group was added. Contact of both feet and long-distance preparation/return with the actual seven clips remains a blocking visual acceptance item. If authentic root motion does not provide the needed preparation, a separately verified locomotion/pose-contact solution is still required. Do not report this requirement as solved by the blend.

## Cinematography and Stellarealm

The duet previously set `camera:false`; the lab uses the R62 shot score. The duet now supplies a real adapter for the existing camera/OrbitControls. It retains R62's timeline, shot directions and lens changes and fits both actors' envelopes/bone anchors, including reserved NDC margins and the actual native player rectangle. It blends into the first shot, restores the saved orbit state, and resizes the camera-anchored monumental moon when the lens changes. No renderer, RAF, scene or body mixer is added.

The combined performers' envelope supplies a fixed shared arena anchor for the approved Liberation layer. The character-height VFX scale is no longer overwritten with the combined width: that would enlarge hand effects, trails and camera distances together. The field radius preserves the existing vast 8.6-height minimum and only expands if the shared static envelope requires it. The established blue/violet/gold, canopy, butterflies, absorption and dissolution score is reused. The model can move within the sources; dynamic containment and canopy/body visibility must still be inspected in rendering. Numeric bounds alone do not qualify them.

The moon attachment, size, elevation, single 3D pavilion/native player, 25 expression choices and R5 default mouth remain in place. No new player or obsolete facial selector is introduced. Their appearance during the new shots is pending authenticated QA.

## Music and lifecycle

Only `playbackConfirmed` from a recognized provider can request G11.3; checks remain before and after asynchronous library loading. Paused, ended, buffering, unavailable or absent music interrupt the active score and block new starts. Recovery uses the same stage clock; a second cycle waits for recovery and cooldown. Reduced motion and context loss request interruption. Context loss still suspends the existing stage loop; recovery resumes on restore. No provider autoplay or fabricated BPM synchronization.

Access/R2 manifest, size/header/full SHA-256 validation and private source paths are unchanged. Failure to prepare G11.3 now reaches a comprehensible status and diagnostic warning rather than silently hiding the cause. Missing sources never select another choreography.

## Diagnostics

Open the updated duet with `?r6Guest=1&hsin-metrics`, then inspect `window.__hsinMetrics.report().duetCinematic`. `clips` lists actual authenticated clip names, duration, track identifiers and key counts/time spans. `trace` is a bounded 10 Hz ring, enabled only with metrics: effective action times/weights, sequence clock/cue, Root/Pelvis/group world position/quaternion, camera and score/VFX probes. Source bytes, credentials and model geometry are not logged. Disable metrics for performance measurements after collecting traces.

`docs/qa/shorekeeper-r65/synthetic-trace.json` demonstrates the repaired lifetime through the real runtime on synthetic curves. It is not a trace of the private seven GLBs, not a video and not artistic approval.

## Validation performed

- New runtime tests: old closure failure, three full seven-source cycles, source clip immutability, exclusive idle/combo handoff without synchronous TRS jumps, pause/interruption recovery, both-actor camera fits at 1280×720, 390×844 and 832×384, provider state gating.
- Existing focused R6/combo regressions and `npm run check`.
- Production build, OG and build hygiene checks.
- Browser attempt on supplied deployment reached **Cloudflare Access sign-in**, not the scene. No authenticated private geometry/clips were obtained and no secret or bypass was used.

Exact command results are recorded in `docs/qa/shorekeeper-r65/results.md`.

## Required authenticated acceptance procedure

1. On the deployment for this commit, authenticate through normal Access. Use `?r6Guest=1&hsin-metrics`; enable the stage and select YouTube/Spotify through official controls. Confirm silence does not start G11.3.
2. Confirm the three Basic sources, L02 Heavy candidate, Skill01, Burst02 and recovery source have nonzero effective weights, changing local times and visible corresponding body poses. Record their actual durations, tracks, Root/Pelvis/group transforms and clip keyframes. Compare with `/experimentos/sk/?r61=1&r62=s5` on the same commit and same libraries.
3. Capture the preparation/entry, every transition, Burst and return. Check feet against the floor; reject sliding or an unmotivated world-space jump. The 0.65s handoff is not proof of locomotion.
4. Pause during Basic, Skill and Burst; test buffering, ended and resume. No new attacks in silence. Allow brief recovery. Watch at least three complete musical cycles.
5. In each requested viewport, verify Hsin remains inside the rendered field/canopy, both faces/hands stay framed, moon stays behind them and the one pavilion/player never overlays faces. Do not infer this from numeric camera/field tests.
6. Lose/restore WebGL through the browser's standard test extension when available. Check one existing loop/renderer, return to contemplation/restart, no duplicate mixers and Hsin solo unchanged. Verify failed libraries with a local test interception, never by weakening Access.
7. Record Samsung Internet on physical Android separately. This session did not test it. Measure CPU/GPU/VRAM/FPS and record actual device; build time and synthetic Node throughput are not device performance.

No merge, production change, GLB publication or G7 reopening is authorized or performed.
