import test from 'node:test';
import assert from 'node:assert/strict';
import { phases, mountLab } from '../src/scripts/sophia-lab-webp-r3.js';
function harness() {
  let requests = [], timers = new Map(), rafs = new Map(), next = 1;
  const image = { style: {}, src: 'still.png', addEventListener() {}, removeEventListener() {}, getAttribute() { return this.src; } };
  const el = { dataset: { still: 'still.png' }, querySelector: () => image, closest: () => null };
  class Image { set src(v) { this.url = v; requests.push(v); queueMicrotask(() => this.onload()); } get src() { return this.url; } decode() { return Promise.resolve(); } }
  const env = { Image, document: { hidden: false }, matchMedia: () => ({ matches: true }), performance: { now: () => 0 },
    setTimeout(fn) { const id = next++; timers.set(id, fn); return id; }, clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { const id = next++; rafs.set(id, fn); return id; }, cancelAnimationFrame(id) { rafs.delete(id); } };
  const reduce = { matches: false }, conn = { saveData: false };
  const c = mountLab(el, { reduce, conn }, env);
  return { c, env, requests, timers, rafs, image, reduce, conn };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('gates do not fetch animations; leaving the viewport cancels all work', async () => {
  const h = harness(); h.c.sync(); assert.equal(h.requests.length, 0);
  h.reduce.matches = true; h.c.visible(true); assert.equal(h.requests.length, 0);
  h.reduce.matches = false; h.conn.saveData = true; h.c.sync(); assert.equal(h.requests.length, 0);
  h.conn.saveData = false; h.c.sync(); await settle(); assert.equal(h.requests.length, 1);
  h.c.visible(false); assert.equal(h.timers.size, 0); assert.equal(h.rafs.size, 0); assert.equal(h.image.src, 'still.png');
});
test('stale image loads cannot restart after pause; hide and repeated sync do not duplicate timers', async () => {
  const h = harness(); h.c.visible(true); h.c.stop(); await settle(); assert.equal(h.timers.size, 0);
  h.c.sync(); await settle(); h.c.sync(); h.c.sync(); assert.equal(h.timers.size, 1);
  h.env.document.hidden = true; h.c.sync(); assert.equal(h.timers.size, 0); h.c.destroy();
});
test('one phase at a time, mobile resource, real turn files in both directions', async () => {
  const h = harness(); h.c.visible(true); await settle();
  for (let i = 0; i < phases.length; i++) {
    assert.match(h.requests.at(-1), new RegExp(`${phases[i][0]}-256-r3.webp$`));
    assert.equal(h.timers.size, 1);
    const [id, fn] = h.timers.entries().next().value; h.timers.delete(id); fn(); await settle();
  }
  assert.equal(phases.reduce((n, p) => n + p[1], 0), 16110); h.c.destroy();
});
test('failed fetch keeps the static fallback and stops the director', async () => {
  const h = harness(); h.env.Image = class { set src(v) { queueMicrotask(() => this.onerror()); } };
  h.c.visible(true); await settle(); assert.equal(h.image.src, 'still.png'); assert.equal(h.timers.size, 0);
});

test('published candidates match the manifest; source artifacts stay private', async () => {
  const { readFile, readdir } = await import('node:fs/promises');
  const { createHash } = await import('node:crypto');
  const root = new URL('../', import.meta.url);
  const manifest = JSON.parse(await readFile(new URL('docs/characters/sophia-lab-r3/assets-manifest.json', root)));
  const dir = new URL('public/assets/characters/sophia/lab/r3/', root);
  for (const row of manifest.filter(r => r.file)) {
    const bytes = await readFile(new URL(row.file, dir));
    assert.equal(bytes.length, row.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), row.sha256);
    if (row.file.includes('turn-')) assert.ok(bytes.length < (row.width === 235 ? 0.6 : 1) * 1024 * 1024);
  }
  assert.ok((await readdir(dir)).every(f => /\.(webp|png)$/.test(f)));
});
