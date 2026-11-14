// Pré-R2 — ciclo de vida do runtime de atores 3D (nível CPU: sem shaders, sem decodificação real de imagem).
// Cada teste reproduz um defeito medido em Chromium (docs/characters/sophia-pre-r2/): contexto WebGL criado antes de saber se
// o GLB existe, uma falha de desenho derrubando todos os atores, ator registrado depois de falhar, perda de contexto
// reconstruindo palcos saudáveis, e o contrato dos clipes opcionais do caderno. Nada aqui afirma desempenho ou aparência.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { browserFixture, ActorElement, flush } from './sophia-r15-fixture.mjs';

const DEFAULT_GLB = fs.readFileSync('public/assets/models/sophia/sophia-lab.glb');
const ok = (bytes = DEFAULT_GLB) => new Response(bytes);
const state = (el) => `${el.dataset.sophia3d}${el.dataset.sophiaFailed ? '/failed' : ''}`;

test('modelo não publicado: sem requisição ao GLB do lab-r2, 1 contexto, clipe de reserva', async () => {
  const el = new ActorElement('lab', 'Lab_Idle_Breath_R1'); el.dataset.sophiaModelKey = 'lab-r2'; el.dataset.sophiaFallbackClip = 'Sophia_ExpressionFlow_R6';
  const f = browserFixture([el]); const urls = []; globalThis.fetch = async (u) => { urls.push(String(u)); return ok(); };
  const mod = await import('../public/experimental/sophia-actor.js?t=unpublished');
  assert.equal(mod.MODELS['lab-r2'].published, false, 'o GLB do R2 ainda não foi autorizado');
  f.ios[0].trigger(true); await flush();
  assert.deepEqual(urls, ['/assets/models/sophia/sophia-lab.glb']);
  assert.equal(f.glCanvases, 1); assert.equal(el.dataset.sophia3d, 'on'); assert.equal(mod.actorOf(el).clipName, 'Sophia_ExpressionFlow_R6');
});

test('rede cai: nenhum contexto WebGL, ilustração 2D permanece', async () => {
  const els = [new ActorElement('runner', 'Correr_R6'), new ActorElement('lab', 'Sophia_ExpressionFlow_R6')];
  const f = browserFixture(els); globalThis.fetch = async () => { throw new Error('offline'); };
  await import('../public/experimental/sophia-actor.js?t=net'); f.ios[0].trigger(true); await flush();
  assert.equal(f.glCanvases, 0);
  for (const el of els) { assert.equal(state(el), 'off/failed'); assert.equal(el.children.length, 0); }
});

test('corpo que não é GLB e GLB truncado: nenhum contexto WebGL e erro limpo', async () => {
  for (const [label, body] of [['html', Buffer.from('<!doctype html><title>404</title>'.repeat(20))], ['truncado', DEFAULT_GLB.subarray(0, 2_000_000)]]) {
    const el = new ActorElement('runner', 'Correr_R6'); const f = browserFixture([el]); globalThis.fetch = async () => ok(body);
    await import('../public/experimental/sophia-actor.js?t=bad-' + label); f.ios[0].trigger(true); await flush();
    assert.equal(f.glCanvases, 0, label); assert.equal(state(el), 'off/failed', label); assert.equal(el.children.length, 0, label);
  }
});

test('GLB corrompido depois do cabeçalho: o contexto criado é liberado, não só os buffers', async () => {
  const el = new ActorElement('runner', 'Correr_R6'); const f = browserFixture([el]);
  const bad = Buffer.from(DEFAULT_GLB); bad.fill(0, 40, 400); // cabeçalho válido, JSON destruído
  globalThis.fetch = async () => ok(bad);
  let released = 0;
  const create = document.createElement; document.createElement = (...a) => { const c = create(...a); const get = c.getContext.bind(c); c.getContext = (t, ...r) => { const g = get(t, ...r); if (t === 'webgl2') { const base = g; return new Proxy(base, { get: (o, k) => (k === 'getExtension' ? (n) => (n === 'WEBGL_lose_context' ? { loseContext() { released++; } } : null) : o[k]) }); } return g; }; return c; };
  await import('../public/experimental/sophia-actor.js?t=corrupt'); f.ios[0].trigger(true); await flush();
  assert.equal(state(el), 'off/failed'); assert.ok(f.glCanvases >= 1 ? released >= 1 : true, 'todo contexto criado foi liberado');
});

test('um ator que lança erro no desenho é desligado sozinho; os demais continuam animando', async () => {
  const els = [new ActorElement('runner', 'Correr_R6'), new ActorElement('lab', 'Sophia_ExpressionFlow_R6')];
  const f = browserFixture(els); globalThis.fetch = async () => ok();
  const mod = await import('../public/experimental/sophia-actor.js?t=isolation'); f.ios[0].trigger(true); await flush();
  const [runner, lab] = els.map(mod.actorOf); assert.ok(runner && lab);
  lab.draw = () => { throw new Error('falha injetada'); };
  f.pump(1000); f.pump(1034); // o laço NÃO pode morrer
  assert.equal(state(els[1]), 'off/failed'); assert.equal(mod.actorOf(els[1]), null); assert.equal(els[1].children.length, 0);
  assert.equal(els[0].dataset.sophia3d, 'on'); assert.equal(f.rafs.size, 1, 'o laço de rAF continua agendado');
  const before = runner.ctx.draws; f.pump(1100); f.pump(1140); assert.ok(runner.ctx.draws > before, 'o ator saudável continua desenhando');
});

test('primeiro desenho falha: o ator não fica registrado e a arte 2D permanece', async () => {
  const els = [new ActorElement('runner', 'Correr_R6'), new ActorElement('lab', 'Sophia_ExpressionFlow_R6')];
  const f = browserFixture(els); globalThis.fetch = async () => ok();
  const mod = await import('../public/experimental/sophia-actor.js?t=firstdraw'); mod.Actor.prototype.draw = () => { throw new Error('primeiro quadro falha'); };
  f.ios[0].trigger(true); await flush();
  for (const el of els) { assert.equal(state(el), 'off/failed'); assert.equal(mod.actorOf(el), null, 'sem ator fantasma'); assert.equal(el.children.length, 0); }
  assert.equal(f.rafs.size, 0);
});

test('perda de contexto é isolada por modelo: só o palco perdido é refeito', async () => {
  const lab = new ActorElement('lab', 'Sophia_ExpressionFlow_R6'); lab.dataset.sophiaModelKey = 'lab-r2';
  const runner = new ActorElement('runner', 'Correr_R6');
  const f = browserFixture([runner, lab]); let fetches = 0; globalThis.fetch = async () => { fetches++; return ok(); };
  const mod = await import('../public/experimental/sophia-actor.js?t=scoped'); mod.MODELS['lab-r2'].published = true; // dois palcos reais
  f.ios[0].trigger(true); await flush();
  assert.equal(f.glCanvases, 2); assert.equal(fetches, 2);
  const runnerActor = mod.actorOf(runner), labActor = mod.actorOf(lab); assert.notEqual(runnerActor.stage, labActor.stage);
  const labCanvas = labActor.stage.renderer.canvas;
  labCanvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
  assert.equal(lab.dataset.sophia3d, 'off'); assert.equal(runner.dataset.sophia3d, 'on', 'o outro palco segue ligado');
  assert.equal(f.rafs.size, 1, 'o laço continua para o ator saudável'); const draws = runnerActor.ctx.draws; f.pump(1000); f.pump(1034); assert.ok(runnerActor.ctx.draws > draws);
  labCanvas.dispatchEvent(new Event('webglcontextrestored')); await flush();
  assert.equal(lab.dataset.sophia3d, 'on'); assert.equal(f.glCanvases, 3, 'só um contexto novo (antes eram dois)'); assert.equal(fetches, 2, 'os bytes do GLB não foram baixados de novo');
  assert.equal(mod.actorOf(runner), runnerActor, 'o ator saudável não foi recriado'); assert.notEqual(mod.actorOf(lab), labActor);
});

// ------------------------------------------------------------------ contrato dos clipes opcionais do caderno
const { BOOK_CLIPS, BOOK_ONE_SHOT, bookCapability, bookPhases } = await import('../public/experimental/sophia-clip-contract.js');
const { createDirector, GESTURES } = await import('../public/experimental/sophia-lab-director.js?t=contract');
const ALL = Object.values(BOOK_CLIPS).map((c) => c.name);
const LIBRARY = ['Lab_Idle_Breath_R1', 'Lab_Observe_R1', 'Lab_Think_R1', 'Lab_Point_R1', 'Lab_Greet_R1', 'Lab_Return_R1'];

function simulate({ clips, book, seed = 3, seconds = 600 }) {
  let s = seed; const rng = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const has = new Set(clips); const played = []; const props = [];
  let oneShotLeft = 0;
  const actor = { cfg: {}, onTick: null, onEnd: null, clipByName: (n) => (has.has(n) ? {} : null), setProps: (l) => props.push([...l]),
    setClip(n) { played.push(n); oneShotLeft = (BOOK_ONE_SHOT.includes(n) || GESTURES.includes(n)) ? 1.2 : 0; } };
  const d = createDirector(actor, { rng, book });
  for (let t = 0; t < seconds; t += 0.1) { if (oneShotLeft > 0) { oneShotLeft -= 0.1; if (oneShotLeft <= 0) actor.onEnd(); } else actor.onTick(0.1); }
  return { played, props, d };
}

test('contrato: nomes combinados, obrigatórios e opcional, imutável', () => {
  assert.deepEqual(ALL, ['Lab_Book_Equip_P1', 'Lab_HoldBook_P1', 'Lab_Write_P1', 'Lab_PauseRead_P1', 'Lab_Book_Unequip_P1']);
  assert.ok(Object.isFrozen(BOOK_CLIPS)); assert.deepEqual([...BOOK_ONE_SHOT].sort(), ['Lab_Book_Equip_P1', 'Lab_Book_Unequip_P1']);
  assert.deepEqual(bookCapability(() => false).missing, ALL.filter((n) => n !== 'Lab_PauseRead_P1'));
  assert.equal(bookCapability((n) => n !== 'Lab_PauseRead_P1' && ALL.includes(n)).available, true, 'a pausa de leitura é opcional');
  assert.deepEqual(bookPhases(bookCapability(() => false)), [], 'sem clipes nenhuma fase existe');
});

test('contrato: o modelo lab-r2 mantém a cena do caderno DESLIGADA e a biblioteca atual intacta', async () => {
  const f = browserFixture([]); void f; const mod = await import('../public/experimental/sophia-actor.js?t=cfg');
  assert.equal(mod.MODELS['lab-r2'].bookScene, false); assert.equal(mod.MODELS['lab-r2'].published, false);
  for (const n of LIBRARY.filter((c) => c !== 'Lab_Idle_Breath_R1')) assert.ok(mod.MODELS['lab-r2'].oneShot.has(n), n);
  for (const n of BOOK_ONE_SHOT) assert.ok(mod.MODELS['lab-r2'].oneShot.has(n), n);
  assert.ok(!mod.MODELS['lab-r2'].oneShot.has('Lab_Write_P1') && !mod.MODELS['lab-r2'].oneShot.has('Lab_HoldBook_P1'), 'laços não são de uma execução');
});

test('sem os clipes (ou sem ligar bookScene) o diretor se comporta como antes', () => {
  const library = simulate({ clips: LIBRARY, book: true }); // clipes ausentes
  assert.ok(library.played.every((n) => !ALL.includes(n)) && library.props.length === 0);
  assert.equal(library.d.capability.available, false); assert.deepEqual(library.d.capability.missing.sort(), ALL.filter((n) => n !== 'Lab_PauseRead_P1').sort());
  const off = simulate({ clips: [...LIBRARY, ...ALL] }); // clipes presentes, mas a cena não foi ligada pelo modelo
  assert.ok(off.played.every((n) => !ALL.includes(n)) && off.props.length === 0);
});

test('com os clipes e a cena ligada: Equip → Hold → Write → Unequip, adereços só durante a cena, volta ao repouso', () => {
  const r = simulate({ clips: [...LIBRARY, ...ALL.filter((n) => n !== 'Lab_PauseRead_P1')], book: true });
  const i = r.played.indexOf('Lab_Book_Equip_P1'); assert.ok(i >= 0, 'a cena acontece');
  assert.deepEqual(r.played.slice(i, i + 5), ['Lab_Book_Equip_P1', 'Lab_HoldBook_P1', 'Lab_Write_P1', 'Lab_Book_Unequip_P1', 'Lab_Idle_Breath_R1']);
  assert.ok(!r.played.includes('Lab_PauseRead_P1'));
  assert.deepEqual(r.props.slice(0, 4), [['book'], ['book'], ['book', 'pen'], ['book']]); assert.deepEqual(r.props.slice(0, 5)[4] ?? [], []);
  for (let k = 1; k < r.played.length; k++) assert.ok(!(r.played[k] === r.played[k - 1] && ALL.includes(r.played[k])), 'sem repetir clipe consecutivo');
});

test('com a pausa de leitura presente ela entra entre duas escritas', () => {
  const r = simulate({ clips: [...LIBRARY, ...ALL], book: true });
  const i = r.played.indexOf('Lab_Book_Equip_P1');
  assert.deepEqual(r.played.slice(i, i + 7), ['Lab_Book_Equip_P1', 'Lab_HoldBook_P1', 'Lab_Write_P1', 'Lab_PauseRead_P1', 'Lab_Write_P1', 'Lab_Book_Unequip_P1', 'Lab_Idle_Breath_R1']);
});
