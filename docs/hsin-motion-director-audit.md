# HSIN — Motion Director Audit (2026-11-01)

Branch: `experiment/hsin-motion-director-2026-11-01` · base: `main` @ `39bc2c3` (merge of PR #162)
Status: **draft, not merged.** Revision 2 (regression fixes, see §9). Visual approval is **pending a human with the private model** (see §8).

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
| 3b | P0 (CI) | `hsin-face-acting.mjs` saccade-linked blink | Anticipation `clock >= nextBlink - 2` could fire a blink 3–5 s after the previous opening, below the 5 s presentation floor (CI: `blink gap 4.1166…`) | Blink rhythm breaks the 5–10 s contract | Gaze-linked anticipation also requires `clock >= lastOpenAt + 5` | Low: presentation-only | `tests/hsin-presentation.test.mjs` L19 | Fixed (rev. 2) |
| 4 | P1 | `hsin-face-acting.mjs` + `hsin-iconic-expressions.mjs` | Calendar winks fired on a barely-smiling face (56 %) | Reads as a twitch, not provocation | Winks require `smileR ≥ .28`; otherwise `requestCoy()` raises the smile first | Low | Trace: 0 weak-smile winks | Fixed (logic) |
| 4b | P1 (review) | `hsin-face-acting.mjs` calendar fallback | `clock >= winkFallback + 25` released a wink on a calm face after 25 s | Twitch on a calm face | Removed. Unsupported calendar wink is deferred (`winkFallback = clock + 2–5 s`) and `requestCoy()` is asked | Low | Trace: 0/473 weak-smile winks | Fixed (rev. 2) |
| 4c | P1 (review) | `hsin-face-acting.mjs` expression-linked wink | A one-frame smile wink requested inside the 22 s spacing window was dropped (267 of 280 dropped requests in a probe). Reduced expression-origin winks from 36/60 seeds at base to 20/60 at the earlier candidate; the presentation test assertion `some seeded winks follow an expression` depends on this | Expression-linked winks almost disappeared | Requests are held as pending until `nextWink`, lid free and smile still supporting; expire after `winkFallback + 1 s` | Low–medium: changes wink timing | Same script, seeds 1–60, 600 s each: base 36/60 seeds (52 winks); HEAD 20/60 (27); rev. 1 24/60 (29); rev. 2 60/60 (472) | Fixed (rev. 2) |
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
Output saved in `docs/hsin-motion-director-trace.txt` (rev. 2).

| Metric | Baseline `39bc2c3` | Candidate (rev. 2) |
|--------|-------------------:|----------:|
| Time with eyes on a present viewer | 69.3 % | 94.8 % |
| Eye returns to centre per 2 min | 21.8 | 0 |
| Longest look-away from viewer | 2.63 s | 0.83 s |
| Blinks / min | 6.76 | 6.89 |
| Winks / min | 1.61 | 1.58 |
| Blink interval, start to start (min / p10 / median / p90) | 5.3 / 5.92 / 8.27 / 12.83 | 5.32 / 5.82 / 8.18 / 12.68 |
| Lid events <1.5 s apart | 91 | 0 |
| Winks on weak smile | 269 / 482 | 0 / 473 |
| Glance-linked blinks | 0 | 328 |
| Context share (viewer present) | Curious Attention 100 % | Curious 34.9 · Idle Allure 27.8 · Coy 16.5 · Warm 11.8 · Quiet 9.0 |
| Longest run of same context (slots) | 99 | 5 |

Rev. 2 values replace the rev. 1 values (blink minimum 3.42 s, 418 glance-linked blinks), which broke the 5 s floor.

Caveats: the trace measures blink *starts*; the presentation test measures from the *previous opening*, which is what the CI assertion checks. Coy Response at 16.5 % with a viewer present is higher than "occasional" may deserve; it is a tunable (`SELECTION`) and a taste decision for a human.

## 5. Tests

Rev. 2 status is in §9. The list below is the state at rev. 1, kept for traceability.


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

## 9. Revision 2 — regression fixes (after CI failure on PR #163)

GitHub Actions `Hsin facial B.1 regressions` failed at `tests/hsin-presentation.test.mjs` L19 (`blink gap 4.116…`).
That is the first assertion in the file; the rest of the file never ran in CI, so later failures were hidden.

| Item | Change | Evidence here |
|------|--------|---------------|
| P0 blink gap | Gaze-linked blink anticipation respects `lastOpenAt + 5 s` (presentation only). Natural link between gaze and blink kept (328 glance-linked blinks / 600 s × 30 seeds). | Three-free harness: gaps 5.08–9.92 s over 79 blinks. Trace min 5.32 s. |
| P1 calendar fallback | `clock >= winkFallback + 25` removed. Unsupported calendar wink defers and asks `requestCoy()`. | Trace: 0/473 weak-smile winks. |
| P1 expression wink | Smile-linked wink requests are held as pending until `nextWink` instead of being dropped. | 60/60 seeds, 472 expression-origin winks. Base 52 expression-origin winks over 60 seeds × 10 min (see table in §4c). |
| Left/right alternation, single lid arbiter, manual lab | Unchanged. `automaticWink` now returns its result only. | Golden legacy hashes identical; manual `trigger` checks pass in harness. |
| P2 chest timing | No geometry, rig, sleeve or offset change. Guard already samples `apply()` after `path`/`timing` are set, so it checks the executed trajectory. Restoration endpoints now asserted exactly (`sample(0)` = base, `sample(1)` = final). | `tests/hsin-motion-director.test.mjs` §2. |
| Right hand | `hsin-right-signature.mjs` and `hsin-pose-transition.mjs` untouched (`git diff 39bc2c3 --` empty). | git diff |
| CI | `hsin-facial-b1-qa.yml` now runs `hsin-motion-director`, `hsin-arm-clearance`, `hsin-waypoint-safety`, `hsin-pose-transition`, `hsin-clean-presentation`, `hsin-embedded-texture`; path filter includes `src/scripts/hsin-*.mjs`. Private audits remain SKIP without a GLB path (exit 0). | YAML parses; CI run on push. |

### What is still NOT verified here

* `three` is not installable in this environment (`registry.npmjs.org` does not resolve; no cached copy). So **the full `tests/hsin-presentation.test.mjs` was not run**. Only its three-free part was run (blink gap, winks, manual lid), via a scratch harness outside the repo.
* The 11 `three`-dependent tests were not run here (see §5). CI is the first place they run.
* `npm run build` (Astro) was not run here (no `node_modules`). CI runs it.
* The per-joint angular velocity at each chest waypoint is **not** continuous. `hsin-path-timing.mjs` makes the *scalar* progress speed continuous, nothing more.
* Expression-wink timing changed (rev. 2 holds requests). Winks now arrive closer to `nextWink`; a human should judge whether this reads better.
* No visual QA. Nothing here approves the look of the character (R15).

Status of the PR: **kept open, not merged.** Merge waits for CI green and for human visual review of §8.


### CI status (commit `f827837`)

* `facial-regression` (GitHub Actions run 41323327828): **success**. Steps: `npm ci`, Pass A/B/B.1 and presentation suite (including `hsin-presentation` in full, with `three` installed by CI), IK/rig/arm/director regressions, Astro production build, UX contract.
* `Cloudflare Pages`: was still `in_progress` when last checked. No preview URL is confirmed for this commit.
* The earlier "not run" items in §9 are now run by CI, not by this environment. Visual QA is still pending (§8).
