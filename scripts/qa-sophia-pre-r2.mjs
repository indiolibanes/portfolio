// Local-only instrumentation on the real Astro page. No public diagnostic UI.
import { chromium } from 'playwright';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4321';
const output = process.env.QA_OUTPUT || 'qa-results/sophia-pre-r2';
const label = process.env.QA_LABEL || 'current';
await mkdir(output, { recursive: true });
let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.QA_CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium', args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
} catch (error) {
  await writeFile(`${output}/${label}.json`, JSON.stringify({ label, status: 'BLOCKED', stage: 'chromium-launch', error: String(error) }, null, 2));
  console.error('BLOCKED: Chromium could not launch; no WebGL or performance result.');
  process.exit(2);
}
const result = { label, renderer: 'Chromium/SwiftShader — NOT mobile or GPU memory measurements', scenarios: [] };
const scenario = async (name, run) => {
  try { const detail = await run(); result.scenarios.push({ name, status: detail?.status || 'PASS', detail }); }
  catch (error) { result.scenarios.push({ name, status: 'FAIL', error: String(error) }); }
};
async function pageFor({ reduced = false, saveData = false, lowMemory = false, noWebGL = false, hidden = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.addInitScript(({ saveData, lowMemory, noWebGL, hidden }) => {
    const metrics = window.__sophiaQA = { contexts: [], ready: [], draws: 0, hidden };
    if (saveData) Object.defineProperty(navigator.connection, 'saveData', { value: true });
    Object.defineProperty(navigator, 'deviceMemory', { value: lowMemory ? 2 : 8 });
    if (hidden) Object.defineProperty(document, 'hidden', { configurable: true, get: () => metrics.hidden });
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (noWebGL && /webgl/.test(type)) return null;
      const ctx = original.call(this, type, ...args);
      if (type === 'webgl2' && ctx && !metrics.contexts.includes(ctx)) metrics.contexts.push(ctx);
      return ctx;
    };
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function(...args) {
      if (this.canvas.dataset.sophiaActorCanvas !== undefined) metrics.draws++;
      return draw.apply(this, args);
    };
    document.addEventListener('sophia:actor-ready', e => metrics.ready.push({ kind: e.target.dataset.sophiaActor, at: performance.now(), draws: metrics.draws }));
  }, { saveData, lowMemory, noWebGL, hidden });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-sophia-actor="runner"]').scrollIntoViewIfNeeded();
  return page;
}
const snap = page => page.evaluate(() => ({
  contextsCreated: window.__sophiaQA.contexts.length,
  contextsLive: window.__sophiaQA.contexts.filter(gl => !gl.isContextLost()).length,
  draws: window.__sophiaQA.draws,
  ready: window.__sophiaQA.ready,
  actors: [...document.querySelectorAll('[data-sophia-actor]')].map(el => ({ kind: el.dataset.sophiaActor, on: el.dataset.sophia3d, failed: el.dataset.sophiaFailed, canvases: el.querySelectorAll('[data-sophia-actor-canvas]').length })),
  resources: performance.getEntriesByType('resource').filter(r => /sophia-actor|sophia-lab-director|\.glb(?:$|\?)/.test(r.name)).map(r => ({ path: new URL(r.name).pathname, start: r.startTime, duration: r.duration, bytes: r.transferSize })),
  heapBytes: performance.memory?.usedJSHeapSize ?? null,
}));
const ready = page => page.waitForFunction(() => document.querySelector('[data-sophia-actor="runner"]')?.dataset.sophiaReady === 'true', null, { timeout: 30000 });
try {
  await scenario('real home: first useful frame, shared model, offscreen lab has no private request', async () => {
    const page = await pageFor(); await ready(page);
    const before = await snap(page);
    assert.ok(before.ready[0].draws > 0, 'first draw precedes ready');
    await page.locator('[data-sophia-actor="lab"]').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-sophia-actor="lab"]')?.dataset.sophiaReady === 'true');
    const both = await snap(page);
    assert.equal(both.contextsLive, 1);
    assert.equal(both.resources.filter(r => r.path.endsWith('.glb')).length, 1);
    await page.screenshot({ path: `${output}/${label}-home.png` });
    await page.evaluate(() => document.querySelectorAll('[data-sophia-actor]').forEach(el => el.remove()));
    await page.waitForTimeout(200);
    const detached = await snap(page);
    // Record before/after evidence; targeted CPU test asserts the fixed disposal requirement.
    const remount = [];
    for (let i = 0; i < 3; i++) {
      await page.evaluate(async () => {
        const el = document.createElement('div'); el.dataset.sophiaActor = 'runner'; el.dataset.sophiaClip = 'Correr_R6';
        el.style.cssText = 'position:fixed;top:20px;left:20px;width:160px;height:200px'; document.body.append(el);
        (await import('/experimental/sophia-actor.js')).mountActors();
      });
      await ready(page);
      remount.push(await snap(page));
      await page.evaluate(() => document.querySelectorAll('[data-sophia-actor]').forEach(el => el.remove()));
      await page.waitForTimeout(200);
    }
    const final = await snap(page); await page.close(); return { before, both, detached, remount, final };
  });
  for (const [name, options] of [['reduced-motion', { reduced: true }], ['Save-Data', { saveData: true }], ['low-memory', { lowMemory: true }], ['hidden-tab-initial-load', { hidden: true }], ['WebGL-unavailable', { noWebGL: true }]]) {
    await scenario(name, async () => {
      const page = await pageFor(options); await page.waitForTimeout(1500); const s = await snap(page);
      assert.ok(s.actors.every(a => a.on !== 'on'));
      if (!options.noWebGL) assert.equal(s.resources.filter(r => r.path.endsWith('.glb')).length, 0);
      await page.close(); return s;
    });
  }
  for (const mode of ['network', 'missing', 'invalid']) {
    await scenario(`fallback-${mode}`, async () => {
      const context = await browser.newContext();
      await context.route('**/assets/models/sophia/*.glb', route => mode === 'network' ? route.abort() : route.fulfill({ status: mode === 'missing' ? 404 : 200, body: mode === 'missing' ? 'not found' : '<html>invalid</html>' }));
      const page = await context.newPage(); await page.goto(base); await page.locator('[data-sophia-actor="runner"]').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('[data-sophia-actor="runner"]')?.dataset.sophiaFailed === 'true');
      const s = await page.locator('[data-sophia-actor="runner"]').evaluate(el => ({ on: el.dataset.sophia3d, canvases: el.querySelectorAll('canvas').length, fallback: getComputedStyle(el.querySelector('.sophia-art')).display }));
      assert.equal(s.on, 'off'); assert.equal(s.canvases, 0); assert.notEqual(s.fallback, 'none'); await context.close(); return s;
    });
  }
  await scenario('private local Lab + runner, pause, visibility reentry, mode, context restoration', async () => {
    if (!process.env.SOPHIA_LAB_R2_MODEL) return { status: 'NOT RUN', reason: 'private model not supplied' };
    const bytes = await readFile(process.env.SOPHIA_LAB_R2_MODEL);
    const page = await pageFor();
    await page.route('**/__qa_local_lab.glb', r => r.fulfill({ contentType: 'model/gltf-binary', body: bytes }));
    await ready(page);
    await page.evaluate(async () => {
      const mod = await import('/experimental/sophia-actor.js');
      Object.assign(mod.MODELS['lab-r2'], { published: true, url: '/__qa_local_lab.glb' });
      const old = document.querySelector('[data-sophia-actor="lab"]'); old.remove();
      const runner = document.querySelector('[data-sophia-actor="runner"]'); runner.style.cssText = 'position:fixed;top:10px;left:10px;width:160px;height:200px';
      const el = document.createElement('div'); Object.assign(el.dataset, { sophiaActor: 'lab', sophiaModelKey: 'lab-r2', sophiaClip: 'Lab_Idle_Breath_R1' });
      el.style.cssText = 'position:fixed;top:10px;left:200px;width:160px;height:200px';document.body.append(el);mod.mountActors();
    });
    await page.waitForFunction(() => document.querySelector('[data-sophia-actor="lab"]')?.dataset.sophiaReady === 'true');
    const both = await snap(page); assert.equal(both.contextsLive, 2);
    const detail = await page.evaluate(async () => {
      const mod = await import('/experimental/sophia-actor.js');const el = document.querySelector('[data-sophia-actor="lab"]');const actor = mod.actorOf(el);
      return { clips: Object.keys(actor.sk.clips), shared: actor.stage === mod.actorOf(document.querySelector('[data-sophia-actor="runner"]')).stage };
    });
    const actorTime = () => page.evaluate(async () => (await import('/experimental/sophia-actor.js')).actorOf(document.querySelector('[data-sophia-actor="lab"]')).time);
    await page.evaluate(() => {
      const el = document.querySelector('[data-sophia-actor="lab"]');
      const host = document.createElement('div'); host.dataset.decorativeMotion = '';host.dataset.motionPlaying = 'false';
      el.before(host);host.append(el);
    });
    await page.waitForTimeout(100); const paused = await actorTime(); await page.waitForTimeout(200); assert.equal(await actorTime(), paused);
    await page.evaluate(() => document.querySelector('[data-sophia-actor="lab"]').parentElement.dataset.motionPlaying = 'true');
    await page.waitForTimeout(200); assert.ok(await actorTime() > paused);
    await page.evaluate(() => document.querySelector('[data-sophia-actor="lab"]').style.display = 'none');
    await page.waitForTimeout(150); const offscreen = await actorTime();await page.waitForTimeout(200);assert.equal(await actorTime(), offscreen);
    await page.evaluate(() => document.querySelector('[data-sophia-actor="lab"]').style.display = '');
    await page.waitForTimeout(200);assert.ok(await actorTime() > offscreen);
    await page.evaluate(() => { document.documentElement.dataset.legacyMode = 'true'; }); await page.waitForTimeout(100);
    assert.ok((await snap(page)).actors.every(a => a.on !== 'on'));
    await page.evaluate(() => { delete document.documentElement.dataset.legacyMode; }); await page.waitForTimeout(100);
    await page.evaluate(async () => {const mod=await import('/experimental/sophia-actor.js');mod.actorOf(document.querySelector('[data-sophia-actor="lab"]')).stage.renderer.canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();});
    await page.waitForFunction(() => document.querySelector('[data-sophia-actor="lab"]').dataset.sophia3d === 'off');
    assert.equal(await page.locator('[data-sophia-actor="runner"]').getAttribute('data-sophia-3d'), 'on');
    await page.evaluate(() => window.__sophiaQA.contexts.at(-1).getExtension('WEBGL_lose_context').restoreContext());
    await page.waitForFunction(() => document.querySelector('[data-sophia-actor="lab"]').dataset.sophia3d === 'on');
    const restored = await snap(page); assert.equal(restored.contextsLive, 2);
    await page.close(); return { both, detail, restored };
  });
} finally {
  await browser.close();
  await writeFile(`${output}/${label}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result.scenarios.map(({name,status,error}) => ({name,status,error})),null,2));
}
if (result.scenarios.some(s => s.status === 'FAIL')) process.exitCode = 1;
