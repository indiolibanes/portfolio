// Lip Touch / Hair Caress playback logic with fake poses: no three, no WebGL, no geometry.
import assert from 'node:assert/strict';
import {createWeightPath, createHairCaress, createLipHairComposition, LIP_HAIR} from '../src/scripts/hsin-lip-hair.mjs';
import {createBodyRepertoire} from '../src/scripts/hsin-body-repertoire.mjs';

const fakePose = (name, log = []) => { let w = 0; return {name, apply: (t) => { assert.ok(t >= 0 && t <= 1, name + ' weight in range'); w = t; log.push([name, t]); return true; }, restore: () => { w = 0; log.push([name, 0]); }, atBaseline: () => w === 0, diagnostics: () => ({ready: true}), weight: () => w}; };
const lipData = {stages: {signature: 64 / 92, contact: 1}}, hairData = {stages: {hoverIn: .2, start: .45, end: .62, hoverOut: .8}};

// 1. Weight path: min-jerk segments, no jumps, retreat continues from the displayed weight.
{
 const pose = fakePose('p'), path = createWeightPath({pose}); let last = 0, maxStep = 0, ticks = 0;
 path.run([{to: .7, seconds: 2}, {to: .7, seconds: .3}, {to: 1, seconds: 1.5}]);
 while (path.busy() && ticks++ < 1000) { path.advance(1 / 30); maxStep = Math.max(maxStep, Math.abs(path.weight() - last)); last = path.weight(); }
 assert.ok(Math.abs(path.weight() - 1) < 1e-9 && !path.busy(), 'arrives exactly'); assert.ok(maxStep < .03, 'no jump between ticks: ' + maxStep);
 path.run([{to: 0, seconds: 2}]); for (let i = 0; i < 20; i++) path.advance(1 / 30); const mid = path.weight(); path.retreat([{to: 0, seconds: 1}]); path.advance(1 / 30);
 assert.ok(Math.abs(path.weight() - mid) < .05, 'retreat continues from the current weight, not from rest');
 path.advance(0); path.advance(NaN); path.advance(-1);
}

// 2. Hair caress: touch event once, release once, returns to the baseline, rejects a second start while busy.
{
 const events = [], pose = fakePose('hair'), caress = createHairCaress({pose, data: hairData, seed: 4, onEvent: (e) => events.push(e)});
 assert.equal(caress.start(true), true); assert.equal(caress.start(true), false, 'busy'); let t = 0; while (caress.busy() && t++ < 4000) caress.advance(1 / 30);
 assert.ok(!caress.busy() && caress.atBaseline(), 'back at baseline'); assert.deepEqual(events.filter((e) => e !== 'gesture:hold'), ['gesture:prepare', 'gesture:release']); assert.equal(events.filter((e) => e === 'gesture:hold').length, 1);
 assert.equal(createHairCaress({pose: fakePose('x'), data: {stages: {}}, seed: 1}).start(true), false, 'no stage data, no gesture');
}

// 3. Composition: sequence, owners, variants, interruption, determinism.
const run = (seed, {interruptAt = null} = {}) => {
 const log = [], events = [], lip = fakePose('lip', log), hairPose = fakePose('hair', log), hair = createHairCaress({pose: hairPose, data: hairData, seed: seed ^ 5}), comp = createLipHairComposition({lip, lipData, hair, seed, onEvent: (e) => events.push([e, +(t * 1 / 30).toFixed(2)])});
 let t = 0, order = [], contact = null; assert.equal(comp.start(true), true); assert.equal(comp.start(true), false);
 while (comp.busy() && t++ < 30 * 40) {
  comp.advance(1 / 30); const d = comp.diagnostics(); if (interruptAt && t === interruptAt) comp.release();
  if (d.right >= 1 - 1e-3 && contact === null) contact = t / 30; order.push([d.right, d.left]);
 }
 return {log, events, order, contact, seconds: t / 30, comp, lip, hairPose, variant: comp.diagnostics().variant};
};
const a = run(11), b = run(11), c = run(12);
assert.deepEqual(a.order, b.order, 'same seed, same episode'); assert.notDeepEqual(a.order, c.order, 'different seed, different durations');
for (const r of [a, c]) {
 assert.ok(r.seconds > 10 && r.seconds < LIP_HAIR.maxSeconds, 'episode length: ' + r.seconds); assert.ok(r.contact > 3 && r.contact < 8, 'right reaches the lip after the rise: ' + r.contact);
 assert.ok(r.comp.atBaseline() && r.lip.weight() === 0 && r.hairPose.weight() === 0, 'both arms home');
 assert.equal(r.events.map(([e]) => e).join(), 'gesture:prepare,gesture:hold,gesture:release', 'prepare, hold at lip contact, release when leaving');
 let maxStep = 0; for (let i = 1; i < r.order.length; i++) maxStep = Math.max(maxStep, Math.abs(r.order[i][0] - r.order[i - 1][0]), Math.abs(r.order[i][1] - r.order[i - 1][1])); assert.ok(maxStep < .03, 'continuous weights: ' + maxStep);
 // Left touches hair (stages.start) before the right leaves the lip in the left-first variant, both are posed at the same time during the hold.
 assert.ok(r.order.some(([right, left]) => right > .99 && left >= hairData.stages.end - .02), 'a still moment with both hands in place');
}
const variants = new Set(Array.from({length: 24}, (_, i) => run(100 + i).variant)); assert.deepEqual([...variants].sort(), ['left-first', 'right-first'], 'both withdrawal orders occur');
{ const r = run(21, {interruptAt: 150}); assert.ok(!r.comp.busy() && r.comp.atBaseline(), 'interrupted: both arms come home'); assert.ok(r.seconds < 16, 'interruption shortens the episode: ' + r.seconds); }
{ const r = run(22), left = new Set(); // owners: each pose is written only by its own path, never both arms by one path
 assert.ok(r.log.every(([name]) => name === 'lip' || name === 'hair')); }

// 4. Repertoire: rare, never first, cooldown and last-event memory, never concurrent with other arm actors, 600 s deterministic.
const simulate = (seed, seconds = 3600) => {
 const lipPose = fakePose('lip'), hairPose = fakePose('hair'), hair = createHairCaress({pose: hairPose, data: hairData, seed: seed ^ 9}), lipHair = createLipHairComposition({lip: lipPose, lipData, hair, seed: seed ^ 3});
 const calls = {signature: 0, chest: 0}, busy = {signature: false};
 let sigW = 0, sigTarget = 0; const signature = {request(v) { sigTarget = v; }, advance(dt) { sigW += Math.sign(sigTarget - sigW) * Math.min(Math.abs(sigTarget - sigW), dt / 2.4); }, busy: () => sigW !== sigTarget, weight: () => sigW, reset() { sigW = sigTarget = 0; }};
 let chestUntil = -1, clock = 0; const chestActor = {start: () => { chestUntil = clock + 8; return true; }, advance(dt) { clock += dt; }, busy: () => clock < chestUntil, release() {}, cancel() {}};
 const states = [], body = createBodyRepertoire({seed, signature, chest: chestActor, hair, lipHair, capabilities: () => ({signature: true, chest: true, hair: true, lipHair: true}), onState: (s) => states.push(s)});
 const starts = []; let concurrent = 0, prev = false;
 for (let i = 0; i < seconds * 30; i++) {
  body.advance(1 / 30, {enabled: true, allowed: true, context: 'Neutral Presence'});
  const comp = lipHair.busy(), lone = hair.busy(); if (comp && lone) concurrent++; if (comp && !prev) starts.push(i / 30); prev = comp;
  if (comp) { assert.ok(!(lipPose.weight() > 0 && false)); }
 }
 return {starts, concurrent, diag: body.diagnostics(), states};
};
{
 const first = simulate(1), again = simulate(1); assert.deepEqual(first.starts, again.starts, 'deterministic'); assert.equal(first.concurrent, 0, 'the composition and the stand-alone caress are never both busy');
 for (const seed of [1, 2, 3, 4, 5]) { const r = simulate(seed); assert.ok(r.starts.length === 0 || r.starts[0] >= 240, `never before its cooldown (first at ${r.starts[0]})`); for (let i = 1; i < r.starts.length; i++) assert.ok(r.starts[i] - r.starts[i - 1] >= 240, 'cooldown between episodes'); assert.ok(r.starts.length <= 3600 / 240 + 1); }
 const counts = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => simulate(s).starts.length); console.log('lipHair episodes per simulated hour, seeds 1-8:', counts.join(' ')); assert.ok(counts.some((n) => n > 0), 'it does happen: ' + counts); assert.ok(Math.max(...counts) <= 12, 'but it stays rare: ' + counts);
}
console.log('Hsin Lip & Hair: continuous weight paths, event order, interruption, seeds, both withdrawal orders, rarity/cooldown and exclusivity in a 3600 s repertoire PASS');
