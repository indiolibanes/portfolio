// RHEA kinetic: type and sections that behave like the lamp face does,
// as light that gathers, flickers and settles.
//
// Markup contract (all optional, all progressive):
//   data-kx="flip|run|melt|swap|atoms|neon|auto"  split the text into letters and
//                                                 play that effect when it scrolls in
//   data-kx-loop="off"                            never disappear/re-form on its own
//   data-kx-wait="ms"                              hold back the first arrival (hero choreography)
//   data-kx-delay="ms"                             same, for a data-kx-reveal block
//   data-kx-reveal[="up|left|right|zoom|tilt"]    block that appears and disappears
//   data-kx-magnet                                button that leans toward a mouse
//   data-kx-watch                                 pause CSS animation while off-screen
//
// Everything is gated on html[data-motion="on"], which the page sets before paint
// from localStorage (rhea.motion) or prefers-reduced-motion. With motion off, or
// without JavaScript, nothing is split, hidden or animated.
//
// Only CSSOM (style.setProperty) is used to pass values to CSS, so strict
// style-src policies keep working.

export const FX = ['flip', 'run', 'melt', 'swap', 'atoms', 'neon'];
const REVEALS = ['up', 'left', 'right', 'zoom', 'tilt'];

// dur: per-letter animation time; gap: delay between neighbouring letters (ms).
const IN = {
  flip: { dur: 900, gap: 34 },
  run: { dur: 1000, gap: 30 },
  melt: { dur: 1100, gap: 46 },
  swap: { dur: 1250, gap: 42 },
  atoms: { dur: 1500, gap: 20 },
  neon: { dur: 1500, gap: 55 },
};
const OUT = {
  flip: { dur: 620, gap: 22 },
  run: { dur: 700, gap: 20 },
  melt: { dur: 900, gap: 36 },
  swap: { dur: 800, gap: 28 },
  atoms: { dur: 850, gap: 14 },
  neon: { dur: 800, gap: 30 },
};

const root = document.documentElement;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const el = (className, text) => {
  const node = document.createElement('span');
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export const motionOn = () => root.dataset.motion === 'on';

const roots = new Set();
const items = new Set();
let ioKx = null;
let ioRv = null;
let loopTimer = 0;
let busy = false;
let started = false;

/* ---------- Letters ---------- */

function split(host) {
  if (host.__kx) return host.__kx;
  const info = { chars: [], words: [], pieces: [], timer: 0, resolve: null, phase: 'idle', entered: 0 };

  const nodes = [];
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.nodeValue.trim() && node.parentElement.closest('[data-kx]') === host
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT,
  });
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const fragment = document.createDocumentFragment();
    // Assistive tech reads the real text; the lettered copy is decoration.
    const sr = el('kx-sr', node.nodeValue);
    const box = el('kx-chars');
    box.setAttribute('aria-hidden', 'true');
    for (const token of node.nodeValue.split(/(\s+)/)) {
      if (!token) continue;
      if (/^\s+$/.test(token)) {
        box.append(document.createTextNode(' '));
        continue;
      }
      const word = el('kx-word');
      for (const letter of Array.from(token)) {
        const ch = el('kx-ch', letter);
        ch.dataset.c = letter;
        ch.style.setProperty('--i', String(info.chars.length));
        word.append(ch);
        info.chars.push(ch);
      }
      info.words.push(word);
      box.append(word);
    }
    fragment.append(sr, box);
    node.replaceWith(fragment);
    info.pieces.push({ node, sr, box });
  }
  host.style.setProperty('--n', String(info.chars.length));
  host.__kx = info;
  return info;
}

function unsplit(host) {
  const info = host.__kx;
  if (!info) return;
  settle(host);
  for (const { node, sr, box } of info.pieces) {
    box.remove();
    sr.replaceWith(node);
  }
  host.classList.remove('kx-hidden', 'kx-run', 'kx-lock');
  delete host.dataset.kxFx;
  delete host.dataset.kxPhase;
  delete host.__kx;
}

function settle(host) {
  const info = host.__kx;
  if (!info) return;
  clearTimeout(info.timer);
  info.resolve?.();
  info.resolve = null;
}

function prepare(host, fx) {
  const info = host.__kx;
  for (const word of info.words) {
    word.style.setProperty('--wx', rand(-2.4, 2.4).toFixed(2));
    word.style.setProperty('--wy', rand(-1.7, 1.7).toFixed(2));
  }
  for (const ch of info.chars) {
    ch.style.setProperty('--r', Math.random().toFixed(3));
    ch.style.setProperty('--j', Math.random().toFixed(3));
    ch.style.setProperty('--s', Math.random() < 0.5 ? '-1' : '1');
    ch.style.setProperty('--rx', rand(3, 9).toFixed(2));
    ch.style.setProperty('--cx', rand(-3, 3).toFixed(2));
    ch.style.setProperty('--cy', rand(-2.4, 2.4).toFixed(2));
    ch.style.setProperty('--rot', rand(-160, 160).toFixed(0));
  }
  if (fx === 'swap') {
    // Fonts have different widths; pin each letter's box so the line does not jitter.
    host.classList.remove('kx-lock');
    for (const ch of info.chars) ch.style.setProperty('--w', ch.getBoundingClientRect().width.toFixed(2) + 'px');
    host.classList.add('kx-lock');
  }
}

/** Play an effect on a lettered element. dir: 'in' forms the text, 'out' dissolves it. */
export function play(host, dir = 'in', fx) {
  if (!motionOn()) return Promise.resolve();
  const info = split(host);
  settle(host);
  const chosen = fx ?? (FX.includes(host.dataset.kx) ? host.dataset.kx : pick(FX));
  const spec = (dir === 'in' ? IN : OUT)[chosen];
  const count = Math.max(info.chars.length, 1);
  const gap = Math.min(spec.gap, 900 / count);

  host.classList.remove('kx-hidden', 'kx-run');
  host.dataset.kxFx = chosen;
  host.dataset.kxPhase = dir;
  prepare(host, chosen);
  host.style.setProperty('--kx-stagger', gap.toFixed(1) + 'ms');
  host.style.setProperty('--kx-dur', spec.dur + 'ms');
  void host.offsetWidth;
  host.classList.add('kx-run');
  info.phase = dir === 'in' ? 'playing' : 'leaving';

  const total = spec.dur + (count - 1) * gap + 140;
  return new Promise((resolve) => {
    info.resolve = resolve;
    info.timer = setTimeout(() => {
      host.classList.remove('kx-run', 'kx-lock');
      if (dir === 'out') host.classList.add('kx-hidden');
      info.phase = dir === 'in' ? 'idle' : 'hidden';
      info.resolve = null;
      resolve();
    }, total);
  });
}

/** Replace an element's text and let the new text form. */
export function setText(host, text, fx) {
  if (!motionOn() || !host.__kx) {
    host.textContent = text;
    return Promise.resolve();
  }
  unsplit(host);
  host.textContent = text;
  split(host);
  return play(host, 'in', fx);
}

function hide(host) {
  settle(host);
  const info = host.__kx;
  host.classList.remove('kx-run', 'kx-lock');
  host.classList.add('kx-hidden');
  if (info) info.phase = 'hidden';
}

const fullyInView = (node) => {
  const rect = node.getBoundingClientRect();
  return rect.top >= 0 && rect.bottom <= innerHeight && rect.width > 0;
};

const isSelected = (node) => {
  const selection = getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.containsNode(node, true));
};

/** Every few seconds, one visible title dissolves and re-forms with another effect. */
function loop() {
  clearTimeout(loopTimer);
  loopTimer = setTimeout(async () => {
    if (motionOn() && !document.hidden && !busy) {
      const candidates = [...roots].filter(
        (host) =>
          host.__kx?.phase === 'idle' &&
          host.dataset.kxLoop !== 'off' &&
          fullyInView(host) &&
          !host.matches(':hover') &&
          !host.contains(document.activeElement) &&
          !isSelected(host),
      );
      if (candidates.length) {
        busy = true;
        const host = pick(candidates);
        await play(host, 'out', pick(FX));
        await sleep(rand(260, 700));
        if (motionOn()) await play(host, 'in', pick(FX));
        busy = false;
      }
    }
    loop();
  }, rand(5200, 9200));
}

/* ---------- Blocks that appear and disappear ---------- */

function showItem(node, delay) {
  const fixed = node.dataset.kxReveal;
  node.dataset.rv = REVEALS.includes(fixed) ? fixed : pick(REVEALS);
  node.style.setProperty('--rv-delay', delay + 'ms');
  node.classList.remove('kx-rv-hidden', 'kx-rv-in');
  void node.offsetWidth;
  node.classList.add('kx-rv-in');
  node.dataset.rvState = 'in';
}

function hideItem(node) {
  node.classList.remove('kx-rv-in');
  node.classList.add('kx-rv-hidden');
  node.dataset.rvState = 'hidden';
}

function showPlain(node) {
  node.classList.remove('kx-rv-in', 'kx-rv-hidden');
  delete node.dataset.rvState;
}

/* ---------- Start, stop, motion switch ---------- */

function observers() {
  if (ioKx) return;
  ioKx = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const host = entry.target;
        if (!motionOn()) continue;
        const info = split(host);
        if (entry.isIntersecting) {
          if (info.phase === 'hidden' && !info.queued) {
            // First arrival keeps the title's own signature; later ones vary.
            const fx = info.entered++ === 0 ? undefined : pick(FX);
            info.queued = true;
            setTimeout(() => {
              info.queued = false;
              if (motionOn() && host.__kx === info && info.phase === 'hidden') play(host, 'in', fx);
            }, Number(host.dataset.kxWait || 0));
          }
        } else if (info.phase === 'idle' || info.phase === 'playing') {
          hide(host);
        }
      }
    },
    { threshold: 0.55 },
  );
  ioRv = new IntersectionObserver(
    (entries) => {
      let order = 0;
      for (const entry of entries) {
        const node = entry.target;
        if (!motionOn()) {
          showPlain(node);
          continue;
        }
        if (entry.isIntersecting) {
          if (node.dataset.rvState !== 'in') showItem(node, order++ * 80 + Number(node.dataset.kxDelay || 0));
        } else {
          hideItem(node);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );
}

function start() {
  observers();
  for (const host of roots) {
    split(host);
    hide(host);
    host.__kx.entered = 0;
    ioKx.unobserve(host);
    ioKx.observe(host);
  }
  for (const node of items) {
    hideItem(node);
    ioRv.unobserve(node);
    ioRv.observe(node);
  }
  started = true;
  loop();
}

function stop() {
  clearTimeout(loopTimer);
  busy = false;
  for (const host of roots) {
    ioKx?.unobserve(host);
    unsplit(host);
  }
  for (const node of items) {
    ioRv?.unobserve(node);
    showPlain(node);
  }
  started = false;
}

export function setMotion(on) {
  root.dataset.motion = on ? 'on' : 'off';
  try {
    localStorage.setItem('rhea.motion', on ? 'on' : 'off');
  } catch {}
  if (on) start();
  else stop();
}

function initMagnet() {
  for (const node of document.querySelectorAll('[data-kx-magnet]')) {
    node.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || !motionOn()) return;
      const rect = node.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      node.style.setProperty('--kx-tx', (x * 10).toFixed(1) + 'px');
      node.style.setProperty('--kx-ty', (y * 8).toFixed(1) + 'px');
    });
    node.addEventListener('pointerleave', () => {
      node.style.removeProperty('--kx-tx');
      node.style.removeProperty('--kx-ty');
    });
  }
}

function initWatch() {
  if (!('IntersectionObserver' in window)) return;
  const watcher = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.classList.toggle('is-offscreen', !entry.isIntersecting);
  });
  for (const node of document.querySelectorAll('[data-kx-watch]')) watcher.observe(node);
}

/** Wire up the page. Safe to call once; returns the small public API. */
export function initRheaKinetic() {
  const api = { play, setText, setMotion, motionOn };
  if (!('IntersectionObserver' in window)) {
    root.classList.remove('kx-pending');
    return api;
  }
  for (const host of document.querySelectorAll('[data-kx]')) roots.add(host);
  for (const node of document.querySelectorAll('[data-kx-reveal]')) items.add(node);
  initMagnet();
  initWatch();
  if (motionOn()) start();
  // Two frames: the first intersection callbacks have run, so nothing flashes.
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('kx-pending')));
  return api;
}
