# HSIN — Motion Director Audit (2026-11-01)

Branch: `experiment/hsin-motion-director-2026-11-01` · base: `main` @ `39bc2c3` (merge of PR #162)
Status: **draft, not merged.** Visual approval is **pending a human with the private model** (see §8).

> Scope note. This audit was done in an environment without `three`, without the private `hsin-v.1.0.5.glb`
> and without a GPU/browser. Everything below that is labelled *measured* is a number from deterministic
> logic traces. Nothing in this document is a claim about how the character *looks*; that was not observed.

## 1. Genealogy of the work (PRs #153–#162)

| PR | Branch | What it contributed |
|----|--------|---------------------|
| #153 | `hsin-facial-acting-pass-a` | Pass A: blink/wink arbiter, pure facial clock. Legacy pass `a`. |
| #158 | `hsin-right-hand-chest` | Right-hand chest gesture; origin of `hsin-chest-gesture.mjs` (`85f3e62`). |
| #161 | `hsin-clean-presentation-left-clearance` | Presentation isolation, left-arm clearance guard (`cf5b710`). |
| #162 | `hsin-arm-choreography` | Candidate arm choreography: `3757696` (right signature), `79a11bb` (pose transition), `3edaa72` (chest). |
| #145–#152 | `hsin-107…110`, waypoint continuity | Finger gesture, sanitized bones, character acting, organic planning, waypoint continuity fix. |

**Best hand-under-chin gesture:** `src/scripts/hsin-right-signature.mjs` + `src/scripts/hsin-pose-transition.mjs`
(commits `3757696`, `79a11bb`). They are byte-identical to the approved reference and are pinned by sha256 in
`tests/hsin-clean-presentation.test.mjs`. **This branch does not touch them** (R6).

Anatomical side: the signature gesture is the rig's **right** arm (ORG-/DEF- Bip001 R-side bones), identified in
the rig code, not from screen position (R12). No hand swap was made.

## 2. Diagnosis (P0–P3)

| # | Pri | Location / module | Cause | Visual impact | Fix | Regression risk | Validation criterion | State |
|---|-----|-------------------|-------|---------------|-----|-----------------|----------------------|-------|
| 1 | P0 | Left arm path, `hsin-left-signature.mjs` / `hsin-arm-clearance.mjs` | Guard samples the front envelope (49 poses) but not forearm garment / hinge constraint; shortest-arc `orient()` has no hinge/twist | Suspected forearm/sleeve clipping and elbow pop mid-path | **Not implemented** | High (touches the approved arm) | Private-model clearance test + human review | **Open — blocked, needs GLB** |
| 2 | P1 | `hsin-face-pass-b.mjs` attention | Hold expiry always followed by `return` through centre; reacquire threshold `.12`/`.55 s` ignores small viewer drift | Eyes snap to centre ≈ every 5.5 s ("robotic tracking") | Glance returns to target, lagged pursuit, calm/long hold (presentation opt-in only) | Low: defaults reproduce Pass B | Trace: 0 centre visits per 2 min | Fixed (logic) |
| 3 | P1 | `hsin-face-acting.mjs` lid slot | Blink, wink and saccade events could be scheduled <1.5 s apart | Double-blinks / stutter | `lidFreeAt` gate (blink 2–3.2 s, wink 1.8–2.8 s) | Low | Trace: 0 gaps <1.5 s | Fixed (logic) |
| 4 | P1 | `hsin-face-acting.mjs` + `hsin-iconic-expressions.mjs` | Calendar winks fired on a barely-smiling face (56 %) | Reads as a twitch, not provocation | Winks require `smileR ≥ .28`; otherwise `requestCoy()` raises the smile first | Low | Trace: 0 weak-smile winks | Fixed (logic) |
| 5 | P1 | `hsin-iconic-expressions.mjs` director | Attended viewer locked the director on *Curious Attention* (100 %) | Face feels stuck in one mood | Weighted selection, per-context cooldowns, min dwell | Medium (taste) | Trace: no context >35 %; longest repeat 7 slots | Fixed (logic); taste pending |
| 6 | P2 | `hsin-chest-gesture.mjs` | Constant-speed segments between waypoints → stop-and-go | Mechanical, "robot arm" feel | `hsin-path-timing.mjs` monotone-cubic re-timing | Medium: **integration untested** (needs `three`) | Unit tests on timing module; private test | Implemented, partially verified |
| 7 | P2 | Presentation clean-up | Reviewed: `hidden` attributes, no technical controls | — | None needed | — | `hsin-clean-presentation.test.mjs` passes | No defect |
| 8 | P3 | Squint × blink overlap | Investigated | Not a defect | None | — | — | Closed |
| 9 | P3 | Head tilt, camera, lighting | Not assessable without rendering | — | Not done | — | Human visual review | **Open — blocked** |

## 3. What changed

* `src/scripts/hsin-face-pass-b.mjs` — attention director gains opt-in options (`glanceReturnsToTarget`,
  `reacquire*`, `pursuit`, `calmHoldScale`, `longHold*`) and a `state()` accessor. Defaults reproduce Pass B.
* `src/scripts/hsin-face-presentation.mjs` — the presentation policy enables those options.
* `src/scripts/hsin-face-acting.mjs` — presentation-only lid spacing, wink support gating, saccade-linked blinks.
* `src/scripts/hsin-iconic-expressions.mjs` — weighted autonomous director: *Magnetic Presence*
  (Idle Allure + Curious Attention) dominant, *Playful Provocation* (Coy Response) occasional,
  *Quiet Intimacy* rare with a 75 s cooldown and a longer eye-contact hold. A due wink asks for a playful
  context (`requestCoy`) instead of firing on a calm face; calm/reverent contexts are never cut short.
* `src/scripts/hsin-path-timing.mjs` — new pure module (monotone cubic re-timing).
* `src/scripts/hsin-chest-gesture.mjs` — uses the re-timing; falls back to the previous timing if the guard fails.
* `scripts/hsin-behavior-trace.mjs` — before/after trace script (below).
* `tests/hsin-motion-director.test.mjs` — new tests.

No morph amplitude limits were raised (R8). No body motion was added (R10). The private GLB is not in the repo (R3/R4).

## 4. Before / after (deterministic logic trace)

`node scripts/hsin-behavior-trace.mjs --baseline <dir with the 39bc2c3 modules>` — 30 seeds, dt = 1/60 s, pass `auto-b1`.

| Metric | Baseline `39bc2c3` | Candidate |
|--------|-------------------:|----------:|
| Time with eyes on a present viewer | 69.3 % | 94.8 % |
| Eye returns to centre per 2 min | 21.8 | 0 |
| Longest look-away from viewer | 2.63 s | 0.78 s |
| Blinks / min | 6.76 | 6.96 |
| Winks / min | 1.61 | 1.54 |
| Blink interval median (min / p10 / p90) | 8.27 (5.3 / 5.92 / 12.83) | 8.23 (3.42 / 5.67 / 12.28) |
| Lid events <1.5 s apart | 91 | 0 |
| Winks on weak smile | 269 / 482 | 0 / 461 |
| Glance-linked blinks | 0 | 418 |
| Context share (viewer present) | Curious Attention 100 % | Curious 34.5 · Idle Allure 28.5 · Coy 16.9 · Warm 12.6 · Quiet 7.5 |
| Longest run of same context (slots) | 99 | 7 |

Honest caveats: the minimum blink interval is now 3.42 s (glance-linked blinks); the median still sits in the
5–10 s window. Coy Response at 16.9 % with a viewer present is higher than "occasional" may deserve — it is a
tunable (`SELECTION`), and this is a taste decision for a human. Full output: `docs/hsin-motion-director-trace.txt`.

## 5. Tests

Executable here and passing: `hsin-b1-automation`, `hsin-clean-presentation`, `hsin-embedded-texture`,
`hsin-face-b1`, `hsin-pose-transition`, **`hsin-motion-director`** (new: legacy golden hashes for passes `a`/`b`
unchanged between baseline and candidate, path timing, gaze stays with the viewer, eyelid arbiter, wink/smile
link, director variety and cooldowns).

**Not executable here (R14):** 11 files fail at import with `Cannot find package 'three'` because the npm registry is
unreachable from this environment (`npm ci` → ENOTFOUND): `hsin-acting-director`, `hsin-arm-clearance`, `hsin-chest`,
`hsin-choreography-private`, `hsin-face-acting`, `hsin-face-pass-b`, `hsin-face-private`, `hsin-gesture-ik`,
`hsin-material-debug`, `hsin-presentation`, `hsin-waypoint-safety`. They were not run, so the chest-gesture
integration and the existing Pass A/B tests have **not** been verified against these edits. Mitigation: the legacy
passes are proven identical by golden hash, and the edits to shared modules are opt-in.

Requested categories not covered because they need the rig: arm independence, trajectory continuity on the real
skeleton, pose restoration, load/dispose lifecycle. The existing tests for those (above list) must be run in CI.

## 6. Not implemented (deliberately)

* Left-arm geometry fix (P0 #1): cannot be validated without GLB/`three`; changing an approved arm blind would
  violate R6/R9. Needs forearm/garment sampling in the clearance guard and a hinge/twist model in `orient()`.
* Head tilt, camera, lighting, art direction: need rendering.

## 7. Risks

* Chest-gesture re-timing is untested end-to-end.
* Eye-contact behaviour (94.8 % on viewer, long holds) may read as intense; calm/long-hold rates are tunable.
* Director weights are a taste choice.

## 8. Pending human review / verification protocol

1. `npm ci`, then run the full `tests/` suite in CI.
2. With the private GLB: `node tests/hsin-choreography-private.test.mjs /path/hsin-v.1.0.5.glb` and the face private test.
3. Record private screen captures (not committed) of: hand-under-chin signature (must be unchanged), chest gesture
   timing, 2 min of gaze with a cursor resting vs moving, a wink sequence. Compare with `main`.
4. Only then judge artistic approval (R15). No preview URL was confirmed for this commit.
