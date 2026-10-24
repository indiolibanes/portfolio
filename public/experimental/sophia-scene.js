// modo-experimental: cena da Sophia assustada (rig 3D da Sophia, sem Three.js; ver minigl.js).
// - olhos arregalados, pupilas pequenas, olhar disparando para os lados, tremor de medo;
// - a pata direita aponta para o botão de menu e, com o cursor sobre o menu/gaveta, para o cursor;
// - botão inferior esquerdo gira 360°; arrastar no fundo também gira; a roda do mouse (ou + / −) dá zoom.
// O cenário (lua, portal, lanternas, nuvens) é feito em HTML/CSS por LunarBackdrop.astro.
import { MiniGL, Node, sphere, cylinder, torus, octahedron, catmull, tube, hex } from './minigl.js';

const canvas = document.querySelector('[data-xm-sophia]');
const spinBtn = document.querySelector('[data-xm-spin]');
if (canvas) boot();

function boot() {
  let gl;
  try {
    gl = new MiniGL(canvas);
  } catch (err) {
    // Sem WebGL: a página continua com o cenário e o menu; só a Sophia some.
    canvas.hidden = true;
    if (spinBtn) spinBtn.hidden = true;
    document.documentElement.dataset.xmSophia = 'off';
    return;
  }
  document.documentElement.dataset.xmSophia = 'on';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ------------------------------------------------------------ materiais (mesmas cores do rig)
  const M = {
    fur: { color: '#f8fafc', shine: 22, spec: 0.12 },
    navy: { color: '#2a3f86', shine: 40, spec: 0.35 },
    coat: { color: '#ffffff', shine: 26, spec: 0.14 },
    crimson: { color: '#dc2626', shine: 30, spec: 0.3 },
    gold: { color: '#fbbf24', emissive: '#78350f', emissiveIntensity: 0.55, shine: 70, spec: 0.8 },
    dark: { color: '#090d16', shine: 80, spec: 0.5 },
    eye: { color: '#ffffff', emissive: '#c7d6ff', emissiveIntensity: 0.08, shine: 90, spec: 0.7 },
    drop: { color: '#9fe3ff', emissive: '#4cc2ff', emissiveIntensity: 0.4, shine: 90, spec: 0.9, alpha: 0.78 },
    shadow: { color: '#01030a', shine: 4, spec: 0, alpha: 0.5, rim: 0 },
    brow: { color: '#1b2a63', shine: 30, spec: 0.2 },
  };

  const root = new Node('root');
  const sophia = root.add(new Node('sophia'));

  const part = (geo, mat, parent, o = {}) => {
    const n = new Node();
    n.mesh = gl.mesh(geo, M[mat]);
    if (o.p) n.position = o.p;
    if (o.r) n.rotation = o.r;
    if (o.s) n.scale = o.s;
    parent.add(n);
    return n;
  };
  const group = (parent, p, r, s) => {
    const n = new Node();
    if (p) n.position = p;
    if (r) n.rotation = r;
    if (s) n.scale = s;
    parent.add(n);
    return n;
  };

  // sombra no chão
  part(sphere(1, 20, 8), 'shadow', root, { p: [0, 0.004, 0], s: [0.78, 0.012, 0.56] });

  // 1. corpo e jaleco
  const coat = part(cylinder(0.28, 0.46, 0.78, 20), 'coat', sophia, { p: [0, 0.68, 0] });
  part(octahedron(0.11), 'gold', coat, { p: [0, 0.12, -0.33], s: [1, 1.4, 0.2] });
  part(torus(0.33, 0.045, 10, 24), 'crimson', coat, { p: [0, -0.05, 0] });

  [-0.16, 0.16].forEach((x) => {
    const leg = part(cylinder(0.09, 0.08, 0.35, 14), 'navy', sophia, { p: [x, 0.18, 0] });
    part(sphere(0.1, 14, 12), 'navy', leg, { p: [0, -0.15, 0.04], s: [1, 0.6, 1.35] });
  });

  // 2. cabeça
  const head = group(sophia, [0, 1.32, 0]);
  part(sphere(0.46, 24, 20), 'fur', head, { s: [1.18, 0.96, 1.02] });
  [-1, 1].forEach((d) => part(cylinder(0, 0.18, 0.32, 12), 'fur', head, { p: [d * 0.52, -0.08, 0.05], r: [0, 0, d * -1.25] }));
  part(octahedron(0.09), 'gold', head, { p: [0, 0.22, 0.45], s: [0.85, 1.55, 0.25] });

  const ears = [-1, 1].map((d) => {
    const pivot = group(head, [d * 0.28, 0.32, -0.02], [0, 0, d * -0.38]);
    part(cylinder(0, 0.2, 0.52, 16), 'navy', pivot, { p: [0, 0.22, 0] });
    part(sphere(0.045, 12, 12), 'gold', pivot, { p: [d * 0.14, 0.05, 0.08] });
    return { pivot, d };
  });

  // olhos arregalados: esclera branca grande, íris dourada menor, pupila minúscula (susto)
  const EYE_SCALE = 1.42;
  const eyes = [-0.21, 0.21].map((x) => {
    const socket = group(head, [x, -0.02, 0.41], null, [EYE_SCALE, EYE_SCALE, EYE_SCALE]);
    part(sphere(0.11, 18, 16), 'eye', socket, { s: [1.1, 1.0, 0.35] });
    const iris = group(socket, [0, 0, 0.03]);
    part(sphere(0.064, 16, 14), 'gold', iris, { s: [1, 1, 0.4] });
    const pupil = part(sphere(0.026, 12, 10), 'dark', iris, { p: [0, 0, 0.026], s: [1, 1, 0.4] });
    part(sphere(0.014, 8, 8), 'coat', iris, { p: [-0.02, 0.022, 0.04] });
    return { socket, iris, pupil };
  });

  // sobrancelhas de susto: pontas internas erguidas
  [-1, 1].forEach((d) => part(cylinder(0.016, 0.016, 0.17, 8), 'brow', head, { p: [d * 0.2, 0.225, 0.372], r: [0, 0, -d * 0.4 - Math.PI / 2] }));

  // boca em “O” e gota de suor
  const mouth = part(sphere(0.05, 14, 12), 'dark', head, { p: [0, -0.2, 0.415], s: [1, 1.4, 0.4] });
  const sweat = part(sphere(0.035, 10, 10), 'drop', head, { p: [0.3, 0.25, 0.3], s: [0.8, 1.2, 0.6] });

  // 3. braços: a direita aponta (dedo em cone); a esquerda treme junto da bochecha
  const arm = (dir, finger) => {
    const sh = group(sophia, [dir * 0.28, 0.96, 0.05]);
    part(cylinder(0.075, 0.12, 0.38, 14), 'coat', sh, { p: [dir * 0.18, 0, 0], r: [0, 0, -dir * Math.PI / 2] });
    const paw = part(sphere(0.075, 14, 14), 'navy', sh, { p: [dir * 0.38, 0, 0] });
    if (finger) part(cylinder(0.012, 0.032, 0.24, 10), 'navy', paw, { p: [dir * 0.14, 0.01, 0], r: [0, 0, -dir * Math.PI / 2] });
    else part(cylinder(0.022, 0.028, 0.12, 10), 'navy', paw, { p: [dir * 0.08, 0.01, 0], r: [0, 0, dir * Math.PI / 2] });
    return sh;
  };
  const armL = arm(-1, false);
  const armR = arm(1, true);

  // 4. cauda estelar
  const tail = group(sophia, [0, 0.52, -0.28]);
  const spine = [[0, 0, 0], [0.18, 0.08, -0.35], [0.32, 0.38, -0.58], [0.22, 0.78, -0.48], [0.05, 1.02, -0.25]];
  part(tube(catmull(spine, 28), 0.22, 16), 'navy', tail);
  catmull(spine, 6).slice(1).forEach((pt) => part(octahedron(0.045), 'gold', tail, { p: [pt[0] + 0.16, pt[1], pt[2]] }));

  // ------------------------------------------------------------ ambiente: frio (azul) + calor (vermelho)
  const env = {
    sky: hex('#86a6ee', 0.42),
    ground: hex('#101a42', 0.28),
    d0: norm([-0.45, 0.55, 0.75]),
    c0: hex('#d3e3ff', 0.8), // luar
    d1: norm([0.85, 0.05, 0.45]),
    c1: hex('#ff5638', 0.38), // luz quente das lanternas, vinda da direita
    pp: [-1.4, 1.9, 1.6],
    pc: hex('#ff7a50', 0.4),
    rim: hex('#a9c6ff', 0.9),
  };
  function norm(v) {
    const l = Math.hypot(...v);
    return v.map((x) => x / l);
  }

  // ------------------------------------------------------------ estado
  const FOV = (38 * Math.PI) / 180;
  const cam = { fov: FOV, x: 0, y: 0.95, dist: 5, tx: -0.36, ty: -0.06 };
  let aspect = 1;
  let baseDist = 5;
  let zoom = 1; // alvo (multiplicador)
  let zoomNow = 1;
  let yaw = 0;
  let spin = null;
  let drag = null;
  let pointer = null; // posição do cursor quando sobre o menu
  let menuHit = { x: innerWidth - 60, y: 80 };

  const layout = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    gl.setSize(innerWidth, innerHeight, dpr);
    aspect = innerWidth / innerHeight;
    const narrow = aspect < 0.85;
    cam.tx = narrow ? -0.12 : -0.36;
    cam.ty = narrow ? -0.12 : -0.06;
    baseDist = narrow ? 7.2 : 5;
    const toggle = document.querySelector('[data-xm-toggle]');
    if (toggle) {
      const r = toggle.getBoundingClientRect();
      menuHit = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
  };
  layout();
  window.addEventListener('resize', layout);

  const project = (x, y, z) => {
    const f = 1 / Math.tan(cam.fov / 2);
    const w = cam.dist - z;
    const nx = ((f / aspect) * (x - cam.x)) / w + cam.tx;
    const ny = (f * (y - cam.y)) / w + cam.ty;
    return [(nx * 0.5 + 0.5) * innerWidth, (1 - (ny * 0.5 + 0.5)) * innerHeight];
  };
  const toWorld = (x, y, z) => {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    return [x * c + z * s, y, -x * s + z * c];
  };

  // ------------------------------------------------------------ entrada
  const overMenu = (t) => t instanceof Element && !!t.closest('.xm-menu');
  window.addEventListener('pointermove', (e) => {
    pointer = overMenu(e.target) ? { x: e.clientX, y: e.clientY } : null;
    if (drag) {
      yaw = drag.yaw + (e.clientX - drag.x) * 0.012;
      spin = null;
    }
  });
  document.addEventListener('pointerleave', () => { pointer = null; });
  window.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target instanceof Element && e.target.closest('a, button, .xm-menu, .xm-stage-ui')) return;
    drag = { x: e.clientX, yaw };
    document.documentElement.dataset.xmDrag = 'true';
  });
  const endDrag = () => {
    drag = null;
    delete document.documentElement.dataset.xmDrag;
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  const setZoom = (z) => { zoom = clamp(z, 0.32, 1.9); };
  window.addEventListener('wheel', (e) => {
    if (e.target instanceof Element && e.target.closest('.xm-drawer')) return;
    e.preventDefault();
    setZoom(zoom * Math.exp(e.deltaY * 0.0013));
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof Element && e.target.closest('input, textarea, [contenteditable]')) return;
    if (e.key === '+' || e.key === '=') setZoom(zoom * 0.87);
    else if (e.key === '-' || e.key === '_') setZoom(zoom / 0.87);
  });

  const startSpin = () => {
    if (spin) return;
    spin = { from: yaw, t0: performance.now(), dur: reduce.matches ? 1200 : 4200 };
  };
  spinBtn?.addEventListener('click', startSpin);

  // ------------------------------------------------------------ olhar (sustos)
  const look = { x: 0.9, y: 0.35, tx: 0.9, ty: 0.35, next: 0.6, side: -1 };
  let sweatT = 0;

  const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  let aimAngle = 0.5; // rad, pata que aponta
  let prev = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    const t = now / 1000;
    const still = reduce.matches;

    // giro
    if (spin) {
      const p = clamp((now - spin.t0) / spin.dur, 0, 1);
      yaw = spin.from + Math.PI * 2 * ease(p);
      if (p >= 1) {
        yaw = spin.from + Math.PI * 2;
        spin = null;
      }
    }
    yaw = ((yaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    sophia.rotation[1] = yaw;

    // zoom
    zoomNow = lerp(zoomNow, zoom, 1 - Math.pow(0.0008, dt));
    cam.dist = baseDist * zoomNow;
    cam.y = clamp(0.95 + (baseDist - cam.dist) * 0.075, 0.55, 1.4);

    // alvo da pata: cursor sobre o menu, senão o botão do menu
    const aim = pointer || menuHit;
    const [sx, sy] = project(...toWorld(0.28, 0.96, 0.05));
    const wanted = clamp(Math.atan2(-(aim.y - sy), aim.x - sx), -1.15, 1.35);
    aimAngle = lerp(aimAngle, wanted, 1 - Math.pow(0.002, dt));

    // olhar: com o cursor no menu, segue o cursor; senão dispara de um lado a outro
    if (pointer) {
      const [ex, ey] = project(...toWorld(0, 1.3, 0.4));
      look.tx = clamp((pointer.x - ex) / (innerWidth * 0.35), -1, 1);
      look.ty = clamp(-(pointer.y - ey) / (innerHeight * 0.35), -1, 1);
    } else if (!still) {
      look.next -= dt;
      if (look.next <= 0) {
        const r = Math.random();
        if (r < 0.28) { look.tx = 0.95; look.ty = 0.55; look.next = rnd(0.7, 1.1); } // de olho no menu
        else { look.side = -look.side; look.tx = look.side * rnd(0.75, 1); look.ty = rnd(-0.2, 0.4); look.next = rnd(0.35, 0.8); }
      }
    } else {
      look.tx = 0.9;
      look.ty = 0.35;
    }
    const lk = 1 - Math.pow(still ? 0.01 : 0.0000025, dt); // olhar rápido, quase um tique
    look.x = lerp(look.x, look.tx, lk);
    look.y = lerp(look.y, look.ty, lk);

    // pose
    const shiver = still ? 0 : Math.sin(t * 52) * 0.5 + Math.sin(t * 37 + 1) * 0.5;
    sophia.position[0] = shiver * 0.005;
    sophia.scale[1] = 1 + (still ? 0 : Math.sin(t * 11) * 0.008);
    head.rotation[1] = look.x * 0.3;
    head.rotation[0] = -look.y * 0.12;
    head.rotation[2] = shiver * 0.012 + (still ? 0 : Math.sin(t * 2.3) * 0.02);

    eyes.forEach((e) => {
      e.iris.position[0] = look.x * 0.052;
      e.iris.position[1] = look.y * 0.042;
      const pupil = still ? 0.8 : 0.78 + Math.sin(t * 9) * 0.06; // pupila minúscula, pulsando
      e.pupil.scale[0] = e.pupil.scale[1] = pupil;
      const blinkWide = still ? 1 : 1 + Math.max(0, Math.sin(t * 1.7)) * 0.04;
      e.socket.scale[0] = e.socket.scale[1] = e.socket.scale[2] = EYE_SCALE * blinkWide;
    });

    ears.forEach(({ pivot, d }) => {
      pivot.rotation[2] = d * (-0.62 + (still ? 0 : shiver * 0.05));
    });
    mouth.scale[1] = 1.4 + (still ? 0 : Math.sin(t * 7) * 0.18);
    mouth.scale[0] = 1 + (still ? 0 : Math.cos(t * 7) * 0.08);

    armR.rotation[2] = aimAngle + (still ? 0 : shiver * 0.012);
    armL.rotation[2] = -1.0 + (still ? 0 : shiver * 0.07);
    tail.rotation[1] = still ? 0.2 : Math.sin(t * 1.6) * 0.28 + shiver * 0.03;

    // gota de suor escorre pela testa
    sweatT = (sweatT + dt * 0.7) % 1;
    const sy2 = still ? 0.12 : 0.27 - sweatT * 0.46;
    const sx2 = 0.3 + sweatT * 0.07;
    const hz = 0.469 * Math.sqrt(Math.max(0.02, 1 - (sx2 / 0.543) ** 2 - (sy2 / 0.4416) ** 2));
    sweat.position[0] = sx2;
    sweat.position[1] = sy2;
    sweat.position[2] = hz + 0.015;

    gl.render(root, cam, env);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
