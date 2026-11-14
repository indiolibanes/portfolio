// sophia-actor.js — a Sophia 3D como "ator" das páginas (substitui as ilustrações 2D quando o 3D está disponível).
//
// Um único contexto WebGL2 (fora da tela) e um único GLB (sophia-lab.glb: Sophia v1.4.2 + jaleco + ornamentos) servem
// todos os atores da página. Cada ator tem o próprio esqueleto (pose) e um <canvas> 2D onde recebe o quadro; a arte 2D
// original continua no DOM como reserva (sem WebGL2, Save-Data, pouca memória, prefers-reduced-motion, modos
// retrô/sério/monocromático, falha de carga). Só começa a baixar quando o ator entra na tela.
//
// Uso (HTML):
//   <div data-sophia-actor="runner" data-sophia-clip="Correr_R6" data-sophia-cam="full" data-sophia-yaw="0.95">…2D…</div>
//   atributos: data-sophia-clip (laço), data-sophia-cam (full | bust | head), data-sophia-yaw (rad), data-sophia-speed,
//              data-sophia-props ("book,pen"), data-sophia-mood (ver MOODS), data-sophia-variant (0 espiral, 1 coração)
// O ator pronto recebe data-sophia-3d="on" (CSS esconde a arte 2D) e dispara o evento "sophia:actor-ready".
import { Renderer, fetchGLB, hex } from './gltf-gl.js';
import { Skeleton, parseGLB } from './gltf-skel.js';

export const MODEL_URL = '/assets/models/sophia/sophia-lab.glb';

// humor → clipe de rosto/pose (os clipes *_R6 já trazem corpo parado + expressão) e variante de olhos
export const MOODS = {
  idle: { clip: 'Sophia_Expr_Seria_R6' },
  playing: { clip: 'Sophia_Expr_Encarando_R6' },
  cheer: { clip: 'Sophia_Expr_Feliz_R6' },
  over: { clip: 'Sophia_Expr_Triste_R6' },
  love: { clip: 'Sophia_Expr_Apaixonada_R6', variant: 1 },
  dizzy: { clip: 'Sophia_Expr_Tonta_R6', variant: 0 },
  wow: { clip: 'Sophia_Expr_Encantada_R6' },
};

const CENTER = { x: -0.177, z: 0.13 }; // centro do corpo no espaço da malha
const CAMERAS = {
  // alvo (y) e distância para fov 30°; a altura do modelo é ~1,0 (orelhas incluídas)
  full: { y: 0.5, dist: 2.15, fov: 30 },
  bust: { y: 0.6, dist: 1.5, fov: 30 },
  head: { y: 0.76, dist: 1.05, fov: 30 },
};
const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const ENV = {
  sky: hex('#c8d4ff', 0.6),
  ground: hex('#6a6aa0', 0.4),
  d0: norm([-0.4, 0.7, 0.6]),
  c0: hex('#fff3e0', 1.0),
  d1: norm([0.9, 0.1, 0.4]),
  c1: hex('#ffa070', 0.4),
  pp: [-0.9, 1.5, 1.2],
  pc: hex('#ffd0b0', 0.2),
  rim: hex('#8fb2ff', 1),
  rimK: 0.3,
  exposure: 1.0,
};

const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const constrained = () => navigator.connection?.saveData === true
  || (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory <= 4);
const quiet = () => {
  const d = document.documentElement.dataset;
  return d.legacyMode === 'true' || d.seriousMode === 'true' || d.monoMode === 'true' || d.einkMode === 'true';
};
export const actorsAllowed = () => !reduceQuery.matches && !constrained() && !quiet();

// ------------------------------------------------------------------ palco compartilhado
let stagePromise = null;
function getStage() {
  if (!stagePromise) {
    stagePromise = (async () => {
      const canvas = document.createElement('canvas');
      const renderer = new Renderer(canvas);
      const buffer = await fetchGLB(MODEL_URL);
      const model = await renderer.loadModel(buffer);
      const { json, bin } = parseGLB(buffer);
      return { renderer, model, json, bin };
    })().catch((err) => { stagePromise = null; throw err; });
  }
  return stagePromise;
}

// ------------------------------------------------------------------ ator
class Actor {
  constructor(el, stage) {
    this.el = el;
    this.stage = stage;
    this.sk = new Skeleton(stage.json, stage.bin);
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'sophia-actor__canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.dataset.sophiaActorCanvas = '';
    el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    const d = el.dataset;
    this.cam = CAMERAS[d.sophiaCam] || CAMERAS.full;
    this.yaw = parseFloat(d.sophiaYaw || '0');
    this.speed = parseFloat(d.sophiaSpeed || '1');
    this.props = new Set((d.sophiaProps || '').split(',').map((s) => s.trim()).filter(Boolean));
    this.variant = d.sophiaVariant === undefined ? null : parseInt(d.sophiaVariant, 10);
    this.layers = []; // [{ clip, time, weight }]
    this.fade = null;
    this.time = parseFloat(d.sophiaPhase || '0');
    this.visible = false;
    this.w = 0; this.h = 0;
    this.setClip(d.sophiaClip || MOODS[d.sophiaMood || 'idle']?.clip || MOODS.idle.clip, true);
    if (d.sophiaMood && MOODS[d.sophiaMood]?.variant !== undefined) this.variant = MOODS[d.sophiaMood].variant;
  }

  clipByName(name) { return this.sk.clips[name] || null; }

  // troca de clipe com mistura curta (0,25 s) para não "pular"
  setClip(name, instant = false) {
    const clip = this.clipByName(name);
    if (!clip || this.clipName === name) return;
    this.clipName = name;
    if (instant || !this.layers.length) {
      this.layers = [{ clip, time: this.time, weight: 1 }];
      this.fade = null;
    } else {
      const old = this.layers.map((l) => ({ ...l }));
      this.layers = [...old.map((l) => ({ ...l, weight: 1 })), { clip, time: 0, weight: 0 }];
      this.fade = { t: 0, dur: 0.25 };
    }
  }

  react(mood) {
    const m = MOODS[mood] || MOODS.idle;
    this.setClip(m.clip);
    this.variant = m.variant === undefined ? null : m.variant;
  }

  size() {
    const r = this.el.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(2, Math.min(1024, Math.round(r.width * dpr)));
    const h = Math.max(2, Math.min(1024, Math.round(r.height * dpr)));
    if (w !== this.w || h !== this.h) { this.w = w; this.h = h; this.canvas.width = w; this.canvas.height = h; }
  }

  step(dt) {
    const s = this.sk;
    for (const l of this.layers) l.time += dt * this.speed;
    this.time += dt * this.speed;
    if (this.fade) {
      this.fade.t += dt;
      const k = Math.min(1, this.fade.t / this.fade.dur);
      const n = this.layers.length;
      this.layers.forEach((l, i) => { l.weight = i === n - 1 ? k : 1 - k; });
      if (k >= 1) { this.layers = [this.layers[n - 1]]; this.layers[0].weight = 1; this.fade = null; }
    }
    s.evaluate(this.layers);
    s.updateWorld();
    s.updateSkin();
  }

  draw() {
    this.size();
    const { renderer, model } = this.stage;
    renderer.setSize(this.w, this.h, 1);
    const c = this.cam;
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    const pose = {
      x: -(cy * CENTER.x + sy * CENTER.z), y: 0, z: -(-sy * CENTER.x + cy * CENTER.z), yaw: this.yaw, scale: 1,
    };
    const cam = { fov: (c.fov * Math.PI) / 180, x: 0, y: c.y, dist: c.dist, tx: 0, ty: 0 };
    for (const d of model.draws) if (d.extras?.hidden) d.hidden = !this.props.has((this.sk.names[d.node] || '').replace(/^Prop_/, '').toLowerCase());
    renderer.render({ draws: model.draws, skeleton: this.sk, variant: this.variant }, pose, cam, ENV, null);
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.ctx.drawImage(renderer.canvas, 0, 0);
  }
}

// ------------------------------------------------------------------ gerência
const actors = new Map(); // el → Actor
const pending = new Set();
let raf = 0;
let last = 0;

function loop(now) {
  raf = 0;
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  let any = false;
  for (const a of actors.values()) {
    if (!a.visible) continue;
    // DecorativeMotion limita os laços simultâneos: fora da cota, o quadro congela
    if (a.el.closest('[data-decorative-motion]')?.dataset.motionPlaying === 'false') continue;
    a.step(dt);
    a.draw();
    any = true;
  }
  if (any && !document.hidden) raf = requestAnimationFrame(loop);
}
function kick() {
  if (!raf && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); }
}

async function wake(el) {
  if (actors.has(el) || pending.has(el) || el.dataset.sophiaFailed || !actorsAllowed()) return;
  pending.add(el);
  try {
    const stage = await getStage();
    if (!el.isConnected) return;
    const a = new Actor(el, stage);
    actors.set(el, a);
    a.visible = visible.has(el);
    a.step(0); a.draw();
    el.dataset.sophia3d = 'on';
    el.dataset.sophiaReady = 'true';
    el.dataset.sophiaModel = 'sophia-v1.4.2-lab';
    el.dispatchEvent(new CustomEvent('sophia:actor-ready', { bubbles: true, detail: { actor: a } }));
    kick();
  } catch (err) {
    el.dataset.sophiaFailed = 'true';
    el.dataset.sophiaReady = 'false';
    console.warn('[Sophia 3D] indisponível; mantendo a ilustração.', err);
  } finally {
    pending.delete(el);
  }
}

const visible = new Set();
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) { visible.add(e.target); void wake(e.target); } else visible.delete(e.target);
    const a = actors.get(e.target);
    if (a) a.visible = visible.has(e.target);
  }
  kick();
}, { rootMargin: '120px 0px', threshold: 0.01 });

function sync() {
  const on = actorsAllowed();
  // modo retrô/sério/movimento reduzido: o 3D se cala e a arte 2D volta (e vice-versa)
  for (const el of actors.keys()) { el.dataset.sophia3d = on ? 'on' : 'off'; el.dataset.sophiaReady = on ? 'true' : 'false'; }
  if (on) { for (const el of visible) void wake(el); kick(); }
}

export function mountActors(root = document) {
  root.querySelectorAll('[data-sophia-actor]').forEach((el) => io.observe(el));
}
export function actorOf(el) { return actors.get(el) || null; }

document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
reduceQuery.addEventListener?.('change', sync);
new MutationObserver(sync).observe(document.documentElement, {
  attributes: true, attributeFilter: ['data-serious-mode', 'data-legacy-mode', 'data-mono-mode', 'data-eink-mode'],
});
// humor vindo do Tetris da 404 (sophia:tetris { mood })
document.addEventListener('sophia:tetris', (ev) => {
  const mood = ev.detail?.mood || 'idle';
  for (const [el, a] of actors) if (el.dataset.sophiaReacts !== undefined) a.react(mood);
});
window.addEventListener('pagehide', () => { io.disconnect(); actors.clear(); }, { once: true });

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mountActors(), { once: true });
else mountActors();
