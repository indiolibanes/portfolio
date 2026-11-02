// Stage instrumentation: zero effect when disabled, correct statistics when enabled. No three, no DOM.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createStageMetrics, metricsRequested, METRICS_FLAG} from '../src/scripts/hsin-stage-metrics.mjs';

let clock = 1000; const now = () => clock;
const off = createStageMetrics({enabled: false, now: () => { throw Error('the clock must not be read when disabled'); }});
off.mark('a'); off.sample('x', 5); off.frame(); off.gap(); off.count('contextLost'); assert.equal(off.now(), 0);
assert.deepEqual(off.report().timingsMs, {}); assert.deepEqual(off.report().milestonesMs, {}); assert.equal(off.report().counters.frames, 0);

const m = createStageMetrics({enabled: true, now, window: 8});
m.mark('start'); clock += 120; m.mark('glbParsed'); m.mark('glbParsed'); clock += 80; m.frame(); clock += 33; m.frame(); clock += 34; m.frame(); m.gap(); clock += 5000; m.frame(); clock += 33; m.frame();
const r = m.report();
assert.deepEqual(r.milestonesMs, {start: 0, glbParsed: 120, firstValidFrame: 200}, 'first occurrence only, relative to the first mark');
assert.equal(r.timingsMs.frameInterval.samples, 3, 'the gap (pause/hidden) is not a slow frame'); assert.ok(r.timingsMs.frameInterval.max <= 34);
for (let i = 0; i < 20; i++) m.sample('acting', i); const acting = m.report().timingsMs.acting;
assert.equal(acting.samples, 20); assert.equal(acting.max, 19); assert.ok(acting.p95 >= 12 && acting.p50 >= 12, 'percentiles come from the last window: ' + JSON.stringify(acting));
m.sample('bad', NaN); m.sample('bad', -1); assert.ok(!m.report().timingsMs.bad, 'invalid samples ignored');
m.count('contextLost'); m.count('contextRestored'); m.count('nonsense'); assert.deepEqual([m.report().counters.contextLost, m.report().counters.contextRestored], [1, 1]);
assert.equal(m.report({info: {render: {calls: 22, triangles: 120985}, memory: {geometries: 12, textures: 9}, programs: [1, 2]}}).renderer.calls, 22);
assert.ok(metricsRequested('?hsin-metrics') && metricsRequested('?a=1&hsin-metrics=1') && !metricsRequested('?metrics') && !metricsRequested('') && METRICS_FLAG === 'hsin-metrics');

// The public stage wires it opt-in: no UI, no timers, no second loop.
const stage = await readFile(new URL('../src/scripts/hsin-stage.ts', import.meta.url), 'utf8');
assert.ok(stage.includes("from './hsin-stage-metrics.mjs'") && stage.includes('metricsRequested(location.search)'), 'opt-in through the URL flag');
for (const mark of ['modelFetched', 'modelParsed', 'compiled']) assert.ok(stage.includes(`metrics.mark('${mark}')`), 'milestone ' + mark);
for (const name of ['acting', 'sceneUpdate', 'render']) assert.ok(stage.includes(`metrics.sample('${name}'`), 'timing ' + name);
assert.ok(stage.includes('window.__hsinMetrics') && /if\(metrics\.enabled\)/.test(stage), 'exposed only when enabled');
assert.equal((stage.match(/requestAnimationFrame/g) ?? []).length, 1, 'still one render loop, supplied to createStageLoop');
console.log('Hsin stage metrics: no-op when disabled, windowed percentiles, milestones, gaps excluded, opt-in wiring without UI or extra loop PASS');
