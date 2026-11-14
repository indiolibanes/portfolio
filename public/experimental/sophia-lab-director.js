// sophia-lab-director.js — agenda os gestos da Sophia do laboratório (modelo "lab-r2").
// Repouso respirando; a cada ~5–8 s de tempo SIMULADO (só avança quando o ator está visível e desenhando) um gesto é
// tocado até o fim e o ator volta ao repouso com a mistura de 0,25 s do próprio ator. Nenhum gesto se repete em seguida.
import { actorOf } from './sophia-actor.js';

export const IDLE = 'Lab_Idle_Breath_R1';
export const GESTURES = ['Lab_Observe_R1', 'Lab_Think_R1', 'Lab_Point_R1', 'Lab_Greet_R1'];
// o cumprimento é "ocasional": peso menor
const WEIGHT = { Lab_Observe_R1: 3, Lab_Think_R1: 2, Lab_Point_R1: 2, Lab_Greet_R1: 1 };

export function createDirector(actor, { rng = Math.random, first = 'Lab_Observe_R1', gap = [5, 8] } = {}) {
  let wait = 2.5; // primeiro gesto logo depois da respiração inicial
  let current = null;
  let last = null;
  const pick = () => {
    if (!last && first) return first;
    const pool = GESTURES.filter((g) => g !== last && actor.clipByName(g));
    if (!pool.length) return null;
    let r = rng() * pool.reduce((s, g) => s + WEIGHT[g], 0);
    for (const g of pool) { r -= WEIGHT[g]; if (r <= 0) return g; }
    return pool[pool.length - 1];
  };
  actor.onTick = (dt) => {
    if (current) return;
    wait -= dt;
    if (wait > 0) return;
    const g = pick();
    if (!g) { wait = gap[1]; return; }
    current = last = g;
    actor.setClip(g);
  };
  actor.onEnd = () => {
    current = null;
    wait = gap[0] + rng() * (gap[1] - gap[0]);
    actor.setClip(IDLE);
  };
  return { get current() { return current; }, get wait() { return wait; }, stop() { actor.onTick = actor.onEnd = null; } };
}

document.addEventListener('sophia:actor-ready', (ev) => {
  const a = ev.detail?.actor || actorOf(ev.target);
  if (a && a.cfgKey === 'lab-r2' && !a.director) a.director = createDirector(a);
});
