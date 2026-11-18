// Contrato estático da apresentadora da seção Método (R1): Sophia 3D pré-renderizada em WebP
// transparente por cima de um fluxograma SVG acessível. Prova ligações e guardas, não a aparência.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = p => readFile(new URL('../' + p, import.meta.url), 'utf8');
const comp = await read('src/components/MethodPresenter.astro');
const css = await read('src/styles/method-scene.css');
const docs = await read('docs/method-scene.md');
const LOOP = 'public/images/sophia/method-presenter-r1.webp';
const STILL = 'public/images/sophia/method-presenter-r1-still.webp';

test('o traje não é mais chamado de terno/terninho em lugar nenhum da cena', () => {
  assert.doesNotMatch(comp + css + docs, /terninho|terno\b/i);
  assert.match(comp, /traje acadêmico/i);
});

test('o fluxograma continua SVG/HTML acessível, com os mesmos nomes e a volta ao início', () => {
  for (const label of ['Concepção', 'Execução', 'Avaliação', 'Documentação']) assert.ok(comp.includes(label), label);
  for (const hint of ['dar forma à ideia', 'IA com restrições', 'checar o resultado', 'deixar um caminho', 'Revisar orienta o próximo passo.']) assert.ok(comp.includes(hint), hint);
  assert.match(comp, /<svg[^>]+class="method-presenter__projection"[^>]+aria-hidden="true"/);
  assert.match(comp, /role="img"/);
  assert.match(comp, /aria-label="[^"]*concepção[^"]*documentação[^"]*"/i);
  assert.match(comp, /method-presenter__link--return/);
});

test('tela, pedestal e projetor saíram do SVG: agora são objetos 3D no WebP (sem duplicar)', () => {
  assert.doesNotMatch(comp, /<rect x="14" y="26"[^>]*stroke="#375441"/);
  assert.doesNotMatch(comp, /M155 226V306/);
  assert.doesNotMatch(comp, /<rect x="26" y="290"/);
  assert.match(comp, /method-presenter__beam/);
});

test('o palco 3D é um <img> decorativo que usa o WebP animado só quando o movimento está liberado', () => {
  assert.match(comp, /<img[^>]+class="method-presenter__stage"/);
  assert.match(comp, /method-presenter-r1-still\.webp/);
  assert.match(comp, /method-presenter-r1\.webp/);
  assert.match(comp, /alt=""/);
  assert.match(comp, /data-motion-playing/);
  assert.doesNotMatch(comp, /\.glb|three|WebGL|getContext/i);
});

test('assets: WebP animado RGBA de 36 quadros e poster, abaixo do orçamento', async () => {
  const loop = await readFile(new URL('../' + LOOP, import.meta.url));
  assert.equal(loop.subarray(0, 4).toString(), 'RIFF');
  assert.equal(loop.subarray(8, 12).toString(), 'WEBP');
  assert.ok(loop.includes(Buffer.from('ANIM')) && loop.includes(Buffer.from('ALPH')), 'animado com canal alfa');
  assert.equal(loop.toString('latin1').split('ANMF').length - 1, 36);
  assert.ok(loop.length < 650 * 1024, `loop ${loop.length}`);
  const still = (await stat(new URL('../' + STILL, import.meta.url))).size;
  assert.ok(still < 60 * 1024, `poster ${still}`);
});

test('o ciclo de 20 s do fluxograma, o modo sério, o legado e o movimento reduzido continuam', () => {
  assert.equal((css.match(/\b20s\b/g) || []).length >= 5, true);
  assert.match(css, /html\[data-serious-mode='true'\] \.method-presenter\s*\{\s*filter:\s*grayscale\(1\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /max-width:\s*820px/);
  assert.match(css, /aspect-ratio:\s*500\s*\/\s*360/);
});

test('o palco cobre exatamente a viewBox 500×360 e não captura cliques', () => {
  assert.match(css, /\.method-presenter__stage\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0[^}]*pointer-events:\s*none/s);
});

test('o sprite 2D antigo não é mais referenciado', () => {
  assert.doesNotMatch(comp + css, /images\/sophia\/method-presenter\.webp|method-presenter-still\.webp|sophia-method-present/);
});
