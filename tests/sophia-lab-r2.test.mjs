// Sophia Lab R2 — registro de modelo por variante, clipes de uma execução, diretor de gestos e fallback.
// API-level (sem shaders, sem aprovação visual). O GLB do lab é privado: os testes que o usam só rodam com
// SOPHIA_LAB_R2_MODEL=/caminho/Sophia_Lab_v1.1_Animated.glb.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import { execSync } from 'node:child_process';
import { browserFixture, ActorElement, flush } from './sophia-r15-fixture.mjs';

const LAB = process.env.SOPHIA_LAB_R2_MODEL;
const DEFAULT_GLB = fs.readFileSync('public/assets/models/sophia/sophia-lab.glb');
const CLIPS = ['Lab_Idle_Breath_R1', 'Lab_Observe_R1', 'Lab_Think_R1', 'Lab_Point_R1', 'Lab_Greet_R1', 'Lab_Return_R1'];

test('estático: variante lab usa o modelo lab-r2 e mantém reserva; music e o MODEL_URL global não mudam', () => {
  const astro = fs.readFileSync('src/components/SophiaAnimation.astro', 'utf8');
  assert.match(astro, /'data-sophia-model-key': 'lab-r2'/);
  assert.match(astro, /'data-sophia-clip': 'Lab_Idle_Breath_R1'/);
  assert.match(astro, /'data-sophia-fallback-clip': 'Sophia_ExpressionFlow_R6'/);
  assert.match(astro, /variant === 'lab' && <script[^>]+sophia-lab-director\.js/);
  assert.match(astro, /: \{\};/, 'a variante music continua sem ator 3D');
  const actor = fs.readFileSync('public/experimental/sophia-actor.js', 'utf8');
  assert.match(actor, /export const MODEL_URL = '\/assets\/models\/sophia\/sophia-lab\.glb';/);
});

test('privacidade: nenhum GLB/blend do Lab R2 rastreado pelo Git', () => {
  const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n');
  assert.deepEqual(tracked.filter((f) => /sophia[-_]lab[-_]v1\.\d|Sophia_Lab_v1|\.blend1?$/i.test(f)), []);
});

test('diretor: gestos a cada 5–8 s simulados, sem repetir em sequência, sempre voltando ao repouso', async () => {
  const f = browserFixture([]); void f;
  const { createDirector, GESTURES, IDLE } = await import('../public/experimental/sophia-lab-director.js?t=sched');
  const played = []; let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const actor = { onTick: null, onEnd: null, clipByName: () => ({}), setClip(n) { played.push(n); } };
  const d = createDirector(actor, { rng });
  let t = 0, gestureStart = [], lastEnd = 0;
  for (let i = 0; i < 60 * 30 * 30; i++) {
    t += 1 / 30;
    if (d.current) { if (t - gestureStart.at(-1) >= 3) { actor.onEnd(); lastEnd = t; } } else { const before = played.length; actor.onTick(1 / 30); if (played.length > before) gestureStart.push(t); }
  }
  const gestures = played.filter((n) => n !== IDLE);
  assert.equal(gestures[0], 'Lab_Observe_R1');
  assert.ok(gestures.length > 40);
  for (let i = 1; i < gestures.length; i++) assert.notEqual(gestures[i], gestures[i - 1]);
  assert.ok(gestures.every((g) => GESTURES.includes(g)));
  const gaps = gestureStart.slice(1).map((s, i) => s - gestureStart[i] - 3);
  assert.ok(Math.min(...gaps) >= 5 - 0.05 && Math.max(...gaps) <= 8 + 0.05, `intervalos fora de 5–8 s: ${Math.min(...gaps)}–${Math.max(...gaps)}`);
  assert.ok(lastEnd > 0);
});

test('fallback: GLB do lab-r2 indisponível → modelo padrão com o clipe anterior, sem quebrar', async () => {
  const el = new ActorElement('lab', 'Lab_Idle_Breath_R1'); el.dataset.sophiaModelKey = 'lab-r2'; el.dataset.sophiaFallbackClip = 'Sophia_ExpressionFlow_R6';
  const f = browserFixture([el]); const urls = [];
  globalThis.fetch = async (u) => { urls.push(String(u)); return /sophia-lab-v1\.1/.test(u) ? new Response('nope', { status: 404 }) : new Response(DEFAULT_GLB); };
  const mod = await import('../public/experimental/sophia-actor.js?t=fallback');
  f.ios[0].trigger(true); await flush();
  const a = mod.actorOf(el); assert.ok(a, 'ator criado com o modelo padrão');
  assert.equal(a.cfgKey, 'default'); assert.equal(a.clipName, 'Sophia_ExpressionFlow_R6'); assert.equal(el.dataset.sophia3d, 'on'); assert.equal(el.dataset.sophiaModel, 'sophia-v1.4.2-lab');
  assert.ok(urls.some((u) => /sophia-lab-v1\.1/.test(u)) && urls.some((u) => /sophia-lab\.glb/.test(u)));
});

test('GLB e rede ausentes: ator falha limpo e a ilustração 2D permanece', async () => {
  const el = new ActorElement('lab', 'Lab_Idle_Breath_R1'); el.dataset.sophiaModelKey = 'lab-r2';
  const f = browserFixture([el]); globalThis.fetch = async () => { throw new Error('offline'); };
  const mod = await import('../public/experimental/sophia-actor.js?t=offline');
  f.ios[0].trigger(true); await flush();
  assert.equal(mod.actorOf(el), null); assert.equal(el.dataset.sophia3d, 'off'); assert.equal(el.dataset.sophiaFailed, 'true'); assert.equal(el.children.length, 0);
});

test('GLB real do Lab R2: 65 juntas, 6 clipes, clipes de uma execução não dão laço e o diretor volta ao repouso', { skip: !LAB && 'defina SOPHIA_LAB_R2_MODEL' }, async () => {
  const bytes = fs.readFileSync(LAB);
  const el = new ActorElement('lab', 'Lab_Idle_Breath_R1'); el.dataset.sophiaModelKey = 'lab-r2';
  const f = browserFixture([el]); globalThis.fetch = async () => new Response(bytes);
  const mod = await import('../public/experimental/sophia-actor.js?t=real');
  await import('../public/experimental/sophia-lab-director.js?t=real');
  f.ios[0].trigger(true); await flush();
  const a = mod.actorOf(el); assert.ok(a); assert.equal(a.cfgKey, 'lab-r2'); assert.equal(el.dataset.sophiaModel, 'sophia-lab-v1.1');
  assert.equal(a.sk.joints.length, 65); for (const c of CLIPS) assert.ok(a.sk.clips[c], c);
  document.dispatchEvent(new CustomEvent('sophia:actor-ready', { detail: { actor: a } })); // o fixture não propaga bubbling até o document
  assert.ok(a.director, 'diretor anexado no actor-ready');
  a.director.stop(); // o diretor trocaria de gesto no meio da medição
  a.setClip('Lab_Greet_R1'); assert.equal(a.layers.at(-1).loop, false);
  const dur = a.sk.clips.Lab_Greet_R1.duration; let ended = 0; a.onEnd = () => { ended++; a.setClip('Lab_Idle_Breath_R1'); };
  for (let i = 0; i < Math.ceil((dur + 1) * 30); i++) a.step(1 / 30);
  assert.equal(ended, 1, 'terminou exatamente uma vez'); assert.equal(a.clipName, 'Lab_Idle_Breath_R1'); assert.equal(a.layers.at(-1).loop, true);
  // sem NaN em nenhuma pose de nenhum clipe
  for (const c of CLIPS) { for (let t = 0; t <= a.sk.clips[c].duration; t += 1 / 15) { a.sk.evaluate([{ clip: a.sk.clips[c], time: t, weight: 1, loop: false }]); a.sk.updateWorld(); a.sk.updateSkin(); } assert.ok(a.sk.world.every(Number.isFinite), c); }
});
