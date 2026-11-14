// sophia-lab-director.js — agenda os gestos da Sophia do laboratório (modelo "lab-r2").
// Repouso respirando; a cada ~5–8 s de tempo SIMULADO (só avança quando o ator está visível e desenhando) um gesto é
// tocado até o fim e o ator volta ao repouso com a mistura de 0,25 s do próprio ator. Nenhum gesto se repete em seguida.
import { actorOf } from './sophia-actor.js';
import { bookCapability, bookPhases, CYCLE_CLIPS, CYCLE_PROPS, CYCLE_TIMELINE, cycleCapability } from './sophia-clip-contract.js';

export const IDLE = 'Lab_Idle_Breath_R1';
export const GESTURES = ['Lab_Observe_R1', 'Lab_Think_R1', 'Lab_Point_R1', 'Lab_Greet_R1'];
// o cumprimento é "ocasional": peso menor
const WEIGHT = { Lab_Observe_R1: 3, Lab_Think_R1: 2, Lab_Point_R1: 2, Lab_Greet_R1: 1 };

// Cena opcional do caderno (contrato em sophia-clip-contract.js). Só entra se o modelo ligar `bookScene` E o GLB tiver todos
// os clipes obrigatórios; caso contrário o diretor é exatamente o de antes. `book: true/false` força (testes).
export const BOOK_SCENE = 'book';
const BOOK_WEIGHT = 1;

// ---------------------------------------------------------------------------------------------------------------------
// Ciclo do laboratório (R2): a mesma coreografia de 12 s da ilustração 2D, agora com corpo, passos e giro reais.
// O tempo é SIMULADO (só avança com o ator visível). Quem desloca o personagem é este diretor: a velocidade vem do próprio
// clipe de andar (extras.rootMotion), então os pés ficam plantados. Ao perceber o visitante (notice) o ciclo pausa, o
// personagem pula, e retoma de onde estava. O 2D segue como reserva: este modo só liga com todos os clipes no GLB.
export const WALK_FALLBACK_SPEED = 0.0903; // unidades do modelo/s, usada só se o GLB não declarar rootMotion
const RAMP = 0.3; // segundos para acelerar/frear o passo (suaviza início e fim da caminhada)
const NOTICE_COOLDOWN = 2.5;

export function createCycleDirector(actor, { timeline = CYCLE_TIMELINE } = {}) {
  const walkClip = actor.clipByName(CYCLE_CLIPS.walk);
  const speed = walkClip?.extras?.rootMotion?.speedModelUnitsPerSecond || WALK_FALLBACK_SPEED;
  const walkSecs = Math.max(...timeline.filter((p) => p.dir !== 0).map((p) => p.secs));
  const half = (speed * (walkSecs - RAMP)) / 2; // percurso simétrico: a rampa nas pontas perde RAMP·v, então a velocidade fica exata (sem deslizar)
  const noticeLen = actor.clipByName(CYCLE_CLIPS.notice)?.duration || 0.92;
  let i = 0; let t = 0; let paused = null; let cool = 0; let stopped = false;
  const phase = () => timeline[i];
  const enter = () => {
    const p = phase(); t = 0;
    actor.setClip(p.clip); actor.yawTarget = p.yaw;
  };
  const smooth = (x) => { const c = Math.min(Math.max(x, 0), 1); return c * c * (3 - 2 * c); };
  actor.root.x = timeline[0].dir === 0 && timeline.findIndex((p) => p.dir < 0) < timeline.findIndex((p) => p.dir > 0) ? half : -half;
  actor.setProps(CYCLE_PROPS);
  if (actor.el?.dataset) actor.el.dataset.sophiaCycle = 'on'; // o CSS alarga o quadro de desenho para o percurso caber (sem cortar a cauda)
  enter();
  actor.onEnd = () => {}; // os clipes de uma execução ficam no último quadro até a fase acabar (as durações coincidem)
  actor.onTick = (dt) => {
    if (stopped) return;
    if (cool > 0) cool -= dt;
    if (paused) {
      paused.left -= dt;
      if (paused.left <= 0) { const p = phase(); paused = null; actor.setClip(p.clip); actor.yawTarget = p.yaw; }
      return;
    }
    const p = phase(); t += dt;
    if (p.dir !== 0) { // rampa de velocidade nas pontas da fase (a distância total já descontou a rampa em `half`)
      const k = smooth(t / RAMP) * smooth((p.secs - t) / RAMP);
      actor.root.x += p.dir * speed * k * dt;
    }
    if (t >= p.secs) {
      if (p.dir !== 0) actor.root.x = p.dir < 0 ? -half : half; // elimina só o resíduo da integração por quadros
      const carry = t - p.secs; i = (i + 1) % timeline.length; enter(); t = carry; // o resto do quadro passa à fase seguinte: o ciclo mantém 12 s exatos
    }
  };
  return {
    mode: 'cycle', get current() { return phase().id; }, get index() { return i; }, get wait() { return 0; },
    get capability() { return { available: true, missing: [] }; }, get half() { return half; }, get paused() { return Boolean(paused); },
    // pulinho ao perceber o visitante: pausa o ciclo, toca Notice no lugar e retoma a fase onde estava
    notice() {
      if (stopped || paused || cool > 0) return false;
      cool = noticeLen + NOTICE_COOLDOWN; paused = { left: noticeLen };
      actor.setClip(CYCLE_CLIPS.notice); actor.yawTarget = phase().yaw * 0.3;
      return true;
    },
    stop() { stopped = true; actor.onTick = actor.onEnd = null; actor.yawTarget = null; actor.root.x = 0; actor.root.z = 0; actor.setProps([]); if (actor.el?.dataset) delete actor.el.dataset.sophiaCycle; },
  };
}

export function createDirector(actor, { rng = Math.random, first = 'Lab_Observe_R1', gap = [5, 8], book = actor.cfg?.bookScene === true } = {}) {
  if (actor.cfg?.cycle === true && actor.root && cycleCapability((name) => Boolean(actor.clipByName(name))).available) return createCycleDirector(actor);
  let wait = 2.5; // primeiro gesto logo depois da respiração inicial
  let current = null;
  let last = null;
  let scene = null; // { phases, i, left } durante a cena do caderno
  const capability = book ? bookCapability((name) => Boolean(actor.clipByName(name))) : { available: false, missing: [] };
  const setProps = (list) => { if (actor.setProps) actor.setProps(list); };
  const pick = () => {
    if (!last && first) return first;
    const pool = GESTURES.filter((g) => g !== last && actor.clipByName(g));
    const weights = pool.map((g) => WEIGHT[g]);
    if (capability.available && last !== BOOK_SCENE) { pool.push(BOOK_SCENE); weights.push(BOOK_WEIGHT); }
    if (!pool.length) return null;
    let r = rng() * weights.reduce((s, w) => s + w, 0);
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  };
  const enter = (phase) => { actor.setClip(phase.clip); setProps(phase.props); };
  const finishScene = () => { scene = null; setProps([]); current = null; wait = gap[0] + rng() * (gap[1] - gap[0]); actor.setClip(IDLE); };
  const advance = () => {
    scene.i += 1;
    if (scene.i >= scene.phases.length) return finishScene();
    scene.left = scene.phases[scene.i].secs;
    enter(scene.phases[scene.i]);
  };
  actor.onTick = (dt) => {
    if (scene) { // fases de laço avançam por tempo simulado; as de uma execução avançam em onEnd
      if (scene.left !== null && (scene.left -= dt) <= 0) advance();
      return;
    }
    if (current) return;
    wait -= dt;
    if (wait > 0) return;
    const g = pick();
    if (!g) { wait = gap[1]; return; }
    current = last = g;
    if (g === BOOK_SCENE) {
      const phases = bookPhases(capability, rng);
      scene = { phases, i: 0, left: phases[0].secs };
      enter(phases[0]);
      return;
    }
    actor.setClip(g);
  };
  actor.onEnd = () => {
    if (scene) { if (scene.left === null) advance(); return; }
    current = null;
    wait = gap[0] + rng() * (gap[1] - gap[0]);
    actor.setClip(IDLE);
  };
  return {
    get current() { return current; }, get wait() { return wait; }, get capability() { return capability; },
    stop() { actor.onTick = actor.onEnd = null; if (scene) { scene = null; setProps([]); } },
  };
}

document.addEventListener('sophia:actor-ready', (ev) => {
  const a = ev.detail?.actor || actorOf(ev.target);
  if (a && a.cfgKey === 'lab-r2' && !a.director) {
    a.director = createDirector(a);
    // o visitante aponta ou foca o guia da seção: a Sophia percebe (o 2D faz o mesmo com :hover/:focus-visible)
    const guide = a.el.closest?.('.lab-companion')?.querySelector?.('.lab-sophia-guide');
    if (guide && a.director.notice) for (const type of ['pointerenter', 'focusin']) guide.addEventListener(type, () => a.director?.notice?.());
  }
});
