// Sophia Lab R2 v1.2 — ciclo de 12 s (fiel ao 2D): contrato, diretor e (opcional) GLB real. Sem shaders nem aprovação visual.
// Testes com o GLB (privado) só rodam com SOPHIA_LAB_R2_MODEL=/caminho/Sophia_Lab_v1.2_Animated.glb.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { browserFixture, ActorElement, flush } from './sophia-r15-fixture.mjs';
import { CYCLE_CLIPS, CYCLE_TIMELINE, CYCLE_SECONDS, CYCLE_ONE_SHOT, cycleCapability } from '../public/experimental/sophia-clip-contract.js';

const LAB = process.env.SOPHIA_LAB_R2_MODEL;

function fakeActor({ speed = 0.09, clips = Object.values(CYCLE_CLIPS), cycle = true } = {}) {
  const log = [];
  const actor = {
    cfg: { cycle }, root: { x: 0, z: 0 }, yawTarget: null, onTick: null, onEnd: null, props: [],
    clipByName: (n) => (clips.includes(n) ? { name: n, duration: n === CYCLE_CLIPS.notice ? 0.92 : 1, extras: n === CYCLE_CLIPS.walk ? { rootMotion: { speedModelUnitsPerSecond: speed } } : {} } : null),
    setClip(n) { log.push(n); this.clip = n; }, setProps(l) { this.props = l; }, log,
  };
  return actor;
}

test('contrato do ciclo: 12 s exatos como o 2D, uma volta simétrica, clipes de uma execução listados', () => {
  assert.equal(Math.round(CYCLE_SECONDS * 1000) / 1000, 12);
  assert.deepEqual(CYCLE_TIMELINE.map((p) => p.id), ['write-a', 'walk-left', 'think-left', 'turn-right', 'walk-right', 'think-right', 'turn-left']);
  const pct = (id) => CYCLE_TIMELINE.find((p) => p.id === id).secs / 12 * 100;
  assert.equal(pct('write-a').toFixed(1), '8.0'); assert.equal(pct('walk-left').toFixed(1), '32.0'); assert.equal(pct('think-left').toFixed(1), '12.0'); assert.equal(pct('turn-right').toFixed(1), '2.0');
  assert.deepEqual([...CYCLE_ONE_SHOT].sort(), [CYCLE_CLIPS.notice, CYCLE_CLIPS.think, CYCLE_CLIPS.turn].sort());
  assert.equal(cycleCapability(() => true).available, true);
  assert.deepEqual(cycleCapability((n) => n !== CYCLE_CLIPS.walk).missing, [CYCLE_CLIPS.walk]);
  const sum = CYCLE_TIMELINE.reduce((s, p) => s + p.dir * p.secs, 0); assert.equal(sum, 0, 'anda tanto para a esquerda quanto para a direita');
});

test('diretor do ciclo: percurso fecha a cada volta, sem deriva em 200 ciclos; sentido e olhar corretos', async () => {
  browserFixture([]);
  const { createDirector } = await import('../public/experimental/sophia-lab-director.js?t=cycle1');
  const a = fakeActor(); const d = createDirector(a);
  assert.equal(d.mode, 'cycle'); assert.deepEqual(a.props, ['book', 'pen']);
  const half = d.half; assert.ok(half > 0.1 && half < 0.25, `meio percurso ${half}`);
  assert.equal(a.root.x, half, 'começa à direita (o 2D começa escrevendo à direita)');
  const seen = []; let prevX = a.root.x; let minX = 1, maxX = -1; const dt = 1 / 30;
  for (let i = 0; i < 12 * 30 * 200; i++) {
    a.onTick(dt);
    if (!seen.length || seen.at(-1) !== d.current) seen.push(d.current);
    minX = Math.min(minX, a.root.x); maxX = Math.max(maxX, a.root.x);
    if (d.current === 'walk-left') assert.ok(a.root.x <= prevX + 1e-12, 'esquerda = x decrescente');
    if (d.current === 'walk-right') assert.ok(a.root.x >= prevX - 1e-12, 'direita = x crescente');
    prevX = a.root.x;
  }
  assert.ok(Math.abs(minX + half) < 1e-9 && Math.abs(maxX - half) < 1e-9, 'extremos exatamente ±half');
  assert.deepEqual(seen.slice(0, 8), ['write-a', 'walk-left', 'think-left', 'turn-right', 'walk-right', 'think-right', 'turn-left', 'write-a']);
  assert.equal(a.log.filter((n) => n === CYCLE_CLIPS.walk).length, 400, 'dois andares por ciclo, 200 ciclos de 12 s exatos');
});

test('diretor do ciclo: velocidade de solo = a declarada pelo clipe (pés sem deslizar) fora das rampas', async () => {
  browserFixture([]);
  const { createDirector } = await import('../public/experimental/sophia-lab-director.js?t=cycle2');
  const a = fakeActor({ speed: 0.0903 }); const d = createDirector(a); const dt = 1 / 60;
  let t = 0; while (d.current !== 'walk-left') { a.onTick(dt); t += dt; }
  let x0 = a.root.x; for (let i = 0; i < 60 * 1.5; i++) a.onTick(dt); // 1,5 s dentro da caminhada (já fora da rampa de 0,3 s)
  const mid0 = a.root.x; for (let i = 0; i < 60 * 1; i++) a.onTick(dt);
  assert.ok(Math.abs((mid0 - a.root.x) / 1 - 0.0903) < 1e-4, `velocidade ${(mid0 - a.root.x)}`); assert.ok(x0 > a.root.x);
});

test('diretor do ciclo: notice pausa, toca Notice no lugar e retoma a mesma fase; cooldown evita repique', async () => {
  browserFixture([]);
  const { createDirector } = await import('../public/experimental/sophia-lab-director.js?t=cycle3');
  const a = fakeActor(); const d = createDirector(a); const dt = 1 / 30;
  while (d.current !== 'walk-left') a.onTick(dt);
  for (let i = 0; i < 40; i++) a.onTick(dt);
  const x = a.root.x, phase = d.current;
  assert.equal(d.notice(), true); assert.equal(a.clip, CYCLE_CLIPS.notice); assert.equal(d.paused, true);
  assert.equal(d.notice(), false, 'já em notice');
  for (let i = 0; i < 20; i++) a.onTick(dt);
  assert.equal(a.root.x, x, 'parado durante o pulo'); assert.equal(d.current, phase);
  for (let i = 0; i < 12; i++) a.onTick(dt);
  assert.equal(d.paused, false); assert.equal(a.clip, CYCLE_CLIPS.walk, 'retoma andando');
  assert.equal(d.notice(), false, 'cooldown');
  for (let i = 0; i < 30 * 4; i++) a.onTick(dt);
  assert.equal(d.notice(), true, 'depois do cooldown volta a perceber');
});

test('sem os clipes R2 (ou cycle desligado) o diretor continua sendo o de gestos R1', async () => {
  browserFixture([]);
  const { createDirector } = await import('../public/experimental/sophia-lab-director.js?t=cycle4');
  assert.equal(createDirector(fakeActor({ clips: ['Lab_Idle_Breath_R1', 'Lab_Think_R1'] })).mode, undefined);
  assert.equal(createDirector(fakeActor({ cycle: false })).mode, undefined);
});

test('estático: CSS desliga o andar 2D só com o 3D ligado e a sombra acompanha; props por extras.prop; o 2D de reserva segue', () => {
  const css = fs.readFileSync('src/styles/section-refinements.css', 'utf8');
  assert.match(css, /\.sophia-animation--lab\[data-sophia3d='on'\][^{]*\{ animation: none; \}/);
  assert.match(css, /--sophia-root-pct/);
  assert.match(css, /@keyframes lab-search-walk/); assert.match(css, /@keyframes sophia-notice-hop/); assert.match(css, /@keyframes lab-write-notes/);
  const actor = fs.readFileSync('public/experimental/sophia-actor.js', 'utf8');
  assert.match(actor, /d\.extras\.prop \|\|/); assert.match(actor, /published: false/, 'continua não publicado até o proprietário autorizar'); assert.match(actor, /cycle: true/);
});

test('GLB real v1.2: 73 juntas, 5 morphs, clipes R2 válidos, laços fecham, pés sem deslizar, props ocultos por padrão', { skip: !LAB && 'defina SOPHIA_LAB_R2_MODEL' }, async () => {
  const bytes = fs.readFileSync(LAB);
  const el = new ActorElement('lab', 'Lab_Idle_Breath_R1'); el.dataset.sophiaModelKey = 'lab-r2'; el.dataset.sophiaProps = '';
  const f = browserFixture([el]); globalThis.fetch = async () => new Response(bytes);
  const mod = await import('../public/experimental/sophia-actor.js?t=cyclereal');
  mod.MODELS['lab-r2'].published = true; // o GLB é privado: o teste simula a publicação
  f.ios[0].trigger(true); await flush();
  const a = mod.actorOf(el); assert.ok(a); assert.equal(a.cfgKey, 'lab-r2');
  assert.equal(a.sk.joints.length, 73); assert.deepEqual(a.sk.targetNames, ['Blink_L', 'Blink_R', 'Eyes_Happy', 'Smile_Soft', 'Brow_Curious']);
  for (const n of Object.values(CYCLE_CLIPS)) assert.ok(a.sk.clips[n], n);
  assert.equal(cycleCapability((n) => Boolean(a.clipByName(n))).available, true);
  const walk = a.sk.clips[CYCLE_CLIPS.walk]; assert.ok(Math.abs(walk.duration - 3.84) < 1e-6); assert.ok(walk.extras.rootMotion.speedModelUnitsPerSecond > 0.05);
  a.director?.stop();
  for (const n of Object.values(CYCLE_CLIPS).concat(['Lab_Idle_Breath_R1'])) {
    const c = a.sk.clips[n];
    for (let t = 0; t <= c.duration + 1e-9; t += 1 / 30) { a.sk.evaluate([{ clip: c, time: t, weight: 1, loop: false }]); a.sk.updateWorld(); a.sk.updateSkin(); assert.ok(a.sk.world.every(Number.isFinite), `${n} @${t}`); }
  }
  for (const n of [CYCLE_CLIPS.walk, CYCLE_CLIPS.write]) { // laço fecha: último quadro == primeiro
    const c = a.sk.clips[n]; for (const ch of c.channels) { const k = ch.values.length / ch.times.length; for (let q = 0; q < k; q++) assert.ok(Math.abs(ch.values[q] - ch.values[(ch.times.length - 1) * k + q]) < 1e-5, `${n} canal ${ch.node}/${ch.path}`); }
  }
  const props = a.stage.json.nodes.filter((n) => n.extras?.prop); assert.deepEqual(props.map((n) => n.extras.prop).sort(), ['book', 'book', 'pen']); assert.ok(props.every((n) => n.extras.hidden === true && n.mesh !== undefined), 'adereços ocultos por padrão (o ator os liga por data-sophia-props)');
});
