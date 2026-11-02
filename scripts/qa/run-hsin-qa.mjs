/** Runs the visual QA harness in real (software) WebGL and writes PNGs, a contact sheet and a JSON report.
 * Usage: node scripts/qa/run-hsin-qa.mjs OUT_DIR [--scenario=face] [--stage-url=http://127.0.0.1:4321]
 * Requires playwright (installed with --no-save in CI) and three in node_modules. Software rendering: colour and
 * light are valid evidence; frame time, smoothness and FPS are not. */
import {mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {chromium} from 'playwright';
import sharp from 'sharp';
import {serve} from './serve.mjs';

const [out = 'qa-out', ...rest] = process.argv.slice(2), flag = (name, fallback) => rest.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? fallback;
const scenario = flag('scenario', 'face'), stageUrl = flag('stage-url', ''), variantsArg = flag('variants', process.env.QA_VARIANTS ?? ''), viewsArg = flag('views', process.env.QA_VIEWS ?? '');
await mkdir(out, {recursive: true});
const {server, url} = await serve();
const browser = await chromium.launch({args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const report = {scenario, renderer: null, harness: {}, shots: [], stage: null, caveat: 'Software WebGL: colour and lighting evidence only. Not frame-rate, smoothness or GPU-memory evidence.'};
const errors = [];

async function openHarness() {
 const page = await browser.newPage({viewport: {width: 800, height: 1100}, deviceScaleFactor: 1});
 page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(String(e)));
 await page.goto(`${url}/scripts/qa/hsin-harness.html`); await page.waitForFunction(() => window.hsinHarnessReady === true, null, {timeout: 60000});
 return page;
}
const label = async (file, text) => sharp(file).composite([{input: Buffer.from(`<svg width="800" height="44"><rect width="800" height="44" fill="#000" fill-opacity=".6"/><text x="12" y="29" font-family="sans-serif" font-size="22" fill="#fff">${text}</text></svg>`), top: 0, left: 0}]).png().toBuffer();

async function shoot(page, variant, options, views) {
 const info = await page.evaluate((o) => window.hsinHarness.load(o), options);
 report.harness[variant] = info;
 if (!report.renderer) report.renderer = await page.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl2'), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
 const files = {};
 for (const v of views) {
  const stats = await page.evaluate(({view, pose}) => { const h = window.hsinHarness; h.pose(pose?.name ?? null, pose?.weight ?? 0); h.view(view); return h.render(); }, {view: v.view, pose: v.pose});
  const file = join(out, `${v.id}.${variant}.png`);
  await page.locator('#c').screenshot({path: file});
  files[v.id] = file; report.shots.push({id: v.id, variant, file, ...stats});
 }
 return files;
}

async function sheet(name, variants, views, files) {
 const cell = 400, h = Math.round(cell * 1100 / 800), tiles = [];
 for (const [row, v] of views.entries()) for (const [col, variant] of variants.entries()) {
  const labelled = await label(files[variant.id][v.id], `${v.title} · ${variant.title}`);
  tiles.push({input: await sharp(labelled).resize(cell, h).png().toBuffer(), left: col * cell, top: row * h});
 }
 await sharp({create: {width: cell * variants.length, height: h * views.length, channels: 3, background: '#000'}}).composite(tiles).webp({quality: 88}).toFile(join(out, `${name}.webp`));
}

try {
 if (scenario === 'face') {
  const variants = variantsArg ? JSON.parse(variantsArg) : [
   {id: 'before', title: 'V2.0.1 (rosto unlit)', options: {faceSkin: false}},
   {id: 'after', title: 'pele iluminada', options: {faceSkin: true}},
  ];
  const views = [
   {id: 'front-full', title: 'frontal · corpo', view: {azimuth: 0, zoom: 0}},
   {id: 'three-quarter-full', title: '3/4 (palco) · corpo', view: {azimuth: 8, zoom: 0}},
   {id: 'front-face', title: 'frontal · rosto', view: {azimuth: 0, zoom: .86}},
   {id: 'three-quarter-face', title: '3/4 (palco) · rosto', view: {azimuth: 8, zoom: .86}},
   {id: 'profile-face', title: 'quase perfil · rosto', view: {azimuth: 38, zoom: .86}},
  ];
  const picked = viewsArg ? views.filter((v) => viewsArg.split(',').includes(v.id)) : views;
  const page = await openHarness(), files = {};
  for (const variant of variants) files[variant.id] = await shoot(page, variant.id, variant.options, picked);
  await sheet('face-before-after', variants, picked, files);
  await page.close();
 }
 if (stageUrl) {
  const page = await browser.newPage({viewport: {width: 1280, height: 720}, deviceScaleFactor: 1}), stageErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') stageErrors.push(m.text()); }); page.on('pageerror', (e) => stageErrors.push(String(e)));
  await page.goto(`${stageUrl}/experimentos/`);
  await page.waitForSelector('[data-hsin-stage][data-state="ready"]', {timeout: 180000});
  await page.click('[data-stage-pause]'); await page.waitForTimeout(800);
  const root = await page.evaluate(() => { const r = document.querySelector('[data-hsin-stage]'); return {state: r.dataset.state, pixelRatio: r.dataset.pixelRatio, modelBytes: r.dataset.modelBytes}; });
  await page.screenshot({path: join(out, 'stage-real-page.png')});
  report.stage = {...root, errors: stageErrors}; await page.close();
 }
} finally { await browser.close(); server.close(); }
report.errors = errors; await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify({renderer: report.renderer, shots: report.shots.length, harnessErrors: errors.length, stage: report.stage}, null, 1));
if (errors.length || report.stage?.errors?.length) { console.error(errors.concat(report.stage?.errors ?? []).join('\n')); process.exit(1); }
