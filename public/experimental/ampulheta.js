// ampulheta.js — controlador da ampulheta 3D: câmera orbital, cliques, rachaduras, inversão e quebra.
import { loadHourglassGLB } from './glb.js';
import { buildProfile, Sand, GRAIN_R, FLIP_S } from './ampulheta-sim.js';
import { createRenderer, mat } from './ampulheta-gl.js';
import { SandPile } from './ampulheta-pile.js';

const CENTER = [0, 0.065, 0];
const MAX_CRACKS = 20; // o 20º clique quebra o vidro
const WALL = 0.00175; // parede (0,8 mm) + folga do grão, para ir de raio interno a externo
const H = 0.13;

const smooth = (t) => t * t * (3 - 2 * t);

export async function startHourglass(canvas, opts = {}) {
  const timeScale = opts.timeScale || 1; // só para testes: acelera o relógio da areia
  const data = await loadHourglassGLB(opts.url || '/models/ampulheta.glb');
  const profile = buildProfile(data.glass.pos);
  const lowRest = new Float32Array(data.grains.length * 3);
  data.grains.forEach((g, i) => { lowRest[i * 3] = g.x; lowRest[i * 3 + 1] = g.y; lowRest[i * 3 + 2] = g.z; });
  const sand = new Sand(lowRest, profile);
  const renderer = createRenderer(canvas, {
    N: sand.N,
    glass: data.glass,
    grain: data.grainGeo,
  });

  const rOuter = (y) => profile.rAt(y) + WALL;
  const rInner = (y) => profile.rAt(y);

  // ---- estado da câmera
  const cam = { yaw: 0.6, pitch: 0.16, dist: 0.34, minD: 0.14, maxD: 1.2 };
  const eyeOf = () => [
    CENTER[0] + cam.dist * Math.cos(cam.pitch) * Math.sin(cam.yaw),
    CENTER[1] + cam.dist * Math.sin(cam.pitch),
    CENTER[2] + cam.dist * Math.cos(cam.pitch) * Math.cos(cam.yaw),
  ];

  // ---- estado do objeto
  let cracks = []; // { poly: [ [x,y,z]×4 ]×3 }
  let broken = false;
  let pile = null;
  let groupAngle = 0; // rotação atual em X (0 = em pé, π = invertida)
  const light = { x: 0.12, z: 0.12, y: 0.11, I: 0.45, col: [1.0, 0.74, 0.46] };
  let lastPointer = null;

  // ---- rotação do modelo: T(c)·Rx(a)·T(-c)
  const modelOf = (a) => mat.pivotX(CENTER, a);
  const rotLocalToWorld = (p, a) => {
    const co = Math.cos(a), si = Math.sin(a);
    const x = p[0], y = p[1] - CENTER[1], z = p[2] - CENTER[2];
    return [x, co * y - si * z + CENTER[1], si * y + co * z + CENTER[2]];
  };
  const rotWorldToLocal = (p, a) => rotLocalToWorld(p, -a);

  // ---- entrada: arrastar gira, roda do mouse e pinça dão zoom, clique cria rachadura
  const pointers = new Map();
  let drag = null;
  let pinchStart = 0;
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
      drag = null;
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    lastPointer = { x: e.clientX - rect.left, y: e.clientY - rect.top, w: rect.width, h: rect.height };
    if (!pointers.has(e.pointerId)) return;
    const prev = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStart > 0) cam.dist = clampD(cam.dist * (pinchStart / d));
      pinchStart = d;
      return;
    }
    if (drag) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      drag.moved += Math.hypot(dx, dy);
      cam.yaw -= dx * 0.008;
      cam.pitch = Math.max(-0.2, Math.min(1.25, cam.pitch + dy * 0.006));
    }
  });
  const endPointer = (e) => {
    const wasOne = pointers.size === 1;
    pointers.delete(e.pointerId);
    if (wasOne && drag && drag.moved < 6 && performance.now() - drag.t < 450 && e.type === 'pointerup') {
      clickAt(e.clientX, e.clientY);
    }
    if (pointers.size === 0) drag = null;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.dist = clampD(cam.dist * Math.exp(e.deltaY * 0.0012));
  }, { passive: false });
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickCenter(); }
    if (e.key === 'ArrowLeft') cam.yaw += 0.12;
    if (e.key === 'ArrowRight') cam.yaw -= 0.12;
    if (e.key === '+' || e.key === '=') cam.dist = clampD(cam.dist * 0.9);
    if (e.key === '-') cam.dist = clampD(cam.dist * 1.1);
  });
  const clampD = (d) => Math.max(cam.minD, Math.min(cam.maxD, d));

  // ---- raio da câmera através do pixel e teste contra a parede de vidro
  function rayFromClient(cx, cy) {
    const rect = canvas.getBoundingClientRect();
    const nx = ((cx - rect.left) / rect.width) * 2 - 1;
    const ny = 1 - ((cy - rect.top) / rect.height) * 2;
    const eye = eyeOf();
    const f = norm(sub(CENTER, eye));
    const r = norm(cross(f, [0, 1, 0]));
    const u = cross(r, f);
    const th = Math.tan(FOVY / 2);
    const d = norm([
      f[0] + r[0] * nx * th * rect.width / rect.height + u[0] * ny * th,
      f[1] + r[1] * nx * th * rect.width / rect.height + u[1] * ny * th,
      f[2] + r[2] * nx * th * rect.width / rect.height + u[2] * ny * th,
    ]);
    return { o: eye, d };
  }
  const FOVY = (35 * Math.PI) / 180;

  function hitGlass(cx, cy) {
    if (broken) return null;
    const { o, d } = rayFromClient(cx, cy);
    const a = groupAngle;
    for (let t = 0.02; t < 1.5; t += 0.0004) {
      const p = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
      const q = rotWorldToLocal(p, a);
      if (q[1] < 0 || q[1] > H) continue;
      const rr = Math.hypot(q[0], q[2]);
      if (rr <= rOuter(q[1]) + 0.0002 && rr >= rInner(q[1])) return q;
    }
    return null;
  }

  function clickAt(cx, cy) {
    const hit = hitGlass(cx, cy);
    if (hit) addCrack(hit);
  }
  function clickCenter() {
    const r = canvas.getBoundingClientRect();
    clickAt(r.left + r.width / 2, r.top + r.height / 2);
  }

  // ---- rachaduras: três ramos de 3 segmentos, presos à superfície do vidro
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  function onSurface(x, y, z) {
    const yy = Math.max(0.002, Math.min(H - 0.002, y));
    const rr = Math.hypot(x, z) || 1e-9;
    const R = rOuter(yy) - 0.00015;
    return [x / rr * R, yy, z / rr * R];
  }
  function branch(start, angle, len, steps) {
    const pts = [start];
    let p = start, a = angle;
    for (let i = 0; i < steps; i++) {
      const rr = Math.hypot(p[0], p[2]) || 1e-9;
      const ePhi = [-p[2] / rr, 0, p[0] / rr];
      const dir = [ePhi[0] * Math.cos(a), Math.sin(a), ePhi[2] * Math.cos(a)];
      const q = onSurface(p[0] + dir[0] * len, p[1] + dir[1] * len, p[2] + dir[2] * len);
      pts.push(q);
      p = q;
      a += (rnd() - 0.5) * 0.9;
    }
    while (pts.length < 4) pts.push(pts[pts.length - 1]);
    return pts.slice(0, 4);
  }
  function addCrack(q) {
    const s = onSurface(q[0], q[1], q[2]);
    const a0 = rnd() * Math.PI * 2;
    const main = branch(s, a0, 0.011 + rnd() * 0.006, 3);
    const b1 = branch(main[1], a0 + 0.9 + rnd() * 0.5, 0.006, 3);
    const b2 = branch(main[2], a0 - 0.9 - rnd() * 0.5, 0.005, 3);
    cracks.push({ poly: [main, b1, b2] });
    uploadCracks();
    if (cracks.length >= MAX_CRACKS) breakGlass();
  }
  function uploadCracks() {
    const flat = new Float32Array(12 * 64 * 4);
    cracks.forEach((c, ci) => {
      c.poly.forEach((poly, bi) => {
        poly.forEach((pt, k) => {
          const texel = (ci * 3 + bi) * 4 + k;
          flat[texel * 4] = pt[0]; flat[texel * 4 + 1] = pt[1]; flat[texel * 4 + 2] = pt[2]; flat[texel * 4 + 3] = 1;
        });
      });
    });
    renderer.setCracks(flat, cracks.length);
  }

  // ---- quebra: o vidro some e os grãos caem na mesa
  function breakGlass() {
    broken = true;
    const world = new Float32Array(sand.N * 3);
    const a = groupAngle;
    for (let i = 0; i < sand.N; i++) {
      const w = rotLocalToWorld([sand.pos[i * 3], sand.pos[i * 3 + 1], sand.pos[i * 3 + 2]], a);
      world[i * 3] = w[0]; world[i * 3 + 1] = w[1]; world[i * 3 + 2] = w[2];
    }
    pile = new SandPile(world, GRAIN_R);
  }

  // ---- laço principal
  let last = performance.now();
  let running = true;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000) * timeScale;
    last = now;
    if (!broken) {
      sand.update(dt);
      // ângulo do vidro durante e fora da inversão
      if (sand.flipT >= 0) {
        const e = smooth(Math.min(1, sand.flipT / FLIP_S));
        groupAngle = sand.flipped ? Math.PI * (1 - e) : Math.PI * e;
      } else {
        groupAngle = sand.flipped ? Math.PI : 0;
      }
      const inst = renderer.instData;
      inst.set(sand.pos);
    } else {
      pile.step(dt);
      renderer.instData.set(pile.p);
    }
    // câmera e luz
    const eye = eyeOf();
    const view = mat.lookAt(eye, CENTER, [0, 1, 0]);
    const proj = mat.persp(FOVY, canvas.width / canvas.height, 0.01, 10);
    if (lastPointer) {
      const o = rayFromClient(lastPointer.x + canvas.getBoundingClientRect().left, lastPointer.y + canvas.getBoundingClientRect().top);
      if (Math.abs(o.d[1]) > 1e-4) {
        const t = -o.o[1] / o.d[1];
        if (t > 0 && t < 5) {
          light.x = o.o[0] + o.d[0] * t;
          light.z = o.o[2] + o.d[2] * t;
        }
      }
    }
    renderer.draw({
      view, proj, eye, identity: IDENT,
      model: modelOf(groupAngle),
      grainModel: broken ? IDENT : modelOf(groupAngle),
      light: [light.x, light.y, light.z], lightCol: light.col, lightI: light.I,
      showGrains: true, showGlass: !broken,
    });
    requestAnimationFrame(frame);
  }
  const IDENT = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  resize(canvas);
  const ro = new ResizeObserver(() => resize(canvas));
  ro.observe(canvas);
  requestAnimationFrame((t) => { last = t; frame(t); });

  function resize(c) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(c.clientWidth * dpr));
    const h = Math.max(1, Math.round(c.clientHeight * dpr));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  }

  return {
    get state() { return { cycleT: sand.cycleT, departed: sand.departed, flips: sand.flips, cracks: cracks.length, broken }; },
    stop() { running = false; ro.disconnect(); },
  };
}

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function norm(a) { const l = Math.hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; }
