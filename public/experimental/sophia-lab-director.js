// sophia-lab-director.js — agenda os gestos da Sophia do laboratório (modelo "lab-r2").
// Repouso respirando; a cada ~5–8 s de tempo SIMULADO (só avança quando o ator está visível e desenhando) um gesto é
// tocado até o fim e o ator volta ao repouso com a mistura de 0,25 s do próprio ator. Nenhum gesto se repete em seguida.
import { actorOf } from './sophia-actor.js';
import { bookCapability, bookPhases } from './sophia-clip-contract.js';

export const IDLE = 'Lab_Idle_Breath_R1';
export const GESTURES = ['Lab_Observe_R1', 'Lab_Think_R1', 'Lab_Point_R1', 'Lab_Greet_R1'];
// o cumprimento é "ocasional": peso menor
const WEIGHT = { Lab_Observe_R1: 3, Lab_Think_R1: 2, Lab_Point_R1: 2, Lab_Greet_R1: 1 };

// Cena opcional do caderno (contrato em sophia-clip-contract.js). Só entra se o modelo ligar `bookScene` E o GLB tiver todos
// os clipes obrigatórios; caso contrário o diretor é exatamente o de antes. `book: true/false` força (testes).
export const BOOK_SCENE = 'book';
const BOOK_WEIGHT = 1;

export function createDirector(actor, { rng = Math.random, first = 'Lab_Observe_R1', gap = [5, 8], book = actor.cfg?.bookScene === true } = {}) {
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
  if (a && a.cfgKey === 'lab-r2' && !a.director) a.director = createDirector(a);
});
