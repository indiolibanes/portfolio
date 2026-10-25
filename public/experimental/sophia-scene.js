// modo-experimental: a Sophia de verdade (sophia.glb), assustada, apontando para o menu.
// - olhos arregalados que disparam de um lado ao outro; ao passar o cursor no menu/gaveta ela segue o cursor;
// - a mão direita (animação "Point") aponta para o botão do menu e, com o cursor no menu, para o cursor;
// - tremor de medo, orelhas para trás, leve recuo do corpo;
// - anda para a direita ou esquerda (setas, A/D, botões ◀ ▶ e passeios curtos por conta própria);
// - botão inferior esquerdo gira 360°; arrastar o fundo também gira; roda do mouse, +/− e pinça dão zoom.
// O cenário (lua, portal, lanternas, nuvens) fica em HTML/CSS (LunarBackdrop.astro) e será trocado depois.
// Motor: gltf-skel.js (esqueleto/animação) + gltf-gl.js (WebGL2). O CSP do site não aceita CDN, então não há Three.js.
import { Renderer, fetchGLB, hex, quat } from './gltf-gl.js';

const canvas = document.querySelector('[data-xm-sophia]');
const spinBtn = document.querySelector('[data-xm-spin]');
const hint = document.querySelector('.xm-hint');
const GLB_URL = '/experimental/sophia.glb';

if (canvas) boot();

function off() {
  canvas.hidden = true;
  document.documentElement.dataset.xmSophia = 'off';
}

async function boot() {
  let renderer;
  try {
    renderer = new Renderer(canvas);
  } catch (err) {
    // Sem WebGL2: a página continua com o cenário e o menu; só a Sophia some.
    off();
    return;
  }
  document.documentElement.dataset.xmSophia = 'loading';
  const hintText = hint ? hint.textContent : '';
  if (hint) hint.textContent = 'Chamando a Sophia…';

  let model;
  try {
    const buf = await fetchGLB(GLB_URL, (p) => { if (hint) hint.textContent = `Chamando a Sophia… ${Math.round(p * 100)}%`; });
    // tufos de pelo reduzidos: do contrário cobrem fitas, brincos de orelha e as estrelas da cauda
    model = await renderer.loadModel(buf, {
      thin: { Sophia_fur_locks: 0.8, Sophia_tail_locks: 0.55 },
      shrink: { Sophia_fur_locks: 0.75, Sophia_tail_locks: 0.8 },
    });
  } catch (err) {
    console.warn('[modo-experimental] Sophia não carregou:', err);
    off();
    return;
  }
  document.documentElement.dataset.xmSophia = 'on';
  if (hint) hint.textContent = hintText;
  run(renderer, model);
}

function run(renderer, model) {
  const sk = model.skeleton;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const damp = (rate, dt) => 1 - Math.exp(-rate * dt); // suavização independente do fps

  // Livro e caneta não combinam com o susto (e a mão direita aponta).
  model.draws.forEach((d) => { if (sk.names[d.node] === 'Book' || sk.names[d.node] === 'Pen') d.hidden = true; });

  const POINT = sk.clips.Point;
  const WALK = sk.clips.Walk;
  const ARM_R = ['upper_arm_R', 'forearm_R', 'hand_R', 'fingers_R', 'thumb_R'].filter((n) => n in sk.index);
  const armSaved = ARM_R.map(() => new Float32Array(4));

  // ------------------------------------------------------------ ambiente: frio (azul) + calor (vermelho)
  const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
  const env = {
    sky: hex('#b4c8ff', 0.55),
    ground: hex('#3a4a8c', 0.38),
    d0: norm([-0.5, 0.6, 0.65]), // luar: do alto à esquerda, na frente
    c0: hex('#cfe0ff', 0.95),
    d1: norm([0.9, 0.1, 0.4]), // brasa das lanternas, vinda da direita
    c1: hex('#ff6a48', 0.5),
    pp: [-0.9, 1.5, 1.2],
    pc: hex('#ff7a50', 0.2),
    rim: hex('#8fb2ff', 1),
    rimK: 0.3,
    exposure: 0.92,
  };

  // ------------------------------------------------------------ câmera
  const FOV = (38 * Math.PI) / 180;
  const cam = { fov: FOV, x: 0, y: 0.5, dist: 2.5, tx: -0.36, ty: -0.06 };
  let aspect = 1;
  let baseDist = 2.5;
  let zoom = 1;
  let zoomNow = 1;
  let menuHit = { x: innerWidth - 60, y: 80 };

  const layout = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setSize(innerWidth, innerHeight, dpr);
    aspect = innerWidth / innerHeight;
    const narrow = aspect < 0.85;
    cam.tx = narrow ? -0.12 : -0.36;
    cam.ty = narrow ? -0.12 : -0.06;
    baseDist = narrow ? 3.8 : 2.5;
    const toggle = document.querySelector('[data-xm-toggle]');
    if (toggle) {
      const r = toggle.getBoundingClientRect();
      menuHit = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
  };
  layout();
  window.addEventListener('resize', layout);

  // ------------------------------------------------------------ estado da personagem
  const FACE_MENU = 0.85; // de pé, quase de perfil para a direita (o menu fica lá); a cabeça volta-se para quem olha
  const pose = { x: 0, y: 0, z: 0, yaw: FACE_MENU, scale: 1 };
  let faceYaw = FACE_MENU;
  let userYaw = 0; // giro de 360°/arrasto
  let spin = null;
  let drag = null;
  let pointer = null; // cursor sobre o menu
  let walkAmt = 0; // 0 parada .. 1 andando
  let walkPhase = 0;
  let dirIntent = 0; // -1 esquerda, 1 direita (teclado/botões)
  let step = null; // passo curto do botão por teclado
  let wander = { target: 0, wait: rnd(5, 9) };
  let idleSince = 0;
  let lookBack = 1;
  let leftWalk = 0; // 1 enquanto anda para a esquerda: a mira do braço desliga
  const keys = new Set();

  // limites de tela: a Sophia nunca sai do quadro
  const xRange = () => {
    const w = cam.dist - pose.z;
    const f = 1 / Math.tan(cam.fov / 2);
    const k = (w * aspect) / f;
    const margin = 0.2;
    return [(-0.86 - cam.tx) * k + margin + cam.x, (0.7 - cam.tx) * k - margin + cam.x];
  };

  // ------------------------------------------------------------ projeção
  const project = (x, y, z) => {
    const f = 1 / Math.tan(cam.fov / 2);
    const w = cam.dist - z;
    const nx = ((f / aspect) * (x - cam.x)) / w + cam.tx;
    const ny = (f * (y - cam.y)) / w + cam.ty;
    return [(nx * 0.5 + 0.5) * innerWidth, (1 - (ny * 0.5 + 0.5)) * innerHeight];
  };
  // ponto da tela → ponto do mundo no plano z = zPlane
  const unproject = (sx, sy, zPlane) => {
    const f = 1 / Math.tan(cam.fov / 2);
    const w = cam.dist - zPlane;
    const nx = (sx / innerWidth) * 2 - 1;
    const ny = 1 - (sy / innerHeight) * 2;
    return [cam.x + ((nx - cam.tx) * w * aspect) / f, cam.y + ((ny - cam.ty) * w) / f, zPlane];
  };
  const toWorld = (p) => {
    const c = Math.cos(pose.yaw);
    const s = Math.sin(pose.yaw);
    return [pose.x + p[0] * c + p[2] * s, pose.y + p[1], pose.z - p[0] * s + p[2] * c];
  };
  const dirToModel = (d) => {
    const c = Math.cos(pose.yaw);
    const s = Math.sin(pose.yaw);
    return [d[0] * c - d[2] * s, d[1], d[0] * s + d[2] * c];
  };

  // ------------------------------------------------------------ entrada
  const overMenu = (t) => t instanceof Element && !!t.closest('.xm-menu');
  window.addEventListener('pointermove', (e) => {
    pointer = overMenu(e.target) ? { x: e.clientX, y: e.clientY } : null;
    if (drag) {
      userYaw = drag.yaw + (e.clientX - drag.x) * 0.012;
      spin = null;
    }
  });
  document.addEventListener('pointerleave', () => { pointer = null; });
  window.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    if (e.target instanceof Element && e.target.closest('a, button, .xm-menu, .xm-stage-ui')) return;
    drag = { x: e.clientX, yaw: userYaw };
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

  // pinça (toque com dois dedos)
  const touches = new Map();
  let pinch0 = null;
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return;
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) {
      const [a, b] = [...touches.values()];
      pinch0 = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), zoom };
      drag = null;
    }
  });
  window.addEventListener('pointermove', (e) => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2 && pinch0) {
      const [a, b] = [...touches.values()];
      setZoom(pinch0.zoom * (pinch0.d / Math.max(10, Math.hypot(a[0] - b[0], a[1] - b[1]))));
    }
  });
  const endTouch = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch0 = null; };
  window.addEventListener('pointerup', endTouch);
  window.addEventListener('pointercancel', endTouch);

  const typing = (t) => t instanceof Element && !!t.closest('input, textarea, select, [contenteditable]');
  window.addEventListener('keydown', (e) => {
    if (typing(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '+' || e.key === '=') setZoom(zoom * 0.87);
    else if (e.key === '-' || e.key === '_') setZoom(zoom / 0.87);
    else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { keys.add(-1); e.preventDefault(); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keys.add(1); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.delete(-1);
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.delete(1);
  });
  window.addEventListener('blur', () => { keys.clear(); held = 0; });

  // botões ◀ ▶: segurar anda; Enter/Espaço (teclado) dá um passo
  let held = 0;
  document.querySelectorAll('[data-xm-walk]').forEach((btn) => {
    const dir = Number(btn.dataset.xmWalk);
    btn.addEventListener('pointerdown', (e) => { if (e.button === 0) { held = dir; btn.setPointerCapture?.(e.pointerId); } });
    const stop = () => { if (held === dir) held = 0; };
    btn.addEventListener('pointerup', stop);
    btn.addEventListener('pointercancel', stop);
    btn.addEventListener('lostpointercapture', stop);
    btn.addEventListener('click', (e) => { if (e.detail === 0) step = { dir, left: 0.55 }; });
  });

  const startSpin = () => {
    if (spin) return;
    spin = { from: userYaw, t0: performance.now(), dur: reduce.matches ? 1200 : 4200 };
  };
  spinBtn?.addEventListener('click', startSpin);

  // ------------------------------------------------------------ olhar e sustos
  const look = { x: 0.6, y: 0.2, tx: 0.6, ty: 0.2, next: 0.5, side: -1 }; // -1..1 (eixo da cabeça/olhos)
  const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const wrapPi = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

  const SPEED = 0.42; // m/s: o ciclo "Walk" (1 s) cobre ±0,083 m de pé em meio ciclo → 0,33 m/s a 1×
  const RATE = SPEED / 0.33;
  let prev = performance.now();
  let first = true;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    if (document.hidden) return;
    const t = now / 1000;
    const still = reduce.matches;

    // ---- giro 360°
    if (spin) {
      const p = clamp((now - spin.t0) / spin.dur, 0, 1);
      userYaw = spin.from + Math.PI * 2 * ease(p);
      if (p >= 1) { userYaw = spin.from + Math.PI * 2; spin = null; }
    }
    userYaw = wrapPi(userYaw);

    // ---- vontade de andar: teclado/botão > passo > passeio por conta própria
    const keyDir = held || (keys.size === 1 ? [...keys][0] : 0);
    const [minX, maxX] = xRange();
    let want = 0;
    if (keyDir) { want = keyDir; step = null; idleSince = t; wander.target = pose.x; }
    else if (step) {
      want = step.dir;
      step.left -= SPEED * dt;
      if (step.left <= 0) step = null;
    } else if (!still && !spin && !drag && t - idleSince > 7) {
      wander.wait -= dt;
      if (wander.wait <= 0) {
        wander.target = clamp(rnd(-0.55, 0.55), minX, maxX);
        wander.wait = rnd(9, 15);
      }
      if (Math.abs(wander.target - pose.x) > 0.04) want = Math.sign(wander.target - pose.x);
    }
    if ((want > 0 && pose.x >= maxX) || (want < 0 && pose.x <= minX)) want = 0;
    walkAmt = lerp(walkAmt, want ? 1 : 0, damp(want ? 7 : 9, dt));
    if (want) pose.x = clamp(pose.x + want * SPEED * dt * Math.min(1, walkAmt * 1.3), minX, maxX);
    else if (walkAmt > 0.02) pose.x = clamp(pose.x + (faceYaw > 0 ? 1 : -1) * SPEED * dt * walkAmt * 0.3, minX, maxX);
    if (walkAmt > 0.01) walkPhase += dt * RATE * walkAmt;

    // ---- direção do corpo: de frente para onde anda; parada, de três quartos para o menu
    const targetFace = walkAmt > 0.15 && want ? want * 1.25 : FACE_MENU;
    faceYaw += wrapPi(targetFace - faceYaw) * damp(want ? 9 : 4, dt);
    pose.yaw = faceYaw + userYaw;

    // ---- zoom
    zoomNow = lerp(zoomNow, zoom, damp(6, dt));
    cam.dist = baseDist * zoomNow;
    cam.y = clamp(0.5 + (baseDist - cam.dist) * 0.09, 0.4, 0.78);

    // ---- olhar: com o cursor no menu, segue o cursor; senão dispara de um lado a outro
    if (pointer) {
      const [ex, ey] = project(...toWorld(sk.worldPos('head')));
      look.tx = clamp((pointer.x - ex) / (innerWidth * 0.3), -1, 1);
      look.ty = clamp(-(pointer.y - ey) / (innerHeight * 0.3), -1, 1);
    } else if (!still) {
      look.next -= dt;
      if (look.next <= 0) {
        const r = Math.random();
        if (r < 0.3) { look.tx = 0.85; look.ty = 0.5; look.next = rnd(0.7, 1.2); } // de olho no menu
        else { look.side = -look.side; look.tx = look.side * rnd(0.6, 1); look.ty = rnd(-0.25, 0.45); look.next = rnd(0.3, 0.75); }
      }
    } else {
      look.tx = 0.85;
      look.ty = 0.4;
    }
    const lk = damp(still ? 6 : 26, dt);
    look.x = lerp(look.x, look.tx, lk);
    look.y = lerp(look.y, look.ty, lk);

    // ---- animação base: "Point" parada, misturada com "Walk" quando anda
    leftWalk = lerp(leftWalk, want < 0 ? 1 : 0, damp(8, dt));
    const aimW = 1 - leftWalk;
    sk.evaluate([{ clip: POINT, time: 0, weight: 1, loop: false }]);
    ARM_R.forEach((n, k) => armSaved[k].set(sk.R.subarray(sk.index[n] * 4, sk.index[n] * 4 + 4)));
    if (walkAmt > 0.01) {
      sk.evaluate([
        { clip: POINT, time: 0, weight: 1 - walkAmt, loop: false },
        { clip: WALK, time: walkPhase, weight: walkAmt, loop: true },
      ]);
      // o braço que aponta continua apontando (a mira é desligada à esquerda, onde ele ficaria atrás do corpo)
      ARM_R.forEach((n, k) => {
        const i = sk.index[n] * 4;
        const cur = [sk.R[i], sk.R[i + 1], sk.R[i + 2], sk.R[i + 3]];
        sk.R.set(quat.slerp(cur, [...armSaved[k]], aimW), i);
      });
    }

    // de perfil para o menu, a cabeça se volta para quem olha; andando, olha para o caminho
    lookBack = lerp(lookBack, walkAmt > 0.3 ? 0 : 1, damp(5, dt));

    // ---- medo: tremor, recuo, orelhas para trás, olhos arregalados que disparam
    const sh1 = still ? 0 : Math.sin(t * 52) * 0.5 + Math.sin(t * 37 + 1) * 0.5;
    const sh2 = still ? 0 : Math.sin(t * 44 + 2) * 0.5 + Math.sin(t * 29) * 0.5;
    const breathe = still ? 0 : Math.sin(t * 5.2) * 0.5 + 0.5;
    const calm = 1 - walkAmt * 0.6;
    sk.rotateLocal('spine', quat.euler(-0.07 * calm + breathe * 0.012, 0, sh1 * 0.01));
    sk.rotateLocal('chest', quat.euler(breathe * 0.02, 0, sh2 * 0.012));
    sk.rotateLocal('head', quat.euler(-look.y * 0.16 + sh2 * 0.01, look.x * 0.3 - 0.5 * lookBack, sh1 * 0.014));
    ['eye_L', 'eye_R'].forEach((n) => {
      sk.rotateLocal(n, quat.euler(-look.y * 0.3, look.x * 0.42, 0));
      sk.scaleNode(n, 1.16 + (still ? 0 : Math.max(0, Math.sin(t * 1.7)) * 0.04));
    });
    ['lid_L', 'lid_R'].forEach((n) => sk.rotateLocal(n, quat.euler(-0.22, 0, 0)));
    ['ear_L_1', 'ear_R_1'].forEach((n, k) => sk.rotateLocal(n, quat.euler(-0.32 + sh1 * 0.03, 0, (k ? 1 : -1) * (0.14 + sh2 * 0.03))));
    sk.rotateLocal('upper_arm_L', quat.euler(sh1 * 0.05, 0, sh2 * 0.05));
    // a cauda se afasta do corpo, para as estrelas aparecerem ao lado dela
    sk.rotateLocal('tail_1', quat.euler(0, 0.75 * calm + Math.sin(t * 1.6) * (still ? 0 : 0.18), 0));

    // ---- braço direito aponta para o botão do menu (ou para o cursor, se estiver sobre o menu)
    // o cotovelo estica até quase reto quando ela aponta: o braço lê melhor de longe
    if (aimW > 0.01) {
      const fi = sk.index.forearm_R * 4;
      const rest = [sk.restR[fi], sk.restR[fi + 1], sk.restR[fi + 2], sk.restR[fi + 3]];
      sk.R.set(quat.slerp([sk.R[fi], sk.R[fi + 1], sk.R[fi + 2], sk.R[fi + 3]], rest, 0.7 * aimW), fi);
    }
    sk.updateWorld();
    if (aimW > 0.01) {
      const aim = pointer || menuHit;
      const shoulderM = sk.worldPos('upper_arm_R');
      const shoulderW = toWorld(shoulderM);
      const p = unproject(aim.x, aim.y, shoulderW[2]);
      // ângulo na tela, limitado: o braço aponta para a direita e nunca cruza o rosto (menu bem acima, em retrato)
      const ang = clamp(Math.atan2(p[1] - shoulderW[1], Math.max(0.02, p[0] - shoulderW[0])), -0.4, 0.8);
      const d = [Math.cos(ang), Math.sin(ang), 0.3]; // um pouco para a frente
      const dm = dirToModel(d);
      const tgt = [shoulderM[0] + dm[0], shoulderM[1] + dm[1], shoulderM[2] + dm[2]];
      sk.aim('upper_arm_R', 'hand_R', tgt, aimW);
    }
    sk.updateSkin();

    // ---- desenha
    renderer.render(model, pose, cam, env, { rx: 0.26, rz: 0.2, alpha: 0.55 });
    if (first) { first = false; canvas.dataset.ready = 'true'; }
  }
  requestAnimationFrame(frame);
}
