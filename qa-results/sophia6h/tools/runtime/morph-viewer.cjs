// node morph-viewer.cjs MODELO.glb SAIDA_DIR  — renderiza Blink/expressões/5 clipes no renderer real (gltf-gl.js)
// e mede diferenças de pixel na região dos olhos/boca entre pesos 0 e 1 (prova de que o morph é visível).
const fs = require('fs'), http = require('http'), path = require('path'), { chromium } = require('playwright');
const REPO = path.resolve(__dirname, '../../../..');
// EXP_DIR: pasta alternativa com gltf-gl.js/gltf-skel.js (ex.: versão anterior, para teste de regressão)
const EXP_DIR = process.env.EXP_DIR ? path.resolve(process.env.EXP_DIR) : path.join(REPO, 'public', 'experimental');
const ONLY_REST = !!process.env.ONLY_REST;
(async () => {
  const glb = path.resolve(process.argv[2]); const out = path.resolve(process.argv[3]); fs.mkdirSync(out, { recursive: true });
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(req.url.split('?')[0]); let p;
    if (u === '/v.html') p = path.join(__dirname, 'morph-viewer.html');
    else if (u === '/m.glb') p = glb;
    else if (u.startsWith('/experimental/') && u.endsWith('.js')) p = path.join(EXP_DIR, u.slice('/experimental/'.length));
    if (!p || !fs.existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'application/octet-stream');
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 640 } });
  const errs = []; page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); }); page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/v.html`); await page.waitForFunction(() => window.ready);
  const info = await page.evaluate(() => window.load('/m.glb'));
  const shots = [];
  const shoot = async (name, spec) => { const r = await page.evaluate((s) => window.frame(s), { ...spec, png: true }); const f = path.join(out, name + '.png');
    fs.writeFileSync(f, Buffer.from(r.png.split(',')[1], 'base64')); delete r.png; shots.push({ name, spec, ...r }); return f; };
  const W = (b, s, br, m) => [b, s, br, m];
  await shoot('rest_neutral', { override: W(0, 0, 0, 0) });
  if (ONLY_REST) {
    await shoot('rest_body', { cam: { fov: 0.66, y: 0.5, dist: 2.6 } });
    for (const clip of info.clips) await shoot(`clip_${clip}_body`, { clip, t: .5, cam: { fov: 0.66, y: 0.5, dist: 2.6 } });
    fs.writeFileSync(path.join(out, 'morph_runtime.json'), JSON.stringify({ glb: path.basename(glb), info, shots, consoleErrors: errs }, null, 1));
    console.log(JSON.stringify({ info, errs })); await browser.close(); server.close(); return;
  }
  await shoot('blink_1', { override: W(1, 0, 0, 0) });
  await shoot('smile_1', { override: W(0, 1, 0, 0) });
  await shoot('browraise_1', { override: W(0, 0, 1, 0) });
  await shoot('mouthopen_1', { override: W(0, 0, 0, 1) });
  await shoot('blink_smile_brow', { override: W(1, .7, .5, 0) });
  await shoot('smile_mouthopen', { override: W(0, .8, 0, .6) });
  await shoot('all_1', { override: W(1, 1, 1, 1) });
  await shoot('profile_L_blink', { override: W(1, 0, 0, 0), yaw: Math.PI / 2 });
  // clipes: pico de Blink do clipe (sem override) e um quadro médio
  const clipInfo = [];
  for (const clip of info.clips) {
    let best = { t: 0, b: -1 };
    for (let i = 0; i <= 60; i += 1) { const r = await page.evaluate((s) => window.frame(s), { clip, t: i / 60 }); if (r.fromClip[0] > best.b) best = { t: i / 60, b: r.fromClip[0] }; }
    await shoot(`clip_${clip}_blinkpeak`, { clip, t: best.t });
    await shoot(`clip_${clip}_body`, { clip, t: .5, cam: { fov: 0.66, y: 0.5, dist: 2.6 } });
    await shoot(`clip_${clip}_expr_smile`, { clip, t: best.t, expr: { smile: .7, browRaise: .3, mouthOpen: .2 } });
    await shoot(`clip_${clip}_noblink_frame`, { clip, t: best.t, override: [0, 0, 0, 0] });
    clipInfo.push({ clip, blinkPeak: best.b, at: best.t });
  }
  const perf = {}; for (const c of info.clips) perf[c] = await page.evaluate((c) => window.perf(c), c);
  fs.writeFileSync(path.join(out, 'morph_runtime.json'), JSON.stringify({ glb: path.basename(glb), info, clipInfo, shots, perf, consoleErrors: errs }, null, 1));
  console.log(JSON.stringify({ info, clipInfo, perf, errs }, null, 1));
  await browser.close(); server.close();
})();
