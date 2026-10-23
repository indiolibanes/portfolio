// Browser QA harness for indiolibanes/portfolio.
// Runs in GitHub Actions only (see .github/workflows/portfolio-browser-qa.yml).
// It never touches production: each ref is built from source and served by
// `astro preview` on localhost. Last.fm is mocked ONLY inside this harness so
// the playing/error states can be photographed; no fixture reaches the site.
//
// Usage: node browser-audit.mjs <label> <baseUrl> <outDir>
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const axeSource = await readFile(process.env.AXE_PATH || require.resolve('axe-core/axe.min.js'), 'utf8');

const [label, baseUrl, outDir] = process.argv.slice(2);
if (!label || !baseUrl || !outDir) throw new Error('usage: label baseUrl outDir');

const MODES = ['authorial', 'editorial', 'legacy'];
const VIEWPORTS = [
  { name: '360', width: 360, height: 780 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1200', width: 1200, height: 800 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
];
const PAGES = [
  { name: 'home', path: '/' },
  { name: 'sophia', path: '/sophia/' },
  { name: 'curiosidades', path: '/curiosidades/' },
  { name: '404', path: '/qa-pagina-inexistente/' },
];
const SECTION_WIDTHS = new Set(['360', '390', '430', '1440']);
const SECTION_WIDTHS_AUTHORIAL = new Set(['360', '390', '768', '1024', '1440', '1920']);
const AXE_WIDTHS = new Set(['390', '1440']);

const MOCK_TRACK = {
  // Harness-only fixture, clearly labelled so it cannot be mistaken for data.
  track: {
    name: 'Faixa de teste (QA)',
    artist: 'Artista fictício de QA',
    album: 'Álbum de teste',
    nowPlaying: true,
    playedAt: Date.now(),
    artwork: '',
    url: 'https://www.last.fm/',
  },
};

await mkdir(join(outDir, 'shots'), { recursive: true });
const report = { label, baseUrl, generatedAt: new Date().toISOString(), runs: [], interactions: {} };

const browser = await chromium.launch();

async function newPage({ viewport, reducedMotion = 'reduce', music = 'error' }) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    reducedMotion,
    hasTouch: viewport.width < 1024,
    isMobile: viewport.width < 768,
  });
  const page = await context.newPage();
  const log = { console: [], pageErrors: [], failed: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') log.console.push(`${msg.type()}: ${msg.text()}`.slice(0, 300));
  });
  page.on('pageerror', (err) => log.pageErrors.push(String(err).slice(0, 300)));
  page.on('response', (res) => {
    const url = res.url();
    if (res.status() >= 400 && !url.includes('/qa-pagina-inexistente')) log.failed.push(`${res.status()} ${url.replace(baseUrl, '')}`);
  });
  page.on('requestfailed', (req) => log.failed.push(`FAILED ${req.url().replace(baseUrl, '')} ${req.failure()?.errorText}`));
  await page.route('**/api/music/recent', (route) => {
    if (music === 'playing') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TRACK) });
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"track":null}' });
  });
  return { context, page, log };
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  // Force lazy images to load so section shots are complete.
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll('img[loading="lazy"]')) img.loading = 'eager';
    const step = Math.max(400, window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
}

function measurementsScript() {
  const vw = document.documentElement.clientWidth;
  const describe = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = [...el.classList].slice(0, 3).join('.');
    if (cls) s += '.' + cls;
    return s;
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const clippedByAncestor = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (/(hidden|clip|auto|scroll)/.test(cs.overflowX)) {
        const r = p.getBoundingClientRect();
        if (r.right <= vw + 1) return true;
      }
    }
    return false;
  };
  const overflow = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue;
    if (el.closest('[aria-hidden="true"]') && getComputedStyle(el).position === 'fixed') continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 2 || r.left < -2) {
      if (clippedByAncestor(el)) continue;
      overflow.push({ el: describe(el), left: Math.round(r.left), right: Math.round(r.right), decorative: Boolean(el.closest('[aria-hidden="true"]')) });
    }
  }
  const targets = [];
  for (const el of document.querySelectorAll('a[href], button, [role="button"], input, select, summary')) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 24 || r.height < 24) {
      // WCAG 2.5.8 exception: inline links inside a sentence.
      const inline = getComputedStyle(el).display === 'inline' && el.closest('p, li, figcaption, blockquote');
      targets.push({ el: describe(el), text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height), inline: Boolean(inline) });
    }
  }
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
    .filter((h) => !h.closest('[aria-hidden="true"]'))
    .map((h) => `${h.tagName} ${h.textContent.trim().replace(/\s+/g, ' ').slice(0, 70)}`);
  const brokenImages = [...document.images]
    .filter((img) => img.complete && img.currentSrc && img.naturalWidth === 0)
    .map((img) => img.currentSrc.replace(location.origin, ''));
  return {
    viewportWidth: vw,
    scrollWidth: document.documentElement.scrollWidth,
    pageHeight: document.documentElement.scrollHeight,
    horizontalScroll: document.documentElement.scrollWidth > vw + 1,
    bodyOverflowX: getComputedStyle(document.body).overflowX,
    htmlOverflowX: getComputedStyle(document.documentElement).overflowX,
    overflow: overflow.slice(0, 25),
    overflowCount: overflow.length,
    smallTargets: targets,
    headings,
    brokenImages,
    title: document.title,
    mode: document.documentElement.dataset.portfolioMode,
  };
}

async function focusAudit(page) {
  return page.evaluate(async () => {
    const parse = (c) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r, g, b, a };
    };
    const lum = ({ r, g, b }) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const bgOf = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const c = parse(getComputedStyle(p).backgroundColor);
        if (c && c.a > 0.5) return c;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    };
    const items = [...document.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')]
      .filter((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; })
      .slice(0, 60);
    const out = [];
    for (const el of items) {
      el.focus({ preventScroll: true });
      const cs = getComputedStyle(el);
      const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
      const shadow = cs.boxShadow && cs.boxShadow !== 'none';
      const color = parse(cs.outlineColor);
      const bg = bgOf(el);
      out.push({
        el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').slice(0, 2).join('.') : ''),
        name: (el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        outline: outline ? `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor}` : 'none',
        boxShadow: shadow ? cs.boxShadow.slice(0, 60) : 'none',
        outlineContrastApprox: outline && color ? Number(ratio(color, bg).toFixed(2)) : null,
      });
    }
    document.activeElement?.blur();
    return out;
  });
}

async function webVitals(page) {
  return page.evaluate(() => new Promise((resolve) => {
    let lcp = 0; let cls = 0; let lcpEl = '';
    try {
      new PerformanceObserver((list) => { for (const e of list.getEntries()) { lcp = e.startTime; lcpEl = e.element ? (e.element.tagName + (e.element.className ? '.' + String(e.element.className).split(' ')[0] : '')) : (e.url || ''); } })
        .observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) cls += e.value; })
        .observe({ type: 'layout-shift', buffered: true });
    } catch {}
    setTimeout(() => {
      const res = performance.getEntriesByType('resource');
      const sum = (filter) => Math.round(res.filter(filter).reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0) / 1024);
      resolve({
        lcpMs: Math.round(lcp), lcpElement: lcpEl, cls: Number(cls.toFixed(4)),
        requests: res.length,
        kbTotal: sum(() => true),
        kbImages: sum((r) => r.initiatorType === 'img' || /\.(webp|avif|png|jpe?g|gif|svg)(\?|$)/.test(r.name)),
        kbScripts: sum((r) => r.initiatorType === 'script'),
        kbCss: sum((r) => r.initiatorType === 'link' || /\.css(\?|$)/.test(r.name)),
        kbFonts: sum((r) => /\.(woff2?|ttf|otf)(\?|$)/.test(r.name)),
        biggest: res.map((r) => ({ url: r.name.replace(location.origin, ''), kb: Math.round((r.transferSize || r.encodedBodySize || 0) / 1024) })).sort((a, b) => b.kb - a.kb).slice(0, 8),
      });
    }, 2500);
  }));
}

for (const pageDef of PAGES) {
  for (const mode of MODES) {
    for (const viewport of VIEWPORTS) {
      const { context, page, log } = await newPage({ viewport });
      const url = `${baseUrl}${pageDef.path}?mode=${mode}`;
      const response = await page.goto(url, { waitUntil: 'load' });
      await settle(page);
      const id = `${pageDef.name}-${mode}-${viewport.name}`;
      await page.screenshot({ path: join(outDir, 'shots', `fold-${id}.jpg`), type: 'jpeg', quality: 72 });
      const metrics = await page.evaluate(measurementsScript);
      const run = { id, page: pageDef.name, mode, viewport: viewport.name, status: response?.status(), metrics, log };

      if (pageDef.name === 'home' && (SECTION_WIDTHS.has(viewport.name) || (mode === 'authorial' && SECTION_WIDTHS_AUTHORIAL.has(viewport.name)))) {
        const sections = await page.$$('main > section, main > .editorial-masthead, header.site-header, footer.portfolio-footer');
        for (const handle of sections) {
          const sid = await handle.evaluate((el) => el.id || el.className.split(' ')[0]);
          await handle.scrollIntoViewIfNeeded().catch(() => {});
          await page.waitForTimeout(150);
          await handle.screenshot({ path: join(outDir, 'shots', `section-${id}-${sid}.jpg`), type: 'jpeg', quality: 70 }).catch((e) => log.console.push('shot-error ' + sid + ' ' + e.message.slice(0, 80)));
        }
      }
      if (pageDef.name !== 'home' && (viewport.name === '390' || viewport.name === '1440')) {
        await page.screenshot({ path: join(outDir, 'shots', `full-${id}.jpg`), type: 'jpeg', quality: 70, fullPage: true });
      }
      if (AXE_WIDTHS.has(viewport.name)) {
        await page.addScriptTag({ content: axeSource });
        run.axe = await page.evaluate(async () => {
          const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations', 'incomplete'] });
          const slim = (list) => list.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 40).map((n) => ({ target: n.target.join(' '), summary: (n.failureSummary || '').split('\n').slice(0, 3).join(' | ').slice(0, 220) })) }));
          return { violations: slim(r.violations), incompleteIds: r.incomplete.map((v) => `${v.id}(${v.nodes.length})`) };
        });
        run.focus = await focusAudit(page);
      }
      report.runs.push(run);
      await context.close();
    }
  }
}

// Performance with motion enabled (normal user), fresh context, home only.
report.performance = {};
for (const viewport of VIEWPORTS.filter((v) => ['390', '1440'].includes(v.name))) {
  for (const mode of MODES) {
    const { context, page, log } = await newPage({ viewport, reducedMotion: 'no-preference' });
    await page.goto(`${baseUrl}/?mode=${mode}`, { waitUntil: 'load' });
    report.performance[`${mode}-${viewport.name}`] = { ...(await webVitals(page)), consoleErrors: log.console, pageErrors: log.pageErrors };
    await page.screenshot({ path: join(outDir, 'shots', `motion-fold-home-${mode}-${viewport.name}.jpg`), type: 'jpeg', quality: 72 });
    await context.close();
  }
}

// Interaction checks.
{
  const vp = VIEWPORTS[4];
  // 1. Mode cycle.
  const { context, page } = await newPage({ viewport: vp });
  await page.goto(`${baseUrl}/`, { waitUntil: 'load' });
  const cycle = [];
  for (let i = 0; i < 4; i += 1) {
    // Três emblemas fixos (α · β · γ); o vigente fica aceso (aria-pressed).
    cycle.push(await page.evaluate(() => ({
      mode: document.documentElement.dataset.portfolioMode,
      label: document.querySelector('[data-mode-group]')?.getAttribute('aria-label'),
      order: Array.from(document.querySelectorAll('[data-mode-node]')).map((n) => `${n.dataset.state}:${n.dataset.modeNode}`),
      focusable: Array.from(document.querySelectorAll('[data-mode-option]')).filter((o) => o.tabIndex >= 0).length,
      current: document.querySelectorAll('[data-mode-option][aria-pressed="true"]').length,
      url: location.search,
    })));
    // Clica no próximo emblema do ciclo (α → β → γ → α).
    await page.evaluate(() => {
      const order = ['authorial', 'editorial', 'legacy'];
      const next = order[(order.indexOf(document.documentElement.dataset.portfolioMode) + 1) % order.length];
      document.querySelector(`[data-mode-option="${next}"]`)?.click();
    });
    // A troca dura até ~1 s (Autoral: cometa + ignição); espera terminar.
    await page.waitForTimeout(1200);
  }
  report.interactions.modeCycle = cycle;
  await page.reload({ waitUntil: 'load' });
  report.interactions.modePersistAfterReload = await page.evaluate(() => document.documentElement.dataset.portfolioMode);
  await context.close();
}
{
  // 2. Music panorama effect (both sprites) with motion on, authorial mode.
  const vp = VIEWPORTS[4];
  const { context, page, log } = await newPage({ viewport: vp, reducedMotion: 'no-preference', music: 'playing' });
  await page.goto(`${baseUrl}/?mode=authorial`, { waitUntil: 'load' });
  await settle(page);
  const button = page.locator('[data-music-effect-toggle]');
  await button.scrollIntoViewIfNeeded();
  const effects = [];
  for (const expected of ['butterfly', 'ribbon']) {
    await button.click({ position: { x: 300, y: 200 } });
    await page.waitForTimeout(450);
    effects.push(await page.evaluate((exp) => {
      const imgs = [...document.querySelectorAll('[data-music-effects] img')];
      return { expected: exp, particles: document.querySelectorAll('[data-music-effects] .music-effect-particle').length, images: imgs.length, broken: imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src.replace(location.origin, '')) };
    }, expected));
    await page.locator('#musica').screenshot({ path: join(outDir, 'shots', `interaction-music-${expected}.jpg`), type: 'jpeg', quality: 72 });
    await page.waitForTimeout(2300);
  }
  report.interactions.musicEffects = { effects, failed: log.failed };
  await page.locator('#musica').screenshot({ path: join(outDir, 'shots', 'interaction-music-playing-state.jpg'), type: 'jpeg', quality: 72 });
  // Effect button in quiet modes.
  report.interactions.musicEffectButtonByMode = {};
  for (const mode of MODES) {
    await page.goto(`${baseUrl}/?mode=${mode}`, { waitUntil: 'load' });
    report.interactions.musicEffectButtonByMode[mode] = await page.evaluate(() => {
      const b = document.querySelector('[data-music-effect-toggle]');
      return b ? { hidden: b.hidden, disabled: b.disabled, ariaHidden: b.getAttribute('aria-hidden'), tabIndex: b.tabIndex, label: b.getAttribute('aria-label') } : null;
    });
  }
  await context.close();
}
{
  // 3. Keyboard: first 12 Tab stops on home (authorial, 390 and 1440).
  for (const vp of [VIEWPORTS[1], VIEWPORTS[4]]) {
    const { context, page } = await newPage({ viewport: vp });
    await page.goto(`${baseUrl}/`, { waitUntil: 'load' });
    const stops = [];
    for (let i = 0; i < 14; i += 1) {
      await page.keyboard.press('Tab');
      stops.push(await page.evaluate(() => {
        const el = document.activeElement; const r = el.getBoundingClientRect();
        return `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 36)}" ${Math.round(r.width)}x${Math.round(r.height)} @${Math.round(r.top)}`;
      }));
      if (i === 0 || i === 7) await page.screenshot({ path: join(outDir, 'shots', `keyboard-tab${i + 1}-${vp.name}.jpg`), type: 'jpeg', quality: 72 });
    }
    report.interactions[`tabOrder-${vp.name}`] = stops;
    await context.close();
  }
}
{
  // 4. Mobile navigation at 360: is every nav destination reachable/visible?
  const { context, page } = await newPage({ viewport: VIEWPORTS[0] });
  await page.goto(`${baseUrl}/`, { waitUntil: 'load' });
  report.interactions.mobileNav360 = await page.evaluate(() => [...document.querySelectorAll('.nav-links a, .nav-links button')].map((el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return { text: el.innerText.trim(), visible: cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0, x: Math.round(r.left), right: Math.round(r.right), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  }));
  report.interactions.headerHeight360 = await page.evaluate(() => Math.round(document.querySelector('.site-header')?.getBoundingClientRect().height || 0));
  await context.close();
}

{
  // 5. Compact navigation (if present): open, list destinations, Escape.
  for (const vp of [VIEWPORTS[1], VIEWPORTS[2]]) {
    for (const mode of MODES) {
      const { context, page } = await newPage({ viewport: vp });
      await page.goto(`${baseUrl}/?mode=${mode}`, { waitUntil: 'load' });
      const toggle = page.locator('[data-nav-menu-toggle]');
      const result = { hasToggle: await toggle.count() > 0 };
      if (result.hasToggle && await toggle.isVisible()) {
        await toggle.click();
        await page.waitForTimeout(150);
        result.expanded = await toggle.getAttribute('aria-expanded');
        result.links = await page.evaluate(() => [...document.querySelectorAll('.nav-sections a')].map((a) => { const r = a.getBoundingClientRect(); return `${a.innerText.trim()} ${Math.round(r.width)}x${Math.round(r.height)} vis=${r.width > 0 && getComputedStyle(a).visibility !== 'hidden'}`; }));
        await page.screenshot({ path: join(outDir, 'shots', `nav-open-${mode}-${vp.name}.jpg`), type: 'jpeg', quality: 72 });
        await page.keyboard.press('Escape');
        result.afterEscape = await page.evaluate(() => ({ expanded: document.querySelector('[data-nav-menu-toggle]').getAttribute('aria-expanded'), focus: document.activeElement?.dataset?.navMenuToggle !== undefined }));
      } else {
        result.links = await page.evaluate(() => [...document.querySelectorAll('.nav-links a')].map((a) => { const r = a.getBoundingClientRect(); return `${a.innerText.trim()} vis=${r.width > 0 && getComputedStyle(a).display !== 'none'}`; }));
      }
      result.scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      report.interactions[`nav-${mode}-${vp.name}`] = result;
      await context.close();
    }
  }
}

{
  // 6. Motion filmstrips (motion allowed): frames of every animated component.
  const ONLY = process.env.QA_SKIP_MOTION ? [] : [VIEWPORTS[1], VIEWPORTS[5]];
  report.motion = {};
  const strip = async (page, selector, name, frames, every, before) => {
    const loc = page.locator(selector).first();
    if (!(await loc.count())) { report.motion[name] = 'missing'; return; }
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);
    if (before) await before();
    const boxes = [];
    for (let i = 0; i < frames; i += 1) {
      const box = await loc.boundingBox();
      boxes.push(box ? `${Math.round(box.x)},${Math.round(box.y)},${Math.round(box.width)}x${Math.round(box.height)}` : 'none');
      await loc.screenshot({ path: join(outDir, 'shots', `motion-${name}-${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 68, animations: 'allow' }).catch(() => {});
      await page.waitForTimeout(every);
    }
    report.motion[name] = boxes;
  };
  for (const vp of ONLY) {
    const { context, page, log } = await newPage({ viewport: vp, reducedMotion: 'no-preference', music: 'playing' });
    await page.goto(`${baseUrl}/?mode=authorial`, { waitUntil: 'load' });
    await settle(page);
    const w = vp.name;
    await strip(page, '#sobre .hero-cover-art', `prism-${w}`, 10, 400);
    await strip(page, '#sobre .hero-ornaments', `ornaments-${w}`, 20, 480);
    await strip(page, '#sobre .name-brick-plate', `nameplate-${w}`, 6, 500);
    await strip(page, '#lab .lab-companion', `sophia-lab-${w}`, 8, 260);
    await strip(page, '#metodo .method-presenter', `sophia-method-${w}`, 8, 300);
    await strip(page, '#bastidores .github-gif-strip', `bastidores-${w}`, 4, 400);
    await strip(page, '#musica .music-panorama', `music-idle-${w}`, 6, 500);
    const panoramaClick = (x, y) => async () => { const b = page.locator('[data-music-effect-toggle]'); if (await b.isVisible()) await b.click({ position: { x, y } }); };
    await strip(page, '#musica .music-panorama', `music-butterflies-${w}`, 8, 230, panoramaClick(vp.width < 700 ? 120 : 420, vp.width < 700 ? 90 : 260));
    await page.waitForTimeout(1500);
    await strip(page, '#musica .music-panorama', `music-ribbons-${w}`, 8, 230, panoramaClick(vp.width < 700 ? 200 : 700, vp.width < 700 ? 110 : 300));
    await strip(page, '#musica [data-cover-hero]', `music-cover-${w}`, 4, 700);
    await strip(page, '#contato .closing-marks', `orbit-${w}`, 10, 600);
    report.motion[`log-${w}`] = { errors: log.pageErrors, console: log.console.filter((c) => !c.includes('503')) };
    await context.close();
    // Aemeath: fast-forward the random timer with a virtual clock.
    const ctx2 = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: 'no-preference', isMobile: vp.width < 768, hasTouch: vp.width < 1024 });
    const p2 = await ctx2.newPage();
    await p2.clock.install();
    await p2.goto(`${baseUrl}/?mode=authorial`, { waitUntil: 'load' });
    const seen = [];
    for (let t = 0; t < 14; t += 1) {
      await p2.clock.runFor(12000);
      await p2.waitForTimeout(60);
      const st = await p2.evaluate(() => { const s = document.querySelector('[data-random-easter-sprite]'); if (!s) return null; const r = s.getBoundingClientRect(); return { visible: s.dataset.visible, src: (s.getAttribute('src') || '').split('/').pop(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }; });
      if (st?.visible === 'true') {
        seen.push(st);
        if (seen.length <= 3) await p2.screenshot({ path: join(outDir, 'shots', `motion-aemeath-${w}-${seen.length}.jpg`), type: 'jpeg', quality: 68 });
      }
    }
    report.motion[`aemeath-${w}`] = seen;
    await ctx2.close();
  }
  // Sophia page + 404 Tetris.
  for (const [path, sel, name] of [['/sophia/', '.sophia-orbit', 'sophia-page'], ['/qa-pagina-inexistente/', '.sophia-tetris', 'sophia-404']]) {
    const { context, page } = await newPage({ viewport: VIEWPORTS[1], reducedMotion: 'no-preference' });
    await page.goto(`${baseUrl}${path}?mode=authorial`, { waitUntil: 'load' });
    await strip(page, sel, `${name}-390`, 6, 350);
    await context.close();
  }
}

await browser.close();
await writeFile(join(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(`QA ${label}: ${report.runs.length} runs written to ${outDir}`);
