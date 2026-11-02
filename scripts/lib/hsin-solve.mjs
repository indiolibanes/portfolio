/** Seeded evolution strategy for the offline arm solvers. Deterministic: same seed, same result. */
export function rng(seed) {
 return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const gauss = (r) => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r());

/** (mu, lambda) evolution strategy. `evaluate(x)` returns {cost}. */
export function optimise(evaluate, start, {generations = 90, lambda = 22, mu = 6, sigma = .22, seed = 7} = {}) {
 const r = rng(seed); let mean = start.slice(), s = sigma, best = {x: mean, cost: evaluate(mean).cost};
 const history = [];
 for (let g = 0; g < generations; g++) {
  const pop = Array.from({length: lambda}, () => { const x = mean.map((v) => v + s * gauss(r)); return {x, cost: evaluate(x).cost}; }).sort((a, b) => a.cost - b.cost);
  const improved = pop[0].cost < best.cost; if (improved) best = pop[0];
  mean = mean.map((_, i) => pop.slice(0, mu).reduce((sum, p) => sum + p.x[i], 0) / mu); s *= improved ? .985 : .96; history.push(best.cost);
 }
 return {...best, history};
}

/** Several seeds, keeps the best. */
export function multiStart(evaluate, start, seeds, options, log = () => {}) {
 let best = null;
 for (const seed of seeds) { const result = optimise(evaluate, start, {...options, seed}); log(seed, result.cost); if (!best || result.cost < best.cost) best = result; }
 return best;
}
