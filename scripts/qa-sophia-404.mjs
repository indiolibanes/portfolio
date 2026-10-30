import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4321';
await mkdir('qa-results/sophia-404', { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'],
});
let failed = false;
try {
  for (const width of [390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(base + '/404.html', { waitUntil:'domcontentloaded' });
    await page.locator('[data-tetris-canvas]').waitFor();
    await page.locator('[data-tetris-start]').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Space');
    await page.keyboard.press('KeyP');
    const stats = await page.evaluate(() => ({
      lines: Number(document.querySelector('[data-tetris-lines]')?.textContent),
      score: Number(document.querySelector('[data-tetris-score]')?.textContent),
      input: document.querySelector('[data-tetris]')?.dataset.input,
      states: [...document.querySelectorAll('[data-sophia-stage]')].map(e => e.dataset.sophiaStage),
      overflow: document.documentElement.scrollWidth > innerWidth + 4,
    }));
    if (!stats.score || stats.overflow || stats.states.length !== 2 || errors.length) {
      failed = true;
      console.error('FAIL', width, JSON.stringify({stats,errors}));
    } else {
      console.log('PASS', width, JSON.stringify(stats));
    }
    await page.screenshot({ path: 'qa-results/sophia-404/404-' + width + '.png', fullPage: true });
    // Perform WebGL smoke check with 2D fallback allowed on software-only runners.
    if (width === 390 || width === 1440) {
      await page.locator('[data-sophia-stage="lounge"]').scrollIntoViewIfNeeded();
      try {
        await page.waitForFunction(() => {
          const r = document.querySelector('[data-sophia-stage="lounge"]');
          return r?.dataset.sophiaReady === 'true' || r?.dataset.sophiaFailed === 'true';
        }, null, { timeout: 25000 });
      } catch {}
      const result = await page.locator('[data-sophia-stage="lounge"]').evaluate(
        el => ({ ready: el.dataset.sophiaReady, failed: el.dataset.sophiaFailed }),
      );
      console.log('3D room', width, JSON.stringify(result));
      if (result.ready !== 'true') {
        failed = true;
        console.error('FAIL 3D room did not initialize', width, JSON.stringify(result));
      }
      await page.screenshot({ path:'qa-results/sophia-404/404-room-' + width + '.png', fullPage:true });
    }
    await page.close();
  }
  // With reduced motion the SVG must stay visible, never a blank scene.
  const page = await browser.newPage({ viewport: {width:390,height:844}, reducedMotion:'reduce' });
  await page.goto(base + '/404.html', { waitUntil: 'domcontentloaded' });
  const reduced = await page.evaluate(() => {
    const r=document.querySelector('[data-sophia-stage="portrait"]');
    return { canvas: getComputedStyle(r.querySelector('canvas')).display,
      svg: getComputedStyle(r.querySelector('.sophia-portrait')).visibility };
  });
  if (reduced.canvas !== 'none' || reduced.svg !== 'visible') {
    failed=true; console.error('FAIL reduced motion',reduced);
  } else console.log('PASS reduced motion', reduced);
  await page.close();
} finally { await browser.close(); }
if (failed) process.exitCode=1;
