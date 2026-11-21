// RHEA lamps: Rhea's face is not drawn, it is lit. A disc of small lamps on
// a hexagonal grid; the lamps that brighten suggest two eyes and a smile.
//
// Pure geometry and light (lampField, lightAt) are shared by the static SVG
// that ships in the HTML and by the canvas animation (initRheaLamps).
// Grid unit: a 96 x 96 view box, disc centred at (48, 50).

export const CENTER = { x: 48, y: 50 };
export const DISC = 31;
export const RING = 36;

export const PALETTE = {
  disc: '#0b231b',
  off: '#2d5a47',
  on: '#ffe08a',
  core: '#fffaf0',
  ring: '#c9a13e',
};

const hash = (x, y) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Lamps inside the disc, plus three antenna lamps above the ring's gate. */
export function lampField(rows = 11) {
  const step = DISC / (rows + 0.5);
  const lamps = [];
  const rowStep = step * Math.sqrt(3) / 2;
  for (let j = -rows - 1; j <= rows + 1; j++) {
    const y = j * rowStep;
    const offset = Math.abs(j) % 2 ? step / 2 : 0;
    for (let i = -rows - 1; i <= rows + 1; i++) {
      const x = i * step + offset;
      if (Math.hypot(x, y) > DISC - step * 0.35) continue;
      lamps.push({ x: CENTER.x + x, y: CENTER.y + y, u: x / DISC, v: y / DISC, seed: hash(x, y), antenna: false, unit: step / DISC });
    }
  }
  for (const [k, y] of [[0, 16], [1, 10.5], [2, 5]]) {
    lamps.push({ x: CENTER.x, y, u: 0, v: (y - CENTER.y) / DISC, seed: hash(k, y), antenna: true, k });
  }
  return { lamps, radius: step * 0.46 };
}

const smooth = (edge0, edge1, x) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Light of one lamp, 0..1.
 * state: { gx, gy } gaze (-1..1), blink (0 open .. 1 closed), smile (0 calm .. 1 open),
 *        t seconds, ripple { u, v, age } or null, boot (0..1, 1 = fully on), still (no flicker).
 */
export function lightAt(lamp, state = {}) {
  const { gx = 0, gy = 0, blink = 0, smile = 0, t = 0, ripple = null, boot = 1, still = false } = state;
  const r = Math.hypot(lamp.u, lamp.v);
  if (lamp.antenna) {
    const pulse = still ? 0.7 : 0.55 + 0.45 * Math.max(0, Math.sin(t * 2.2 - lamp.k * 0.9));
    return pulse * smooth(lamp.k * 0.18, lamp.k * 0.18 + 0.2, boot);
  }

  let light = 0.1;
  // Coarse grids (small sizes) need wider features to stay readable.
  const unit = lamp.unit || 0.08;

  // Eyes: soft ellipses that follow the gaze and close when blinking.
  for (const side of [-1, 1]) {
    const ex = side * 0.33 + gx * 0.07;
    const ey = -0.1 + gy * 0.06;
    const rx = Math.max(0.11, unit * 0.95);
    const ry = Math.max(0.15, unit * 1.2) * (1 - 0.85 * blink) + 0.02;
    const d = Math.hypot((lamp.u - ex) / rx, (lamp.v - ey) / ry);
    light = Math.max(light, 1 - smooth(0.55, 1.05, d));
  }

  // Smile: an arc of lamps below the eyes; it widens when Rhea is attentive.
  const arcR = 0.4 - smile * 0.02;
  const arcD = Math.abs(Math.hypot(lamp.u, lamp.v + 0.02) - arcR);
  const width = Math.max(0.29 + smile * 0.07, unit * 2.4);
  const thick = Math.max(0.045 + smile * 0.02, unit * 0.55);
  const inArc = lamp.v > 0.12 && Math.abs(lamp.u) < width;
  if (inArc) light = Math.max(light, 0.92 * (1 - smooth(thick * 0.5, thick, arcD)) * (1 - smooth(width - 0.07, width, Math.abs(lamp.u))));

  // Cheeks: a faint warmth.
  for (const side of [-1, 1]) {
    const d = Math.hypot(lamp.u - side * 0.56, lamp.v - 0.22);
    light = Math.max(light, 0.34 * (1 - smooth(0.04, 0.14, d)) * (0.5 + smile * 0.5));
  }

  // Rim: the edge of the disc glows a little.
  light = Math.max(light, 0.22 * smooth(0.8, 0.97, r));

  if (!still) {
    light += 0.05 * Math.sin(t * 2.1 + lamp.seed * 6.28);
    light += 0.05 * Math.sin(r * 7 - t * 1.3);
    if (ripple) {
      const d = Math.hypot(lamp.u - ripple.u, lamp.v - ripple.v);
      const front = ripple.age * 2.4;
      light += 0.85 * Math.exp(-((d - front) ** 2) / 0.012) * Math.exp(-ripple.age * 1.6);
    }
  }

  // Boot: lamps light from the centre outward.
  light *= smooth(r - 0.25, r, boot * 1.3);
  return Math.max(0, Math.min(1, light));
}

const mix = (a, b, t) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

export const lampColor = (light, palette = PALETTE) =>
  light < 0.5 ? mix(palette.off, palette.on, light / 0.5) : mix(palette.on, palette.core, (light - 0.5) / 0.5);

export const lampSize = (light, radius) => radius * (0.42 + 0.58 * light);

const RING_PATH = 'M57.37 15.76A35.5 35.5 0 1 1 38.63 15.76';

/** Static SVG markup (inner) of the face at rest: used before scripts run and in exported files. */
export function staticSvg({ rows = 11, palette = PALETTE, idPrefix = 'rhea' } = {}) {
  const { lamps, radius } = lampField(rows);
  const dots = lamps.map((lamp) => {
    const light = lightAt(lamp, { still: true, smile: 0.2 });
    const cls = lamp.antenna ? ' class="rhea-lamp-antenna"' : (light > 0.6 ? ' class="rhea-lamp-lit"' : '');
    return `<circle${cls} cx="${lamp.x.toFixed(2)}" cy="${lamp.y.toFixed(2)}" r="${lampSize(light, radius).toFixed(2)}" fill="${lampColor(light, palette)}"/>`;
  }).join('');
  return `<defs><radialGradient id="${idPrefix}-halo"><stop offset="0" stop-color="${palette.on}" stop-opacity=".22"/><stop offset="1" stop-color="${palette.on}" stop-opacity="0"/></radialGradient></defs>`
    + `<circle cx="${CENTER.x}" cy="${CENTER.y}" r="${DISC + 1.5}" fill="${palette.disc}"/>`
    + `<circle cx="${CENTER.x}" cy="${CENTER.y + 2}" r="${DISC * 0.8}" fill="url(#${idPrefix}-halo)"/>`
    + `<path d="${RING_PATH}" fill="none" stroke="${palette.ring}" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>`
    + `<g class="rhea-lamps-dots">${dots}</g>`;
}

// ---------------------------------------------------------------- browser ----

const visibleHosts = new Set();
let pointer = null;

function makeGlow(color) {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 64;
  const ctx = sprite.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, color + 'aa');
  g.addColorStop(0.35, color + '33');
  g.addColorStop(1, color + '00');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return sprite;
}

function readPalette(host) {
  const css = getComputedStyle(host);
  const pick = (name, fallback) => (css.getPropertyValue(name).trim() || fallback);
  return {
    disc: pick('--rhea-lamp-disc', PALETTE.disc),
    off: pick('--rhea-lamp-off', PALETTE.off),
    on: pick('--rhea-lamp-on', PALETTE.on),
    core: pick('--rhea-lamp-core', PALETTE.core),
    ring: pick('--rhea-lamp-ring', PALETTE.ring),
  };
}

function setup(host) {
  const svg = host.querySelector('svg');
  const rows = Number(host.dataset.rows || 11);
  const { lamps, radius } = lampField(rows);
  const canvas = document.createElement('canvas');
  canvas.className = 'rhea-lamps-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.append(canvas);
  const ctx = canvas.getContext('2d');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Still: reduced motion, or a page mode that asks for quiet (data-mode="serio").
  const reduced = { get matches() { return motion.matches || document.documentElement.dataset.mode === 'serio'; } };
  const state = { gx: 0, gy: 0, tx: 0, ty: 0, blink: 0, smile: 0.2, smileTarget: 0.2, ripple: null, boot: reduced.matches ? 1 : 0 };
  let palette = readPalette(host);
  let glow = makeGlow(palette.on);
  let raf = 0;
  let last = 0;
  let nextBlink = 2 + Math.random() * 3;
  let blinkAt = -1;
  let nextGlance = 3;
  let size = 0;

  const resize = () => {
    const box = host.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = box.width;
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    ctx.setTransform((box.width * dpr) / 96, 0, 0, (box.height * dpr) / 96, 0, 0);
  };

  const draw = (t) => {
    ctx.clearRect(0, 0, 96, 96);
    ctx.fillStyle = palette.disc;
    ctx.beginPath();
    ctx.arc(CENTER.x, CENTER.y, DISC + 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = palette.ring;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(CENTER.x, CENTER.y, 35.5, -Math.PI / 2 + 0.27, -Math.PI / 2 - 0.27 + Math.PI * 2);
    ctx.stroke();
    const still = reduced.matches;
    for (const lamp of lamps) {
      const light = lightAt(lamp, { ...state, t, still, ripple: state.ripple });
      if (light > 0.45 && size > 48) {
        const g = radius * 5.2 * light;
        ctx.globalAlpha = Math.min(1, (light - 0.4) * 1.3);
        ctx.drawImage(glow, lamp.x - g, lamp.y - g, g * 2, g * 2);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = lampColor(light, palette);
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, lampSize(light, radius), 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const tick = (now) => {
    raf = 0;
    const t = now / 1000;
    const dt = Math.min(0.1, last ? t - last : 0.016);
    if (last && t - last < 1 / 32) { schedule(); return; }
    last = t;

    if (pointer) {
      const box = host.getBoundingClientRect();
      const reach = Math.max(box.width, 120) * 2;
      state.tx = Math.max(-1, Math.min(1, (pointer.x - box.left - box.width / 2) / reach));
      state.ty = Math.max(-1, Math.min(1, (pointer.y - box.top - box.height / 2) / reach));
    } else if (t > nextGlance) {
      const look = Math.random() < 0.4;
      state.tx = look ? Math.random() * 2 - 1 : 0;
      state.ty = look ? (Math.random() * 2 - 1) * 0.6 : 0;
      nextGlance = t + 2.5 + Math.random() * 3.5;
    }
    state.gx += (state.tx - state.gx) * Math.min(1, dt * 8);
    state.gy += (state.ty - state.gy) * Math.min(1, dt * 8);
    state.smile += (state.smileTarget - state.smile) * Math.min(1, dt * 7);
    state.boot = Math.min(1, state.boot + dt * 1.1);

    if (t > nextBlink) { blinkAt = t; nextBlink = t + 3.5 + Math.random() * 3.5; }
    const sinceBlink = t - blinkAt;
    state.blink = sinceBlink >= 0 && sinceBlink < 0.18 ? Math.sin((sinceBlink / 0.18) * Math.PI) : 0;

    if (state.ripple) {
      state.ripple.age += dt;
      if (state.ripple.age > 1.6) state.ripple = null;
    }
    draw(t);
    schedule();
  };

  const schedule = () => {
    if (!raf && visibleHosts.has(host) && !document.hidden && !reduced.matches) raf = requestAnimationFrame(tick);
  };

  const still = () => { state.boot = 1; draw(0); };

  const react = (event) => {
    const box = host.getBoundingClientRect();
    const u = event?.clientX ? ((event.clientX - box.left) / box.width * 96 - CENTER.x) / DISC : 0;
    const v = event?.clientY ? ((event.clientY - box.top) / box.height * 96 - CENTER.y) / DISC : 0;
    state.ripple = { u, v, age: 0 };
    state.smileTarget = 1;
    setTimeout(() => { if (!host.matches(':hover')) state.smileTarget = 0.2; }, 900);
    if (reduced.matches) { state.smile = 1; still(); setTimeout(() => { state.smile = 0.2; still(); }, 900); }
    host.dispatchEvent(new CustomEvent('rhea:react', { bubbles: true }));
  };

  host.addEventListener('pointerenter', () => { state.smileTarget = 1; if (reduced.matches) { state.smile = 1; still(); } });
  host.addEventListener('pointerleave', () => { state.smileTarget = 0.2; if (reduced.matches) { state.smile = 0.2; still(); } });
  host.addEventListener('pointerdown', react);
  host.addEventListener('rhea:poke', () => react());

  const refresh = () => { palette = readPalette(host); glow = makeGlow(palette.on); if (reduced.matches) still(); else schedule(); };
  new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-tone', 'data-theme', 'data-mode'] });
  motion.addEventListener?.('change', () => (reduced.matches ? still() : schedule()));
  new ResizeObserver(() => { resize(); if (reduced.matches) still(); else draw(last); }).observe(host);

  resize();
  host.classList.add('is-live');
  if (svg) svg.setAttribute('aria-hidden', 'true');
  if (reduced.matches) still();
  return { schedule, still };
}

const controllers = new Map();

export function initRheaLamps(root = document) {
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visibleHosts.add(entry.target);
      else visibleHosts.delete(entry.target);
      controllers.get(entry.target)?.schedule();
    }
  }) : null;
  for (const host of root.querySelectorAll('[data-rhea-lamps]')) {
    if (controllers.has(host)) continue;
    controllers.set(host, setup(host));
    if (io) io.observe(host);
    else { visibleHosts.add(host); controllers.get(host).schedule(); }
  }
  window.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') pointer = { x: event.clientX, y: event.clientY };
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    for (const c of controllers.values()) c.schedule();
  });
}
