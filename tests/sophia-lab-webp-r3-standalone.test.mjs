import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { phases, mountLab } from '../src/scripts/sophia-lab-webp-r3.js';

const ROOT = new URL('../', import.meta.url);
const read = p => readFile(new URL(p, ROOT), 'utf8');
const later = () => new Promise(resolve => setImmediate(resolve));

function harness() {
  const requests = [], timers = new Map(), rafs = new Map(); let next = 1;
  const image = {
    src: 'still.png', style: {}, addEventListener() {}, removeEventListener() {},
    getAttribute() { return this.src; },
  };
  const el = { dataset: { still: 'still.png' }, querySelector: () => image, closest: () => null };
  class Image {
    set src(v) { this.url = v; requests.push(v); queueMicrotask(() => this.onload()); }
    get src() { return this.url; }
    decode() { return Promise.resolve(); }
  }
  const env = {
    Image, document: { hidden: false }, matchMedia: () => ({ matches: true }), performance: { now: () => 0 },
    setTimeout(fn) { const id = next++; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    requestAnimationFrame(fn) { const id = next++; rafs.set(id, fn); return id; },
    cancelAnimationFrame(id) { rafs.delete(id); },
  };
  const reduce = { matches: false }, conn = { saveData: false };
  return { ...{ image, el, env, reduce, conn, requests, timers, rafs }, controller: mountLab(el, { reduce, conn }, env) };
}

test('o laboratório público carrega PNG/WebP, nunca GLB/Three.js', async () => {
  const page = await read('src/pages/index.astro');
  const companion = page.slice(page.indexOf('<div class="lab-companion">'), page.indexOf('<nav class="work-index"'));
  assert.match(companion, /<SophiaLabWebP/);
  assert.doesNotMatch(companion, /SophiaAnimation|\.glb|<canvas|webgl/i);
  const component = await read('src/components/SophiaLabWebP.astro');
  const script = await read('src/scripts/sophia-lab-webp-r3.js');
  assert.match(component, /loading="lazy"/);
  assert.match(component, /IntersectionObserver/);
  assert.match(script, /\.webp/);
  assert.doesNotMatch(component + script, /import.*three|fetch.*\.glb|data-sophia-actor/i);
});

test('gates impedem tráfego em aba oculta, fora da viewport, reduced-motion e Save-Data', async () => {
  const h = harness(); h.controller.sync(); assert.equal(h.requests.length, 0);
  h.reduce.matches = true; h.controller.visible(true); assert.equal(h.requests.length, 0);
  h.reduce.matches = false; h.conn.saveData = true; h.controller.sync(); assert.equal(h.requests.length, 0);
  h.conn.saveData = false; h.controller.sync(); await later(); assert.equal(h.requests.length, 1);
  h.env.document.hidden = true; h.controller.sync(); assert.equal(h.timers.size, 0);
  assert.equal(h.image.src, 'still.png');
  h.controller.destroy();
});

test('o ciclo percorre todos os giros volumétricos sem precarga de toda a coleção', async () => {
  const h = harness(); h.controller.visible(true); await later();
  for (let i = 0; i < phases.length; i++) {
    assert.match(h.requests.at(-1), new RegExp(`${phases[i][0]}-256-r3\\.webp$`));
    assert.equal(h.requests.length, i + 1, 'somente uma animação solicitada por fase');
    assert.equal(h.timers.size, 1);
    const [id, cb] = h.timers.entries().next().value; h.timers.delete(id); cb(); await later();
  }
  assert.equal(phases.reduce((n, p) => n + p[1], 0), 16110);
  assert.ok(phases.some(p => p[0] === 'turn-ltr') && phases.some(p => p[0] === 'turn-rtl'));
  h.controller.visible(false); assert.equal(h.timers.size, 0); assert.equal(h.rafs.size, 0);
  h.controller.destroy();
});

test('falta de rede e downloads pendentes conservam a arte estática', async () => {
  const h = harness(); h.controller.visible(true); h.controller.stop(); await later();
  assert.equal(h.timers.size, 0);
  h.env.Image = class { set src(_) { queueMicrotask(() => this.onerror()); } };
  h.controller.visible(true); await later();
  assert.equal(h.image.src, 'still.png'); assert.equal(h.timers.size, 0);
  h.controller.destroy();
});

test('os 18 WebPs coincidem com o manifesto privado validado; fontes 3D não foram adicionadas', async () => {
  const manifest = JSON.parse(await read('docs/characters/sophia-lab-r3/assets-manifest.json'));
  const dir = new URL('public/assets/characters/sophia/lab/r3/', ROOT);
  const all = await readdir(dir);
  const webps = all.filter(n => n.endsWith('.webp'));
  assert.equal(webps.length, 18); assert.equal(all.filter(n => n.endsWith('.png')).length, 1);
  assert.ok(all.every(n => /\.(?:webp|png)$/.test(n)), 'nenhum GLB, blend, script ou material privado na pasta pública');
  for (const entry of manifest.filter(r => r.file && r.file.endsWith('.webp'))) {
    const b = await readFile(new URL(entry.file, dir));
    assert.equal(b.length, entry.bytes, entry.file);
    assert.equal(createHash('sha256').update(b).digest('hex'), entry.sha256, entry.file);
  }
});
