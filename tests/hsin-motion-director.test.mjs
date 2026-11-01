import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createFacialActing} from '../src/scripts/hsin-face-acting.mjs';
import {createAttentionDirector} from '../src/scripts/hsin-face-pass-b.mjs';
import {PRESENTATION_ATTENTION} from '../src/scripts/hsin-face-presentation.mjs';
import {createAutoB1Director, WINK_SUPPORT_SMILE} from '../src/scripts/hsin-iconic-expressions.mjs';
import {createPathTiming} from '../src/scripts/hsin-path-timing.mjs';
import {PASS_B_NAMES, PASS_B1_EXTRA_NAMES} from '../src/scripts/hsin-face-morph-audit.mjs';

/* Pure logic only: no model, no THREE, no renderer. Visual quality is NOT covered here (see docs/hsin-motion-director-audit.md). */
const DT = 1 / 60;
const limits = Object.fromEntries([...PASS_B_NAMES, ...PASS_B1_EXTRA_NAMES].map((n) => [n, .12]));
const SEEDS = [101, 108, 115, 122, 129, 136, 143, 150];
const percentile = (values, p) => { const s = [...values].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

// ---------------------------------------------------------------------------------------------
// 1. Legacy passes must stay byte-for-byte equivalent. Hashes were produced by the code at 39bc2c3.
// ---------------------------------------------------------------------------------------------
{
  const legacyLimits = Object.fromEntries(['M_Smile_R', 'M_Smile_L', 'E_Smile_R', 'E_Smile_L', 'E_Squint_R', 'E_Squint_L', 'B_Up_Add_R', 'B_Up_Add_L', 'P_Nose_Up'].map((n) => [n, .12]));
  const r = (n) => Math.round(n * 1e6) / 1e6;
  const run = (pass, seed) => {
    const face = createFacialActing({pass, seed, intensity: .55, morphLimits: legacyLimits});
    const events = [], samples = [];
    let prev = null;
    for (let i = 0; i < 60 * 300; i++) {
      if (i % 90 === 0) face.attention([.8, .1, 0], 1.3);
      const s = face.advance(1 / 60);
      if (s.event !== prev) { events.push([r(s.clock), s.event]); prev = s.event; }
      if (i % 30 === 0) samples.push([r(s.closeR), r(s.closeL), r(s.smileR), r(s.smileL), ...s.gaze.map(r)]);
    }
    return createHash('sha256').update(JSON.stringify({events, samples})).digest('hex');
  };
  const golden = {
    'a:7': 'd40be0c298763890d0cf2a611b7205e3310629d96557136d8594490bbabcc882',
    'a:2718': '6f19dda642f13c8f397133c0f8549bf353bb66643a49cc9111a5882bc86596a3',
    'b:7': '32edac5cd87ca222d14b9e725a16bd20479033c9d9d8a1b36cbd1297773a16e9',
    'b:2718': 'dca216162bcc0ba3b13e5f69cf1e2b16d09e2a3cc377db645a4a02b96d2b9afc',
  };
  for (const [key, expected] of Object.entries(golden)) {
    const [pass, seed] = key.split(':');
    assert.equal(run(pass, Number(seed)), expected, `legacy pass ${key} changed`);
  }
}

// ---------------------------------------------------------------------------------------------
// 2. Path timing: same poses and waypoint times, no stop at interior waypoints.
// ---------------------------------------------------------------------------------------------
{
  const times = [0, .28, .68, 1], lengths = [1, 1.4, .9];
  const timing = createPathTiming(times, lengths);
  const total = lengths.reduce((a, b) => a + b, 0);
  const position = (t) => { const {index, mix} = timing.sample(t); return (lengths.slice(0, index).reduce((a, b) => a + b, 0) + mix * lengths[index]) / total; };
  // Waypoints are reached exactly at their authored times.
  [[.28, lengths[0] / total], [.68, (lengths[0] + lengths[1]) / total], [1, 1]].forEach(([t, s]) => assert.ok(Math.abs(position(t) - s) < 1e-9, `knot ${t}`));
  // Restoration is exact at both ends: t=0 is the base pose and t=1 the final pose (no rounding in the blend).
  assert.deepEqual(timing.sample(0), {index: 0, mix: 0});
  assert.deepEqual(timing.sample(1), {index: 2, mix: 1});
  // Scalar speed continuity only. Per-joint angular velocity is NOT covered by this module (see the audit).
  // Monotone: the arm never reverses along the path.
  let last = -1;
  for (let i = 0; i <= 2000; i++) { const p = position(i / 2000); assert.ok(p >= last - 1e-12, 'path progress must not go backwards'); last = p; }
  // The old scheme (quintic per segment) has exactly zero speed at both interior waypoints; the new one does not.
  const oldSpeed = (u) => 30 * u * u * (1 - u) * (1 - u);
  assert.equal(oldSpeed(0), 0);
  assert.equal(oldSpeed(1), 0);
  const mean = 1; // whole path per unit t
  for (const knot of [.28, .68]) {
    assert.ok(timing.speed(knot) > .5 * mean, `speed at waypoint ${knot} is ${timing.speed(knot)}`);
    assert.ok(Math.abs(timing.speed(knot - 1e-6) - timing.speed(knot + 1e-6)) < 1e-3, 'speed is continuous across a waypoint');
  }
  // Degenerate input must not throw or produce NaN.
  const flat = createPathTiming([0, .5, 1], [0, 0]);
  for (let i = 0; i <= 10; i++) { const s = flat.sample(i / 10); assert.ok(Number.isFinite(s.mix) && s.index >= 0 && s.index <= 1); }
  assert.throws(() => createPathTiming([0, .5], [1]), /span 0\.\.1/);
  assert.throws(() => createPathTiming([0, .5, .5, 1], [1, 1, 1]), /strictly/);
  assert.throws(() => createPathTiming([0, 1], [-1]), /non-negative/);
}

// ---------------------------------------------------------------------------------------------
// 3. Gaze: eye contact stays with a resting cursor; Pass B default behaviour is preserved.
// ---------------------------------------------------------------------------------------------
{
  const axes = {horizontal: [1, 0, 0], vertical: [0, 1, 0]};
  const trace = (timing, seconds, input, opts = {}) => {
    const a = createAttentionDirector({seed: 11, axes, timing});
    const states = [], values = [];
    let prev = '';
    for (let i = 0; i < seconds / DT; i++) {
      const v = a.step(DT, typeof input === 'function' ? input(i * DT) : input, opts);
      const st = a.state();
      if (st !== prev) { states.push([i * DT, st]); prev = st; }
      values.push([i * DT, v[0]]);
    }
    return {states, values, a};
  };

  // Resting cursor, presentation timing: after the first acquisition the eyes never pass through centre,
  // and every glance aside is followed directly by a return to the viewer.
  for (const seed of [3, 11, 29]) {
    const a = createAttentionDirector({seed, axes, timing: PRESENTATION_ATTENTION});
    let acquired = false, minAfter = Infinity, seq = [], prev = '';
    for (let i = 0; i < 90 / DT; i++) {
      const v = a.step(DT, [.2, 0, 0]);
      const st = a.state();
      if (st !== prev) { seq.push(st); prev = st; }
      if (st === 'hold') acquired = true;
      if (acquired) minAfter = Math.min(minAfter, Math.hypot(...v));
    }
    assert.ok(minAfter > .05, `seed ${seed}: eyes went to centre (${minAfter}) with the viewer still present`);
    for (let i = 0; i < seq.length; i++) if (seq[i] === 'avert') assert.equal(seq[i + 1], 'acquire', 'a glance aside must return to the viewer');
    assert.ok(!seq.includes('return') && !seq.includes('neutral'), `seed ${seed}: unexpected ${seq.join('>')}`);
  }

  // Pass B default (no timing) keeps its old cycle: avert -> return -> neutral -> acquire.
  {
    const {states} = trace({}, 20, [.2, 0, 0]);
    const names = states.map(([, s]) => s);
    assert.ok(names.join('>').includes('avert>return>neutral>acquire'), names.join('>'));
  }

  // When the viewer leaves, the eyes do return to centre within retainOnLeave + returning.
  {
    const {values} = trace(PRESENTATION_ATTENTION, 12, (t) => (t < 5 ? [.2, 0, 0] : [0, 0, 0]));
    const settled = values.find(([t, v]) => t > 5 && Math.abs(v) < .005);
    assert.ok(settled && settled[0] - 5 < 2.2, `eyes did not settle after the viewer left (${settled?.[0]})`);
  }

  // Slow drift of the cursor (inside the re-acquire threshold) is followed with lag instead of ignored.
  {
    const {values} = trace(PRESENTATION_ATTENTION, 14, (t) => [.15 + Math.min(.05, Math.max(0, (t - 3) * .01)), 0, 0]);
    const end = values.at(-1)[1];
    assert.ok(Math.abs(end - .2) < .02, `gaze ended at ${end}, expected to follow the drifting cursor to .2`);
  }

  // A move of .09 is below the old .12 threshold but above the presentation one. Measured at 2.4 s, before the
  // shortest hold (2.6 s) can expire, so the end-of-hold glance cannot mask the threshold.
  {
    const probe = (timing) => {
      const a = createAttentionDirector({seed: 5, axes, timing});
      let value = 0;
      for (let i = 0; i < 2.4 / DT; i++) value = a.step(DT, i * DT < 1 ? [.1, 0, 0] : [.19, 0, 0])[0];
      return value;
    };
    assert.ok(probe(PRESENTATION_ATTENTION) > .15, 'presentation gaze should follow a .09 shift');
    assert.ok(probe({...PRESENTATION_ATTENTION, reacquireDistance: .12, pursuit: 0}) < .13, 'with the old threshold the same shift is ignored');
  }

  // Calm contexts hold eye contact longer; occasional long stares keep the cadence irregular.
  {
    const holds = (calm) => {
      const out = [];
      for (let seed = 1; seed <= 40; seed++) {
        const a = createAttentionDirector({seed, axes, timing: PRESENTATION_ATTENTION});
        let start = null;
        for (let i = 0; i < 60 / DT; i++) {
          a.step(DT, [.2, 0, 0], {calm});
          const st = a.state();
          if (st === 'hold' && start === null) start = i * DT;
          if (st !== 'hold' && start !== null) { out.push(i * DT - start); start = null; }
        }
      }
      return out;
    };
    const normal = holds(false), calm = holds(true);
    const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    assert.ok(avg(calm) > 1.5 * avg(normal), `calm holds ${avg(calm).toFixed(2)}s vs normal ${avg(normal).toFixed(2)}s`);
    assert.ok(Math.max(...normal) > 5.5, 'long stares exist');
    assert.ok(Math.max(...normal) < 4.1 * 1.8 + .6, 'long stares stay bounded');
  }
}

// ---------------------------------------------------------------------------------------------
// 4. Eyelid arbiter and intent.
// ---------------------------------------------------------------------------------------------
{
  const collect = (seed, seconds = 600) => {
    const face = createFacialActing({pass: 'auto-b1', seed, intensity: .75, morphLimits: limits});
    const events = [];
    let current = null, lastEnd = null;
    for (let i = 0; i < seconds / DT; i++) {
      if (i < seconds / 2 / DT) face.attention([.9, 0, 0], 1.3);
      const s = face.advance(DT);
      if (s.event === 'blink') assert.equal(s.closeR, s.closeL, 'blinks stay bilateral');
      if (s.event === 'wink') assert.equal(s.closeL, 0);
      if (s.event === 'wink-left') assert.equal(s.closeR, 0);
      if (s.event && !current) {
        current = {kind: s.event, start: s.clock, smile: s.smileR, origin: face.diagnostics().event.origin, gap: lastEnd === null ? Infinity : s.clock - lastEnd};
        events.push(current);
      } else if (!s.event && current) { lastEnd = s.clock; current = null; }
    }
    return events;
  };
  const all = SEEDS.flatMap((seed) => collect(seed));
  const blinks = all.filter((e) => e.kind === 'blink'), winks = all.filter((e) => e.kind !== 'blink');
  assert.ok(Math.min(...all.map((e) => e.gap)) >= 1.8, `lid events must be at least 1.8 s apart (got ${Math.min(...all.map((e) => e.gap))})`);
  assert.ok(winks.length > 20 && blinks.length > 200);
  assert.ok(winks.every((e) => e.smile >= WINK_SUPPORT_SMILE), 'every automatic wink needs a smile that supports it');
  assert.ok(blinks.length > 4 * winks.length, 'winks stay much rarer than blinks');
  // Blink spacing stays near the preferred 5-10 s; glance-linked blinks may come a little earlier but never in bursts.
  const intervals = SEEDS.flatMap((seed) => { const b = collect(seed).filter((e) => e.kind === 'blink'); return b.slice(1).map((e, i) => e.start - b[i].start); });
  assert.ok(Math.min(...intervals) >= 3, `shortest blink interval ${Math.min(...intervals)}`);
  const median = percentile(intervals, .5);
  assert.ok(median >= 6 && median <= 10, `median blink interval ${median}`);
  assert.ok(blinks.some((e) => e.origin === 'saccade') && blinks.some((e) => e.origin === 'calendar'), 'blinks come from both the calendar and glances');
  assert.ok(winks.some((e) => e.origin === 'calendar') && winks.some((e) => e.origin === 'expression'), 'winks come from the calendar and from a playful expression');
  // Reproducible for QA.
  assert.deepEqual(collect(101, 120), collect(101, 120));
  assert.notDeepEqual(collect(101, 120), collect(102, 120));

  // The refractory period only governs automatic events: laboratory buttons still work immediately.
  const face = createFacialActing({pass: 'auto-b1', seed: 5, intensity: .75, morphLimits: limits});
  let guard = 0;
  while (!face.sample().event && guard++ < 60 * 60) face.advance(DT);
  while (face.sample().event) face.advance(DT);
  assert.equal(face.trigger('wink', 'manual'), true, 'manual wink right after a blink must be allowed');
}

// ---------------------------------------------------------------------------------------------
// 5. Director: weighted, cooled-down contexts; intent bridge; rare Quiet Intimacy.
// ---------------------------------------------------------------------------------------------
{
  const run = (seed, seconds = 1200) => {
    const face = createFacialActing({pass: 'auto-b1', seed, intensity: .75, morphLimits: limits});
    const share = new Map(), slots = [];
    let lastStarted = -1;
    for (let i = 0; i < seconds / DT; i++) {
      face.attention([.9, 0, 0], 1.3);
      const s = face.advance(DT);
      if (i % 6) continue;
      const d = face.diagnostics().expressions;
      share.set(d.context, (share.get(d.context) ?? 0) + 1);
      if (d.started !== lastStarted) { lastStarted = d.started; slots.push([s.clock, d.context]); }
    }
    return {share, slots};
  };
  const runs = SEEDS.map((seed) => run(seed));
  const total = new Map();
  for (const {share} of runs) for (const [k, v] of share) total.set(k, (total.get(k) ?? 0) + v);
  const sum = [...total.values()].reduce((a, b) => a + b, 0), frac = (k) => (total.get(k) ?? 0) / sum;
  assert.ok(frac('Curious Attention') < .5, 'a present viewer must not lock the face into Curious Attention');
  assert.ok(frac('Idle Allure') + frac('Curious Attention') >= .5, 'magnetic presence stays dominant');
  assert.ok(frac('Coy Response') <= .3, `Coy share ${frac('Coy Response')}`);
  assert.ok(frac('Quiet Intimacy') > .01 && frac('Quiet Intimacy') < .15, `Quiet share ${frac('Quiet Intimacy')} (rare, not absent)`);
  for (const {slots} of runs) {
    let run = 1, longest = 1;
    for (let i = 1; i < slots.length; i++) { run = slots[i][1] === slots[i - 1][1] ? run + 1 : 1; longest = Math.max(longest, run); }
    assert.ok(longest <= 9, `same context repeated ${longest} slots in a row`);
    const quiet = slots.filter(([, c]) => c === 'Quiet Intimacy').map(([t]) => t);
    for (let i = 1; i < quiet.length; i++) assert.ok(quiet[i] - quiet[i - 1] >= 70, 'Quiet Intimacy respects its 75 s cooldown');
  }

  // Intent bridge, unit level.
  const d = createAutoB1Director({seed: 9, limits});
  for (let i = 0; i < 60 * 30; i++) d.step(DT, {enabled: true, intensity: .75});
  const before = d.diagnostics();
  assert.equal(d.requestCoy(), true);
  assert.equal(d.requestCoy(), false, 'a pending request is not duplicated');
  assert.ok(d.diagnostics().next <= Math.max(before.time + 1.2, before.next) + 1e-9);
  // During a body gesture the request is remembered but does not hijack the warm expression.
  const g = createAutoB1Director({seed: 9, limits});
  g.step(.1, {enabled: true, intensity: .75});
  g.signal('gesture:prepare');
  const nextDuringGesture = g.diagnostics().next;
  assert.equal(g.requestCoy(), true);
  assert.equal(g.diagnostics().next, nextDuringGesture, 'request must not move the schedule during a gesture');
  assert.equal(g.supportsWink(), false, 'warm presence does not support a playful wink');
  assert.equal(g.diagnostics().context, 'Warm Presence');
}

console.log('Hsin motion director: legacy passes unchanged, gaze stays with the viewer, lid arbiter, intent-linked winks, director variety, path timing PASS');
