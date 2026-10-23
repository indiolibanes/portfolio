// Cursor de notas musicais para a seção Música (modo Autoral).
// O cursor nativo some dentro da seção e uma nota segue o ponteiro. A cada 4 s a nota troca de
// figura (colcheia, semicolcheia, semínima, mínima, semibreve, arpejo, tom, semitom, escala,
// sustenido, bemol…) e de cor. Só com ponteiro fino; movimento reduzido mostra uma nota fixa, sem
// trocas. Editorial e Legacy mantêm o cursor comum.
(() => {
  const shelf = document.querySelector('[data-music-shelf]');
  if (!shelf || !window.matchMedia) return;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!fine.matches) return;

  const COLORS = ['#ffd98a', '#f0b7d0', '#a9d6ff', '#b8f5c9', '#d9b8ff', '#ffb38a', '#fff6d0'];
  const INK = '#fff6d0';

  // Cada figura é um SVG 32×40 com a nota desenhada à mão (sem depender de fonte musical).
  const head = (cx, cy, filled, rot = -18) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="5.2" ry="4" transform="rotate(${rot} ${cx} ${cy})" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${filled ? 0 : 1.6}"/>`;
  const stem = (x, y1, y2) => `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
  const flag = (x, y, k = 0) =>
    `<path d="M${x} ${y + k} C${x + 9} ${y + 4 + k}, ${x + 10} ${y + 12 + k}, ${x + 4} ${y + 16 + k} C${x + 8} ${y + 12 + k}, ${x + 7} ${y + 6 + k}, ${x} ${y + 2 + k}Z" fill="currentColor"/>`;
  const text = (x, y, s, size = 11) =>
    `<text x="${x}" y="${y}" font-family="Georgia, serif" font-size="${size}" font-weight="700" fill="currentColor" text-anchor="middle">${s}</text>`;

  const FIGURES = {
    colcheia: () => head(11, 31, true) + stem(16, 31, 4) + flag(16, 4),
    semicolcheia: () => head(11, 31, true) + stem(16, 31, 4) + flag(16, 4) + flag(16, 11),
    semínima: () => head(11, 31, true) + stem(16, 31, 4),
    mínima: () => head(11, 31, false) + stem(16, 31, 4),
    semibreve: () => `<ellipse cx="16" cy="20" rx="8" ry="5.2" transform="rotate(-18 16 20)" fill="none" stroke="currentColor" stroke-width="1.8"/>`,
    'colcheia dupla': () => head(7, 31, true) + stem(12, 31, 4) + flag(12, 4) + head(22, 24, true) + stem(27, 24, 0) + flag(27, 0),
    arpejo: () => `<path d="M6 33 L16 22 L26 11" stroke="currentColor" stroke-width="1" stroke-dasharray="2 3" fill="none"/>` + head(6, 33, true, 0) + head(16, 22, true, 0) + head(26, 11, true, 0),
    tom: () => head(8, 28, true, 0) + head(24, 16, true, 0) + `<path d="M8 22 L24 10" stroke="currentColor" stroke-width="1.2" fill="none"/>` + text(16, 38, 'T', 10),
    semitom: () => head(8, 28, true, 0) + head(12, 24, true, 0) + text(16, 38, 'S', 10),
    escala: () => [0, 1, 2, 3, 4].map((i) => head(5 + i * 5.5, 34 - i * 6, true, 0)).join('') + `<path d="M5 34 L27 10" stroke="currentColor" stroke-width="1" fill="none" opacity=".6"/>`,
    sustenido: () => text(16, 30, '♯', 26),
    bemol: () => text(16, 32, '♭', 26),
    pausa: () => `<path d="M10 14 L20 26 M20 14 L10 26" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  };
  const KEYS = Object.keys(FIGURES);

  const el = document.createElement('div');
  el.className = 'music-note-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<svg viewBox="0 0 32 40" width="32" height="40"><g class="mnc-glyph"></g></svg>';
  shelf.appendChild(el);
  const glyph = el.querySelector('.mnc-glyph');

  let figure = '';
  let color = '';
  let timer = 0;
  let active = false;
  let x = 0;
  let y = 0;
  let tx = 0;
  let ty = 0;
  let raf = 0;

  const pick = (list, avoid) => {
    let next = list[Math.floor(Math.random() * list.length)];
    if (list.length > 1 && next === avoid) next = list[(list.indexOf(next) + 1) % list.length];
    return next;
  };

  const change = (animate = true) => {
    figure = pick(KEYS, figure);
    color = pick(COLORS, color);
    glyph.innerHTML = FIGURES[figure]();
    el.style.color = color;
    el.style.setProperty('--mnc-glow', color);
    if (animate && !reduced.matches && el.animate) {
      el.querySelector('svg').animate(
        [
          { transform: 'scale(.55) rotate(-14deg)', opacity: 0.2 },
          { transform: 'scale(1.18) rotate(6deg)', opacity: 1, offset: 0.6 },
          { transform: 'scale(1) rotate(0deg)', opacity: 1 },
        ],
        { duration: 520, easing: 'cubic-bezier(.2,.9,.3,1.2)' },
      );
    }
  };

  const frame = () => {
    raf = 0;
    x += (tx - x) * 0.32;
    y += (ty - y) * 0.32;
    el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) raf = requestAnimationFrame(frame);
  };

  const quiet = () => document.documentElement.dataset.seriousMode === 'true' || document.documentElement.dataset.legacyMode === 'true';

  const onMove = (event) => {
    const box = shelf.getBoundingClientRect();
    tx = event.clientX - box.left - 4;
    ty = event.clientY - box.top - 4;
    if (reduced.matches) {
      x = tx; y = ty;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    } else if (!raf) raf = requestAnimationFrame(frame);
  };

  const setActive = (on) => {
    const next = on && !quiet() && fine.matches;
    if (next === active) return;
    active = next;
    shelf.classList.toggle('music-cursor-on', active);
    el.classList.toggle('is-on', active);
    clearInterval(timer);
    if (active) {
      if (!figure) change(false);
      if (!reduced.matches) timer = setInterval(() => change(true), 4000);
    }
  };

  shelf.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse' || event.pointerType === 'pen') { setActive(true); onMove(event); x = tx; y = ty; } });
  shelf.addEventListener('pointerleave', () => setActive(false));
  shelf.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    if (!active) setActive(true);
    onMove(event);
  }, { passive: true });
  shelf.addEventListener('pointerover', (event) => el.classList.toggle('is-hot', Boolean(event.target.closest?.('a, button'))));
  window.addEventListener('portfolio:mode', () => setActive(active));
  document.addEventListener('visibilitychange', () => { if (document.hidden) setActive(false); });
})();
