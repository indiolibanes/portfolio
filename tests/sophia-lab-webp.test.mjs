// Contrato estático da Sophia Laboratório v1.2.1 em WebP animado (home, seção #lab).
// Prova ligação, acessibilidade, carga sob demanda e ausência de 3D. NÃO prova a aparência.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const dir = new URL('public/assets/characters/sophia/lab/v1.2.1/', root);
const WEBP = 'sophia-lab-v121-write-384.webp';
const PNG = 'sophia-lab-v121-write-384.png';

test('só os dois assets autorizados são públicos, íntegros e com as dimensões 352×384', async () => {
  assert.deepEqual((await readdir(dir)).sort(), [PNG, WEBP].sort());
  const sha = async f => createHash('sha256').update(await readFile(new URL(f, dir))).digest('hex');
  assert.equal(await sha(WEBP), 'f966560b45f18bd98a7338061e1e70dc4db1b293ef09a43240e72d14ca8eace1');
  assert.equal(await sha(PNG), '48341e1ddb1bb74d9f7502ecfc2a720d3963be977ca0aa22d0f7c8c9ab3e46ba');
  const w = await readFile(new URL(WEBP, dir));
  assert.equal(w.toString('latin1', 0, 4), 'RIFF');
  assert.equal(w.toString('latin1', 8, 16), 'WEBPVP8X');
  assert.equal(w[20] & 0x02, 0x02, 'flag de animação');
  assert.equal(w[20] & 0x10, 0x10, 'flag de alfa (transparência)');
  assert.equal(w.readUIntLE(24, 3) + 1, 352);
  assert.equal(w.readUIntLE(27, 3) + 1, 384);
  const p = await readFile(new URL(PNG, dir));
  assert.equal(p.readUInt32BE(16), 352);
  assert.equal(p.readUInt32BE(20), 384);
  assert.equal(p[25], 6, 'PNG RGBA');
});

test('componente: PNG primeiro, WebP sob demanda, sem 3D, sem GLB, sem WebGL', async () => {
  const c = await read('src/components/SophiaLabWebP.astro') + await read('src/scripts/sophia-lab-webp-r3.js');
  assert.match(c, /<img[^>]*src=\{stillSrc\}/s, 'o PNG é o src inicial (funciona sem JavaScript)');
  assert.match(c, /width=\{width\}/);
  assert.match(c, /height=\{height\}/);
  assert.match(c, /loading="lazy"/);
  assert.match(c, /decoding="async"/);
  assert.match(c, /IntersectionObserver/);
  assert.match(c, /prefers-reduced-motion: reduce/);
  assert.match(c, /saveData/);
  assert.match(c, /visibilitychange/);
  assert.match(c, /pagehide/);
  assert.match(c, /onerror|addEventListener\('error'/);
  assert.doesNotMatch(c, /three|WebGL|getContext|\.glb|sophia-actor|sophia-lab-director|data-sophia-actor|data-decorative-motion/i);
  assert.doesNotMatch(c, /https?:\/\//);
});

test('componente: sem observadores duplicados (um observer, um conjunto de ouvintes globais)', async () => {
  const c = await read('src/components/SophiaLabWebP.astro') + await read('src/scripts/sophia-lab-webp-r3.js');
  assert.equal((c.match(/new IntersectionObserver/g) || []).length, 1);
  assert.equal((c.match(/addEventListener\('visibilitychange'/g) || []).length, 1);
  assert.equal((c.match(/addEventListener\('pagehide'/g) || []).length, 1);
});

test('home: só a instância do laboratório trocou; a antiga Sophia 3D do #lab não é mais montada', async () => {
  const home = await read('src/pages/index.astro');
  assert.match(home, /import SophiaLabWebP from '..\/components\/SophiaLabWebP\.astro'/);
  const companion = home.slice(home.indexOf('<div class="lab-companion">'), home.indexOf('<nav class="work-index"'));
  assert.match(companion, /<SophiaLabWebP/);
  assert.match(companion, /\/assets\/characters\/sophia\/lab\/r3\/sophia-lab-v121-write-384-r3\.webp/);
  assert.match(companion, /\/assets\/characters\/sophia\/lab\/r3\/sophia-lab-v121-write-384-r3\.png/);
  assert.doesNotMatch(companion, /SophiaAnimation/);
  assert.match(companion, /class="lab-sophia-guide" href="\/sophia\/"/, 'o link para a página da Sophia permanece');
  assert.doesNotMatch(home, /<SophiaAnimation variant="lab"/);
  assert.match(home, /<SophiaCorrida/, 'a corredora segue no lugar, com seus módulos compartilhados');
});

test('SophiaAnimation.astro não foi alterado globalmente (variante lab continua definida para outras rotas)', async () => {
  const a = await read('src/components/SophiaAnimation.astro');
  assert.match(a, /'data-sophia-model-key': 'lab-r2'/);
  assert.match(a, /variant === 'lab' && <script[^>]+sophia-lab-director\.js/);
});

test('CSS: o quadro mantém a mesma caixa quadrada e as mesmas larguras da Sophia 2D', async () => {
  const css = await read('src/styles/editorial.css');
  assert.match(css, /\.lab-companion \.sophia-lab-webp \{ width: clamp\(220px, 22vw, 280px\)/);
  assert.match(css, /\.lab-companion \.sophia-lab-webp \{ width: 220px/);
  assert.match(css, /\.lab-companion \.sophia-lab-webp \{ width: min\(100%, 180px\)/);
  assert.match(css, /\.sophia-lab-webp[^{]*\{[^}]*aspect-ratio: 1/);
});
