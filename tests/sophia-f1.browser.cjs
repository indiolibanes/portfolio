const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

const origin = 'http://127.0.0.1:4337';
const url = `${origin}/sophia/7a-preview/?diagnostics=1`;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitServer() {
  for (let n = 0; n < 60; n++) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await delay(100);
  }
  throw new Error('Static test server did not start');
}

async function run() {
  const server = spawn('python3', ['-m', 'http.server', '4337', '--bind', '127.0.0.1', '--directory', path.resolve('dist')], { stdio: 'ignore' });
  let browser;
  const results = [];
  try {
    await waitServer();
    browser = await chromium.launch({ executablePath: '/tmp/chromium', headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

    {
      const page = await browser.newPage();
      const pageErrors = [];
      const rejected = [];
      page.on('pageerror', e => pageErrors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') rejected.push(m.text()); });
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, ...args) {
          if (/webgl/i.test(type) && window.__blockWebgl) return null;
          return original.call(this, type, ...args);
        };
        window.__blockWebgl = true;
      });
      await page.goto(url);
      assert.equal(await page.locator('.sp7a-root').count(), 0, 'deferred scene before interaction');
      await page.getByRole('button', { name: 'Carregar prévia 3D' }).click();
      await page.locator('.sp7a-root[data-status="nowebgl"]').waitFor({ timeout: 20000 });
      assert.equal(await page.locator('.sp7a-fail[role="alert"]').count(), 1);
      assert.equal(await page.locator('.sp7a-canvas').count(), 0);
      assert.deepEqual(pageErrors, []);
      assert.equal(rejected.some(s => /TypeError|setEffects|setReducedMotion|setTouchGuard/.test(s)), false, rejected.join('\n'));
      assert.equal(await page.evaluate(() => window.__sophia.engine._disposed), true);
      assert.equal(await page.evaluate(() => window.__sophia.engine._scope.size), 0);
      await page.getByRole('button', { name: /Fechar prévia/ }).click();
      await page.evaluate(() => { window.__blockWebgl = false; });
      await page.getByRole('button', { name: 'Carregar prévia 3D' }).click();
      await page.locator('.sp7a-root[data-status="ready"]').waitFor({ timeout: 90000 });
      assert.deepEqual(pageErrors, []);
      results.push('no WebGL: deferred load, informative fallback, disposal, no secondary exception, reopen into ready');
      await page.close();
    }

    {
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', e => pageErrors.push(e.message));
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, ...args) {
          if (/webgl/i.test(type)) throw new Error('injected renderer constructor failure');
          return original.call(this, type, ...args);
        };
      });
      await page.goto(url);
      await page.getByRole('button', { name: 'Carregar prévia 3D' }).click();
      await page.locator('.sp7a-root[data-status="error"]').waitFor({ timeout: 20000 });
      assert.match(await page.locator('.sp7a-fail-detail').textContent(), /injected renderer constructor failure/);
      assert.equal(await page.evaluate(() => window.__sophia.engine._disposed), true);
      assert.deepEqual(pageErrors, []);
      results.push('unexpected renderer exception: original error, generic fallback, no false WebGL classification');
      await page.close();
    }

    {
      const page = await browser.newPage();
      const pageErrors = [];
      let requested;
      const requestedPromise = new Promise(resolve => requested = resolve);
      let release;
      const gate = new Promise(resolve => release = resolve);
      await page.route('**/sophia-7a/sophia.glb', async route => {
        requested();
        await gate;
        try { await route.continue(); } catch {}
      });
      page.on('pageerror', e => pageErrors.push(e.message));
      await page.goto(url);
      await page.getByRole('button', { name: 'Carregar prévia 3D' }).click();
      await Promise.race([requestedPromise, delay(20000).then(() => { throw new Error('GLB request not observed'); })]);
      await page.getByRole('button', { name: /Fechar prévia/ }).click();
      assert.equal(await page.locator('.sp7a-root').count(), 0);
      release();
      await delay(600);
      assert.equal(await page.evaluate(() => window.__sophia.engine._disposed), true);
      assert.equal(await page.evaluate(() => window.__sophia.engine._scope.size), 0);
      assert.deepEqual(pageErrors, []);
      results.push('cancel during in-flight GLB: unmount without late exception');
      await page.close();
    }

    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      const pageErrors = [];
      page.on('pageerror', e => pageErrors.push(e.message));
      let requested;
      const requestedPromise = new Promise(resolve => requested = resolve);
      let release;
      const gate = new Promise(resolve => release = resolve);
      await page.route('**/sophia-7a/sophia.glb', async route => {
        requested();
        await gate;
        try { await route.continue(); } catch {}
      });
      await page.goto(url);
      await page.getByRole('button', { name: 'Carregar prévia 3D' }).click();
      await Promise.race([requestedPromise, delay(20000).then(() => { throw new Error('GLB request not observed'); })]);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.locator('.sp7a-root[data-reduced="1"]').waitFor();
      release();
      await page.locator('.sp7a-root[data-status="ready"]').waitFor({ timeout: 90000 });
      const state = await page.evaluate(() => {
        const e = window.__sophia.engine;
        return { ready: e.state.ready, reduced: e.state.reduced, paused: e.state.paused,
          damping: e.controls.enableDamping, renderer: e.gl.renderer, model: !!e._model };
      });
      assert.equal(state.ready, true); assert.equal(state.model, true);
      assert.equal(state.reduced, true); assert.equal(state.paused, true); assert.equal(state.damping, false);
      assert.deepEqual(pageErrors, []);
      await page.getByRole('button', { name: /Fechar prévia/ }).click();
      assert.equal(await page.evaluate(() => window.__sophia.engine._disposed), true);
      results.push(`normal initialization, reduced motion changed during load, disposal: ${state.renderer} (software browser)`);
      await page.close();
    }
    for (const result of results) console.log(`PASS ${result}`);
  } finally {
    await browser?.close();
    server.kill();
  }
}
run().catch(e => { console.error(e); process.exitCode = 1; });
