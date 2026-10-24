// modo-experimental: comportamento do menu orbital (ExperimentalMenu.astro + experimental.css).
// Sem dependências. Respeita prefers-reduced-motion; sem JavaScript a gaveta fica aberta, no fluxo.
(() => {
  const root = document.querySelector('[data-xm]');
  const toggle = root && root.querySelector('[data-xm-toggle]');
  const drawer = root && root.querySelector('[data-xm-drawer]');
  if (!toggle || !drawer) return;

  document.documentElement.dataset.xmJs = 'true';
  drawer.inert = true;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---------------------------------------------------------------- órbita (SMIL)
  // O texto dá a volta em 10 s (dur="10s" no markup). Parada com movimento reduzido ou aba oculta.
  const orbit = root.querySelector('[data-xm-orbit]');
  const syncOrbit = () => {
    if (!orbit || typeof orbit.pauseAnimations !== 'function') return;
    if (reduce.matches) { orbit.setCurrentTime(0); orbit.pauseAnimations(); return; }
    if (document.hidden) orbit.pauseAnimations(); else orbit.unpauseAnimations();
  };
  syncOrbit();
  document.addEventListener('visibilitychange', syncOrbit);
  reduce.addEventListener('change', syncOrbit);

  // ---------------------------------------------------------------- plasma do botão
  // Mesmo brilho do Autoral: gás contido na pílula, mais intenso ao passar, segurar ou abrir.
  (() => {
    const plasma = toggle.querySelector('[data-xm-plasma]');
    if (!plasma || reduce.matches) return;
    const drift = Array.from(plasma.querySelectorAll('circle')).map((c) => {
      const frames = Array.from({ length: 6 }, () => ({
        transform: 'translate(' + rnd(-34, 34) + 'px,' + rnd(-16, 16) + 'px) scale(' + rnd(0.7, 1.6) + ')',
      }));
      frames.push(frames[0]);
      return c.animate(frames, { duration: rnd(900, 1700), iterations: Infinity, easing: 'ease-in-out', delay: -rnd(0, 1200) });
    });
    const tint = plasma.animate([{ filter: 'hue-rotate(0deg)' }, { filter: 'hue-rotate(360deg)' }], { duration: 3200, iterations: Infinity });
    let level = 0;
    let target = 0;
    let ramp = 0;
    const apply = () => {
      drift.forEach((a) => a.updatePlaybackRate(1 + level * 2.6));
      tint.updatePlaybackRate(1 + level * 3);
      plasma.style.opacity = String(toggle.getAttribute('aria-expanded') === 'true' ? 0.45 + level * 0.3 : 0.5 + level * 0.5);
    };
    const step = () => {
      level += (target - level) * (target > level ? 0.12 : 0.025);
      if (Math.abs(target - level) < 0.01) level = target;
      apply();
      ramp = level === target ? 0 : requestAnimationFrame(step);
    };
    const set = (value) => {
      target = value;
      if (!ramp) ramp = requestAnimationFrame(step);
    };
    const hot = () => toggle.matches(':hover, :active, :focus-visible') || toggle.getAttribute('aria-expanded') === 'true';
    const settle = () => set(hot() ? 1 : 0);
    apply();
    ['pointerenter', 'focus'].forEach((t) => toggle.addEventListener(t, () => set(1)));
    toggle.addEventListener('pointerdown', () => set(1));
    ['pointerleave', 'pointerup', 'pointercancel', 'blur'].forEach((t) => toggle.addEventListener(t, () => setTimeout(settle, 0)));
    new MutationObserver(settle).observe(toggle, { attributes: true, attributeFilter: ['aria-expanded'] });
  })();

  // ---------------------------------------------------------------- pulo das letras
  // Cada palavra entra pela esquerda como um trem de azulejos e pula até se acomodar no centro,
  // como a luminária da vinheta da Pixar: HOPS saltos cada vez menores, agachando a cada pouso.
  // Dura HOP_MS (2,5 s, o mesmo de --xm-hop); depois cada peça passa a brilhar para sempre.
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

  const tiles = [...drawer.querySelectorAll('.xm-el, .xm-ch')];
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

  // ---------------------------------------------------------------- abrir e fechar
  const setOpen = (open, restoreFocus = false) => {
    if ((toggle.getAttribute('aria-expanded') === 'true') === open) return;
    toggle.setAttribute('aria-expanded', String(open));
    drawer.dataset.state = open ? 'open' : 'closed';
    drawer.inert = !open;
    if (open) play(); else stop();
    if (!open && restoreFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  drawer.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && drawer.dataset.state === 'open') setOpen(false, true);
  });
  document.addEventListener('click', (event) => {
    if (drawer.dataset.state !== 'open') return;
    if (event.target instanceof Node && (drawer.contains(event.target) || toggle.contains(event.target))) return;
    setOpen(false);
  });
})();
