// Local QA capture driver (Playwright + Chromium, SwiftShader on CPU when no GPU). Writes PNGs to --out.
// Usage: node scripts/sophia/qa/adornments-capture.mjs --out <dir>
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {extname, join, normalize} from 'node:path';
const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const root = new URL('../../../', import.meta.url).pathname;
const out = process.argv[process.argv.indexOf('--out') + 1] || '/tmp/sophia-adornments-qa';
await mkdir(out, {recursive: true});
const types = {'.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary'};
const srv = createServer(async (q, s) => {
  try { const p = normalize(decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (p.includes('..')) throw 0; const b = await readFile(join(root, p)); s.writeHead(200, {'Content-Type': types[extname(p)] || 'application/octet-stream'}); s.end(b); } catch { s.writeHead(404); s.end(); }
}).listen(0);
const port = srv.address().port;
const browser = await chromium.launch({args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
const page = await browser.newPage({viewport: {width: 900, height: 1100}});
const logs = []; page.on('console', m => logs.push(m.type() + ': ' + m.text())); page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.goto(`http://127.0.0.1:${port}/scripts/sophia/qa/adornments-harness.html`);
await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, {timeout: 120000});
const info = await page.evaluate(() => window.__QA.info()); console.log(JSON.stringify(info));
const shots = [
  ['01-idle-front', {clip: 'Idle', time: 0, yaw: 0}], ['02-idle-three-quarter', {clip: 'Idle', time: 0, yaw: 0.7}], ['03-idle-profile', {clip: 'Idle', time: 0, yaw: Math.PI / 2}], ['04-idle-back', {clip: 'Idle', time: 0, yaw: Math.PI}],
  ['05-write-props-front', {clip: 'Write', time: 1.0, yaw: 0, focus: 'props', dist: 0.75}], ['06-write-props-three-quarter', {clip: 'Write', time: 1.0, yaw: 0.6, focus: 'props', dist: 0.75}], ['07-write-props-profile', {clip: 'Write', time: 1.0, yaw: Math.PI / 2, focus: 'props', dist: 0.75}],
  ['08-write-props-off-front', {clip: 'Write', time: 1.0, yaw: 0, focus: 'props', dist: 0.75, props: {Book: false, Pen: false}}],
  ['05b-write-props-from-pen-side-three-quarter', {clip: 'Write', time: 1.0, yaw: -0.7, focus: 'props', dist: 0.75}], ['05c-write-props-from-pen-side-profile', {clip: 'Write', time: 1.0, yaw: -Math.PI / 2, focus: 'props', dist: 0.75}], ['05d-write-props-pen-side-late', {clip: 'Write', time: 2.2, yaw: -0.9, focus: 'props', dist: 0.6}],
  ['08b-write-pen-only-front', {clip: 'Write', time: 1.0, yaw: 0, focus: 'props', dist: 0.6, props: {Book: false, Pen: true}}], ['08c-write-pen-only-three-quarter', {clip: 'Write', time: 2.2, yaw: 0.5, focus: 'props', dist: 0.6, props: {Book: false, Pen: true}}], ['08d-write-book-only-front', {clip: 'Write', time: 1.0, yaw: 0, focus: 'props', dist: 0.6, props: {Book: true, Pen: false}}],
  ['09-write-body-front', {clip: 'Write', time: 1.6, yaw: 0}], ['10-wave-front', {clip: 'Wave', time: 0.6, yaw: 0}], ['11-walk-three-quarter', {clip: 'Walk', time: 0.25, yaw: 0.7}],
  ['12-forehead-front', {clip: 'Write', time: 0.0, yaw: 0, focus: 'head', dist: 0.6}], ['13-forehead-three-quarter', {clip: 'Write', time: 0.0, yaw: 0.55, focus: 'head', dist: 0.6}], ['14-forehead-profile', {clip: 'Write', time: 0.0, yaw: Math.PI / 2, focus: 'head', dist: 0.6}],
];
for (const [name, o] of shots) { const r = await page.evaluate(opts => window.__QA.shot(opts), o); await page.locator('#c').screenshot({path: join(out, name + '.png')}); console.log(name, JSON.stringify(r.target.map(v => +v.toFixed(3)))); }
console.log(logs.length ? logs.slice(0, 8).join('\n') : 'console: clean');
await browser.close(); srv.close();
