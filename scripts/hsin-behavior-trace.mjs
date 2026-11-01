#!/usr/bin/env node
/**
 * Deterministic before/after behaviour trace for Hsin's facial acting logic.
 *
 *   node scripts/hsin-behavior-trace.mjs --baseline <dir with src/scripts of the old commit> [--json]
 *
 * Numbers only: no model, no render, no private asset. It measures *logic* (when the eyes
 * leave the viewer, how lid events are spaced, which contexts the director picks). It does
 * NOT measure how the face looks; that needs a human with the private GLB.
 */
import {pathToFileURL, fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const baselineDir = option('--baseline');
if (!baselineDir) { console.error('Missing --baseline <dir>'); process.exit(2); }

const load = (dir) => import(pathToFileURL(resolve(dir, 'src/scripts/hsin-face-acting.mjs')).href);
const {PASS_B_NAMES, PASS_B1_EXTRA_NAMES} = await import(pathToFileURL(resolve(root, 'src/scripts/hsin-face-morph-audit.mjs')).href);
const limits = Object.fromEntries([...PASS_B_NAMES, ...PASS_B1_EXTRA_NAMES].map((n) => [n, .12]));
const SEEDS = Array.from({length: 30}, (_, i) => 101 + i * 7);
const DT = 1 / 60;

const pct = (values, p) => { if (!values.length) return null; const s = [...values].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const round = (n, d = 2) => n === null || n === undefined ? null : Math.round(n * 10 ** d) / 10 ** d;
const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

/** A. The viewer's cursor rests inside the canvas, as the session refreshes it every frame. */
function stationaryCursor(factory) {
  const rows = [];
  for (const seed of SEEDS) {
    const face = factory({pass: 'auto-b1', seed, intensity: .75, morphLimits: limits});
    let onTarget = 0, total = 0, centreVisits = 0, wasCentred = false, offRun = 0, longestOff = 0, glances = 0, lastState = '', started = false;
    for (let i = 0; i < 120 / DT; i++) {
      face.attention([.9, 0, 0], 1.3);
      const s = face.advance(DT);
      const g = s.gaze[0], t = s.clock;
      const att = face.diagnostics().attention.state;
      if (att !== lastState) { if (att === 'avert') glances++; lastState = att; }
      if (t < 1) continue;
      started = true;
      const on = g >= .6 * .215, centred = Math.hypot(...s.gaze) < .03;
      total++; if (on) { onTarget++; offRun = 0; } else { offRun += DT; longestOff = Math.max(longestOff, offRun); }
      if (centred && !wasCentred) centreVisits++;
      wasCentred = centred;
    }
    rows.push({onTarget: onTarget / total, centreVisits, longestOff, glances: glances / 2});
    void started;
  }
  return {
    pctOnViewer: round(mean(rows.map((r) => r.onTarget)) * 100, 1),
    centreVisitsPer2min: round(mean(rows.map((r) => r.centreVisits)), 1),
    longestOffViewerSeconds: round(Math.max(...rows.map((r) => r.longestOff)), 2),
    glancesPer2min: round(mean(rows.map((r) => r.glances)), 1),
  };
}

/** B. Eyelid events over 10 minutes, cursor present for the first half. */
function lidEvents(factory) {
  let backToBack = 0, winks = 0, lowSmileWinks = 0, blinks = 0, saccade = 0, minGap = Infinity;
  const intervals = [];
  for (const seed of SEEDS) {
    const face = factory({pass: 'auto-b1', seed, intensity: .75, morphLimits: limits});
    let current = null, lastEnd = null, lastBlinkStart = null;
    for (let i = 0; i < 600 / DT; i++) {
      if (i < 300 / DT) face.attention([.9, 0, 0], 1.3);
      const s = face.advance(DT);
      if (s.event && !current) {
        const origin = face.diagnostics().event?.origin ?? 'n/a';
        current = {kind: s.event, start: s.clock, smile: s.smileR, origin};
        if (lastEnd !== null) { const gap = s.clock - lastEnd; minGap = Math.min(minGap, gap); if (gap < 1.5) backToBack++; }
        if (s.event === 'blink') { blinks++; if (origin === 'saccade') saccade++; if (lastBlinkStart !== null) intervals.push(s.clock - lastBlinkStart); lastBlinkStart = s.clock; }
        else { winks++; if (s.smileR < .28) lowSmileWinks++; }
      } else if (!s.event && current) { lastEnd = s.clock; current = null; }
    }
  }
  const minutes = SEEDS.length * 10;
  return {
    blinksPerMinute: round(blinks / minutes, 2), winksPerMinute: round(winks / minutes, 2),
    blinkIntervalSeconds: {min: round(Math.min(...intervals)), p10: round(pct(intervals, .1)), median: round(pct(intervals, .5)), p90: round(pct(intervals, .9))},
    eventsWithGapUnder1_5s: backToBack, smallestGapSeconds: round(minGap, 3),
    winksOnWeakSmile: `${lowSmileWinks}/${winks}`, saccadeLinkedBlinks: saccade,
  };
}

/** C. Director contexts with the cursor present the whole time (the worst case for lock-in). */
function directorContexts(factory) {
  const share = new Map(), runs = [], quietSlots = [];
  let slots = 0;
  for (const seed of SEEDS.slice(0, 20)) {
    const face = factory({pass: 'auto-b1', seed, intensity: .75, morphLimits: limits});
    // The baseline has no `started` field; it re-schedules only when it picks, so `next` is a valid slot marker there.
    let lastMark = -1, previous = '', run = 0, longest = 0;
    for (let i = 0; i < 1200 / DT; i++) {
      face.attention([.9, 0, 0], 1.3);
      const s = face.advance(DT);
      if (i % 6) continue;
      const d = face.diagnostics().expressions;
      share.set(d.context, (share.get(d.context) ?? 0) + 1);
      const mark = d.started ?? d.next;
      if (mark !== lastMark) {
        lastMark = mark; slots++;
        if (d.context === previous) run++; else { run = 1; previous = d.context; }
        longest = Math.max(longest, run);
        if (d.context === 'Quiet Intimacy') quietSlots.push(s.clock);
      }
    }
    runs.push(longest);
  }
  const total = [...share.values()].reduce((a, b) => a + b, 0);
  const spacing = []; for (let i = 1; i < quietSlots.length; i++) if (quietSlots[i] - quietSlots[i - 1] > 0 && quietSlots[i] - quietSlots[i - 1] < 1200) spacing.push(quietSlots[i] - quietSlots[i - 1]);
  return {
    contextShare: Object.fromEntries([...share].sort().map(([k, v]) => [k, round(v / total * 100, 1) + '%'])),
    longestRunOfSameContextInSlots: Math.max(...runs), slots,
  };
}

const result = {};
for (const [label, dir] of [['baseline', baselineDir], ['candidate', root]]) {
  const {createFacialActing} = await load(dir);
  result[label] = {stationaryCursor: stationaryCursor(createFacialActing), lidEvents: lidEvents(createFacialActing), directorContexts: directorContexts(createFacialActing)};
}
if (flag('--json')) console.log(JSON.stringify(result, null, 2));
else {
  const line = (title, a, b) => console.log(`${title.padEnd(44)} ${String(a).padEnd(26)} ${b}`);
  console.log(`seeds=${SEEDS.length}, dt=1/60 s, pass=auto-b1\n`);
  line('metric', 'baseline (39bc2c3)', 'candidate');
  const flat = (o, prefix = '') => Object.entries(o).flatMap(([k, v]) => v && typeof v === 'object' ? flat(v, prefix + k + '.') : [[prefix + k, v]]);
  for (const section of ['stationaryCursor', 'lidEvents', 'directorContexts']) {
    console.log(`\n[${section}]`);
    const a = Object.fromEntries(flat(result.baseline[section])), b = Object.fromEntries(flat(result.candidate[section]));
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) line(key, a[key] ?? '—', b[key] ?? '—');
  }
}
