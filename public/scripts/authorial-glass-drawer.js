// The original Pixar-style five-hop drawer tiles choreography from
// experimental-menu.js, applied to the original Autoral periodic table.
// The ORIGINAL header button and its plasma/WAAPI behavior are untouched.
(() => {
  const drawer = document.querySelector('.site-header [data-nav-sections]');
  if (!drawer) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const HOP_MS = 2500;
  const HOPS = 5;
  const HOP_PERIOD = 470; // 5 × 470 ms de saltos + 150 ms para assentar
  const STAGGER_MS = 18; // pequena onda dentro da palavra
  const STEPS = 12;
  const SHARE = (() => {
    const w = Array.from({ length: HOPS }, (_, k) => Math.pow(0.74, k));
    const sum = w.reduce((a, b) => a + b, 0);
    return w.map((x) => x / sum);
  })();
  const HEIGHT = Array.from({ length: HOPS }, (_, k) => 26 * Math.pow(0.77, k));

  const hopFrames = (distance) => {
    const frames = [];
    let travelled = 0;
    for (let k = 0; k < HOPS; k += 1) {
      const length = distance * SHARE[k];
      for (let s = k === 0 ? 0 : 1; s <= STEPS; s += 1) {
        const v = s / STEPS; // fase do salto: 0 = decolagem, 1 = pouso
        const f = Math.min(1, Math.max(0, (v - 0.12) / 0.76)); // só se move no ar
        const x = -distance + travelled + length * f;
        const y = -HEIGHT[k] * 4 * f * (1 - f);
        const contact = Math.max(0, 1 - Math.min(v, 1 - v) / 0.12); // agacha ao pousar e antes de saltar
        const stretch = 0.06 * Math.pow(Math.sin(2 * Math.PI * f), 2);
        const sy = 1 - 0.16 * contact + stretch;
        const sx = 1 + 0.09 * contact - stretch * 0.6;
        frames.push({
          offset: (k * HOP_PERIOD + v * HOP_PERIOD) / HOP_MS,
          transform: 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + sx.toFixed(3) + ',' + sy.toFixed(3) + ')',
        });
      }
      travelled += length;
    }
    frames.push({ offset: (HOPS * HOP_PERIOD + 75) / HOP_MS, transform: 'translate(0,0) scale(0.97,1.05)' });
    frames.push({ offset: 1, transform: 'none' });
    return frames;
  };

  const tiles = [...drawer.querySelectorAll('.el, .ch')];
  tiles.forEach((tile) => tile.style.setProperty('--gd', '-' + rnd(0, 3.4).toFixed(2) + 's')); // brilhos fora de fase

  let running = [];
  const stop = () => {
    running.forEach((a) => a.cancel());
    running = [];
    tiles.forEach((tile) => tile.classList.remove('is-lit'));
  };

  const play = () => {
    stop();
    if (reduce.matches) {
      tiles.forEach((tile) => tile.classList.add('is-lit'));
      return;
    }
    // Lê tudo antes de animar, para não forçar layout a cada peça.
    const glass = drawer.querySelector('.xm-glass').getBoundingClientRect();
    const lines = new Map();
    tiles.forEach((tile) => {
      const r = tile.getBoundingClientRect();
      const key = Math.round(r.top);
      const line = lines.get(key) || { right: -Infinity, tiles: [] };
      line.right = Math.max(line.right, r.right);
      line.tiles.push(tile);
      lines.set(key, line);
    });
    lines.forEach((line) => {
      const frames = hopFrames(line.right - glass.left + 4); // o trem parte todo fora do vidro, à esquerda
      line.tiles.forEach((tile, i) => {
        const anim = tile.animate(frames, { duration: HOP_MS, delay: i * STAGGER_MS, easing: 'linear', fill: 'backwards' });
        anim.finished.then(() => tile.classList.add('is-lit'), () => {});
        running.push(anim);
      });
    });
  };


  const sync = () => {
    if (drawer.dataset.open === 'true' && !document.hidden) play();
    else stop();
  };
  const observer = new MutationObserver(sync);
  observer.observe(drawer, {attributes:true, attributeFilter:['data-open']});
  document.addEventListener('visibilitychange', sync);
  reduce.addEventListener('change', sync);
})();
