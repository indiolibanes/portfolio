// Contrato estático da apresentadora da seção Método (R1): Sophia 3D pré-renderizada em WebP
// transparente por cima de um fluxograma SVG acessível. Prova ligações e guardas, não a aparência.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

const read = p => readFile(new URL('../' + p, import.meta.url), 'utf8');
const comp = await read('src/components/MethodPresenter.astro');
const css = await read('src/styles/method-scene.css');
const docs = await read('docs/method-scene.md');
const LOOP = 'public/images/sophia/method-presenter-r1-loop.webp';
const SCENE = 'public/images/sophia/method-presenter-r1-scene.webp';
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

test('o palco 3D tem duas camadas <img> decorativas: cenário e Sophia; o WebP animado só entra com o movimento liberado', () => {
  assert.match(comp, /<img[^>]+class="method-presenter__stage"/);
  assert.match(comp, /<img[^>]+class="method-presenter__sophia"/);
  assert.match(comp, /data-still="\/images\/sophia\/method-presenter-r1-still\.webp"/);
  assert.match(comp, /data-scene="\/images\/sophia\/method-presenter-r1-scene\.webp"/);
  assert.match(comp, /data-loop="\/images\/sophia\/method-presenter-r1-loop\.webp"/);
  assert.equal((comp.match(/alt=""/g) || []).length >= 2, true);
  assert.match(comp, /data-motion-playing/);
  assert.doesNotMatch(comp, /\.glb|three|WebGL|getContext/i);
});

test('a camada da Sophia nasce sem src (não baixa o loop) e escondida até o movimento começar', () => {
  const tag = comp.match(/<img[^>]+class="method-presenter__sophia"[^>]*>/s)?.[0] ?? '';
  assert.ok(tag, 'camada da Sophia');
  assert.doesNotMatch(tag, /\ssrc=/);
  assert.match(tag, /\bhidden\b/);
});

test('o script sincroniza o WebP de 20 s com os 20 s do fluxograma ao entrar em movimento', () => {
  assert.match(comp, /getAnimations/);
  assert.match(comp, /currentTime\s*=\s*0/);
  assert.match(comp, /decode\(\)/);
  assert.match(comp, /astro:before-swap/);
});

const durations = buf => {
  const out = [];
  for (let i = 12; i + 8 <= buf.length; ) {
    const id = buf.subarray(i, i + 4).toString('latin1');
    const size = buf.readUInt32LE(i + 4);
    if (id === 'ANMF') out.push(buf.readUIntLE(i + 8 + 12, 3));
    i += 8 + size + (size & 1);
  }
  return out;
};

test('assets: loop animado RGBA de 20 s exatos, cenário e poster, abaixo do orçamento', async () => {
  const loop = await readFile(new URL('../' + LOOP, import.meta.url));
  assert.equal(loop.subarray(0, 4).toString(), 'RIFF');
  assert.equal(loop.subarray(8, 12).toString(), 'WEBP');
  assert.ok(loop.includes(Buffer.from('ANIM')) && loop.includes(Buffer.from('ALPH')), 'animado com canal alfa');
  const d = durations(loop);
  assert.ok(d.length >= 80 && d.length <= 140, `quadros ${d.length}`);
  assert.equal(d.reduce((a, b) => a + b, 0), 20000, 'soma das durações = ciclo de 20 s');
  assert.ok(Math.min(...d) >= 20, 'nenhum quadro abaixo de 20 ms');
  assert.ok(loop.length < 700 * 1024, `loop ${loop.length}`);
  const scene = await readFile(new URL('../' + SCENE, import.meta.url));
  assert.equal(scene.toString('latin1').split('ANMF').length - 1, 0, 'cenário estático');
  assert.ok(scene.length < 40 * 1024, `cenário ${scene.length}`);
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

test('o cenário cobre a viewBox 500×360 e a camada da Sophia ocupa o recorte do loop; nenhuma captura cliques', () => {
  assert.match(css, /\.method-presenter__stage\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0[^}]*pointer-events:\s*none/s);
  assert.match(css, /\.method-presenter__sophia\s*\{[^}]*position:\s*absolute[^}]*left:\s*6\.944%[^}]*top:\s*26\.570%[^}]*width:\s*66\.667%[^}]*height:\s*73\.43%[^}]*pointer-events:\s*none/s);
  assert.match(css, /\.method-presenter__sophia\[hidden\]\s*\{\s*display:\s*none/);
});

test('o sprite 2D antigo não é mais referenciado', () => {
  assert.doesNotMatch(comp + css, /images\/sophia\/method-presenter\.webp|method-presenter-still\.webp|sophia-method-present/);
});
