// 404: the 3D Sophia (≈36 MiB of GLB + Three.js) must not even start loading on
// constrained devices (≤ 4 GB reported RAM, or Save-Data). Those keep the SVG
// illustrations and the 2D comedy, which are always available.
// Behavioural test of sophia-404-stage.js with stubbed browser globals.
// This is NOT a browser/network performance benchmark.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const stageUrl = new URL('../src/scripts/sophia-404-stage.js', import.meta.url).href;
let run = 0;

console.warn = () => {}; // the stage logs the expected import failure (no Three.js/WebGL in Node)
const setGlobal =(key, value) => Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function mountStage({ deviceMemory, saveData = false }) {
  const root = { dataset: {}, isConnected: true };
  const observers = [];
  setGlobal('IntersectionObserver', class { constructor(cb) { this.cb = cb; observers.push(this); } observe() {} disconnect() {} });
  setGlobal('MutationObserver', class { observe() {} });
  setGlobal('document', {
    hidden: false,
    documentElement: { dataset: { sophia404: 'loading' } },
    querySelectorAll: () => [root],
    addEventListener() {},
  });
  setGlobal('window', {
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
  });
  const nav = { connection: { saveData } };
  if (deviceMemory !== undefined) nav.deviceMemory = deviceMemory;
  setGlobal('navigator', nav);

  await import(`${stageUrl}?case=${run++}`);
  const initial = { ...root.dataset };
  observers[0].cb([{ target: root, isIntersecting: true }]);
  return { root, initial };
}

// "Attempted" = the dynamic import/mount ran and either finished or failed
// (here it fails fast: no Three.js/WebGL in Node), which flags sophiaFailed.
async function attempted(root, timeoutMs = 5000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (root.dataset.sophiaFailed === 'true' || root.dataset.sophiaLoading === undefined) return true;
    await wait(25);
  }
  return false;
}

for (const deviceMemory of [4, 2, 1, 0.5]) {
  const { root, initial } = await mountStage({ deviceMemory });
  assert.equal(initial.sophiaLoading, undefined, `${deviceMemory} GB: stage must not be marked as loading 3D`);
  await wait(300);
  assert.equal(root.dataset.sophiaFailed, undefined, `${deviceMemory} GB: renderer import must not be attempted`);
  assert.equal(root.dataset.sophiaLoading, undefined, `${deviceMemory} GB: still no 3D loading state after entering view`);
}

{
  const { root, initial } = await mountStage({ deviceMemory: 8, saveData: true });
  assert.equal(initial.sophiaLoading, undefined, 'Save-Data keeps skipping 3D (existing behaviour)');
  await wait(300);
  assert.equal(root.dataset.sophiaFailed, undefined, 'Save-Data: renderer import must not be attempted');
}

for (const deviceMemory of [8, undefined]) {
  const label = deviceMemory === undefined ? 'unknown RAM (Firefox/Safari)' : `${deviceMemory} GB`;
  const { root, initial } = await mountStage({ deviceMemory });
  assert.equal(initial.sophiaLoading, 'true', `${label}: 3D stays enabled`);
  assert.ok(await attempted(root), `${label}: renderer import is attempted when the stage enters view`);
}

// The inline script that flips <html data-sophia404="loading"> must use the same rule.
const page = readFileSync(new URL('../src/pages/404.astro', import.meta.url), 'utf8');
assert.match(page, /deviceMemory/, '404.astro inline gate must check navigator.deviceMemory');

console.log('PASS: 404 3D is skipped on ≤4 GB / Save-Data and kept elsewhere.');
process.exit(0);
