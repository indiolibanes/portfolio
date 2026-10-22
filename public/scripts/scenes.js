// Cenas animadas de fundo — Laboratório, Bastidores e Percurso (2026-10-21).
//
// Cada elemento com data-scene="…" recebe um <canvas aria-hidden> atrás do conteúdo. As cenas só rodam
// enquanto estão na tela e com a aba visível; com prefers-reduced-motion mostram um único quadro estático;
// nos modos Editorial e Legacy ficam desligadas (o CSS também as esconde).
//
//   supernova  Tradução      estrela que colapsa, explode e deixa um remanescente
//   spacetime  Reflexão      grade do espaço-tempo curvada por duas massas + relógio que anda para trás
//                            + paradoxo de Andrômeda (dois pedestres, dois “agoras”)
//   network    Arquitetura   “segundo cérebro”: rede de notas ligadas, com ondas de ativação
//   matrix     Documentação  chuva de glifos, com o fluxo de publicação caindo de vez em quando
//   synapses   Bastidores    neurônios, sinapses e espelhamento entre duas mentes (teoria da mente)
//   zoom       Percurso      uma carta, a fibra do papel, a celulose, o átomo, o núcleo e os quarks
//
// data-scene-live="shannon" (no palco do quadro-negro) anima o retrato de Shannon: respiração, cabeça que
// acompanha o cursor, mão que bate no quadro e um ponteiro de giz que percorre a fórmula.
(() => {
  'use strict';

  const root = document.documentElement;
  const TAU = Math.PI * 2;
  let reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch {}

  if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
  }

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const rngFrom = (seed) => {
    let s = seed >>> 0;
    return () => {
      s += 0x6d2b79f5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const glow = (ctx, x, y, r, col, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `${col}${a})`);
    g.addColorStop(1, `${col}0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  };
  // Esmaece o lado do texto (as cenas ficam atrás de colunas de leitura).
  const veil = (c, until, a) => {
    const { ctx, w, h } = c;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    if (w < 720) ctx.fillStyle = `rgba(0,0,0,${a * 0.8})`;
    else {
      const g = ctx.createLinearGradient(0, 0, w * until, 0);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
    }
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  // ======================================================================================================
  // Tradução — supernova
  // ======================================================================================================
  const supernova = {
    init(c) {
      const r = rngFrom(11);
      const { w, h, st } = c;
      st.stars = Array.from({ length: Math.round((w * h) / 5200) }, () => ({ x: r() * w, y: r() * h, s: r() * 1.3 + 0.3, p: r() * TAU, f: r() * 1.6 + 0.4 }));
      st.ej = Array.from({ length: 240 }, () => ({ a: r() * TAU, k: 0.35 + r() * 0.65, s: r() * 1.8 + 0.6, hue: [22, 32, 190, 320, 48][(r() * 5) | 0], j: r() }));
      st.fil = Array.from({ length: 10 }, () => ({ a: r() * TAU, span: 0.25 + r() * 0.5, k: 0.6 + r() * 0.4, hue: [18, 200, 330][(r() * 3) | 0] }));
    },
    still: 9.5,
    draw(c, t) {
      const { ctx, w, h, st } = c;
      const narrow = w < 720;
      const cx = narrow ? w * 0.5 : w * 0.6;
      const cy = narrow ? h * 0.76 : h * 0.46;
      const tt = t % 20;
      const maxR = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));
      const s = tt - 6.3; // segundos desde a explosão
      const dim = s > 0 ? 1 - 0.45 * Math.exp(-s / 3) : 1;
      for (const star of st.stars) {
        const a = (0.25 + 0.35 * Math.sin(t * star.f + star.p)) * dim;
        ctx.fillStyle = `rgba(255,244,226,${a})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.s, 0, TAU);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'lighter';

      if (tt < 6.3) {
        // progenitora: incha, esquenta (laranja → branco-azulado) e colapsa
        const p = tt / 6;
        const collapse = tt > 5.6 ? clamp((tt - 5.6) / 0.7, 0, 1) : 0;
        const pulse = 1 + 0.08 * Math.sin(t * (2 + p * 6));
        const rr = (4 + p * 9) * (1 - collapse) * pulse;
        const hue = lerp(24, 205, p);
        glow(ctx, cx, cy, rr * (7 + p * 8) + 6, `hsla(${hue},100%,${60 + p * 25}%,`, 0.5 + 0.4 * p);
        ctx.fillStyle = `rgba(255,255,255,${0.7 + 0.3 * p})`;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(rr * 0.5, 0.6), 0, TAU);
        ctx.fill();
      } else {
        const e = s / 1.7;
        if (e < 1) glow(ctx, cx, cy, maxR * (0.25 + 0.75 * e), 'rgba(255,238,214,', 0.34 * smooth(0, 0.12, e) * (1 - e) * (1 - e));
        const fade = clamp(1 - s / 12.5, 0, 1);
        const R1 = maxR * 0.66 * (1 - Math.exp(-s / 3.4));
        if (fade > 0) {
          const lobes = [[0.4, 24], [1.9, 190], [3.3, 320], [4.7, 40]];
          for (const [a, hue] of lobes) {
            glow(ctx, cx + Math.cos(a) * R1 * 0.35, cy + Math.sin(a) * R1 * 0.35, R1 * 0.75 + 4, `hsla(${hue},95%,58%,`, 0.26 * fade * smooth(0, 1.5, s));
          }
          ctx.lineWidth = 1.5 + (1 - fade) * 5;
          ctx.strokeStyle = `rgba(255,225,190,${0.55 * fade})`;
          ctx.beginPath(); ctx.arc(cx, cy, Math.max(R1, 0.1), 0, TAU); ctx.stroke();
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(130,220,255,${0.3 * fade})`;
          ctx.beginPath(); ctx.arc(cx, cy, Math.max(R1 * 0.78, 0.1), 0, TAU); ctx.stroke();
          for (const f of st.fil) {
            ctx.strokeStyle = `hsla(${f.hue},100%,70%,${0.35 * fade})`;
            ctx.beginPath(); ctx.arc(cx, cy, Math.max(R1 * f.k, 0.1), f.a, f.a + f.span); ctx.stroke();
          }
          for (const q of st.ej) {
            const d = R1 * (0.15 + 0.85 * q.k) * (1 + 0.1 * q.j);
            ctx.fillStyle = `hsla(${q.hue},100%,70%,${0.8 * fade * (0.4 + 0.6 * q.j)})`;
            ctx.beginPath(); ctx.arc(cx + Math.cos(q.a) * d, cy + Math.sin(q.a) * d, q.s * (1 + 0.6 * fade), 0, TAU); ctx.fill();
          }
        }
        // remanescente: um pulsar discreto
        if (s > 2 && s < 13.7) {
          const k = smooth(2, 4, s) * (1 - smooth(11.5, 13.7, s));
          glow(ctx, cx, cy, 16, 'rgba(160,220,255,', (0.35 + 0.3 * Math.sin(t * 9)) * k);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      veil(c, 0.55, 0.55);
    },
  };

  // ======================================================================================================
  // Reflexão — espaço-tempo, relógio ao contrário e paradoxo de Andrômeda
  // ======================================================================================================
  const spacetime = {
    still: 4,
    init() {},
    draw(c, t) {
      const { ctx, w, h } = c;
      const narrow = w < 720;
      const cx = narrow ? w * 0.5 : w * 0.55;
      const cy = h * 0.5;
      const m = Math.min(w, h);
      const sig = m * 0.19;
      const orb = m * 0.11;
      const ang = t * 0.42;
      const masses = [
        { x: cx + Math.cos(ang) * orb, y: cy + Math.sin(ang) * orb * 0.8, k: 0.5 },
        { x: cx - Math.cos(ang) * orb * 0.9, y: cy - Math.sin(ang) * orb * 0.72, k: 0.38 },
      ];
      const warp = (x, y) => {
        let dx = 0;
        let dy = 0;
        for (const q of masses) {
          const ux = q.x - x;
          const uy = q.y - y;
          const e = Math.exp(-(ux * ux + uy * uy) / (2 * sig * sig));
          dx += ux * e * q.k;
          dy += uy * e * q.k;
        }
        return [x + dx, y + dy];
      };
      const step = Math.max(34, Math.round(w / 32));
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(176,168,255,0.26)';
      ctx.beginPath();
      for (let gy = -step; gy <= h + step; gy += step) {
        for (let x = -step; x <= w + step; x += 10) {
          const [px, py] = warp(x, gy);
          if (x === -step) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
      }
      for (let gx = -step; gx <= w + step; gx += step) {
        for (let y = -step; y <= h + step; y += 10) {
          const [px, py] = warp(gx, y);
          if (y === -step) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      // anéis que encolhem: o tempo andando para trás
      for (let k = 0; k < 5; k += 1) {
        const ph = (t * 0.16 + k / 5) % 1;
        const r = orb * 0.8 + (1 - ph) * m * 0.42;
        ctx.strokeStyle = `rgba(243,216,255,${0.3 * Math.sin(ph * Math.PI)})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      }
      // relógio
      const R = m * 0.2;
      ctx.strokeStyle = 'rgba(250,232,255,0.22)';
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      for (let i = 0; i < 60; i += 1) {
        const a = (i / 60) * TAU;
        const l = i % 5 === 0 ? 0.1 : 0.04;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * R * (1 - l), cy + Math.sin(a) * R * (1 - l));
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.stroke();
      }
      const hand = (a, len, wd, al) => {
        ctx.strokeStyle = `rgba(250,232,255,${al})`;
        ctx.lineWidth = wd;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R * len, cy + Math.sin(a) * R * len); ctx.stroke();
      };
      hand(-t * 0.5 - Math.PI / 2, 0.85, 1.6, 0.4);
      hand(-t * 0.04 - Math.PI / 2, 0.55, 2.2, 0.4);
      hand(-t * 3 - Math.PI / 2, 0.92, 0.9, 0.3);
      // massas
      glow(ctx, masses[0].x, masses[0].y, 30, 'rgba(255,154,213,', 0.55);
      glow(ctx, masses[1].x, masses[1].y, 26, 'rgba(154,215,255,', 0.5);

      // paradoxo de Andrômeda: dois pedestres, dois “agoras” sobre a mesma galáxia
      const gx = narrow ? w * 0.82 : w * 0.9;
      const gy = h * 0.16;
      for (let i = 0; i < 5; i += 1) {
        ctx.fillStyle = `hsla(280,80%,82%,${0.05 + 0.03 * i})`;
        ctx.beginPath(); ctx.ellipse(gx, gy, 46 - i * 7, 14 - i * 2, 0.5, 0, TAU); ctx.fill();
      }
      glow(ctx, gx, gy, 18, 'rgba(255,240,255,', 0.5);
      ctx.strokeStyle = 'rgba(200,190,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(gx, h * 0.04); ctx.lineTo(gx, h * 0.96); ctx.stroke();
      const wy = h * 0.88;
      const sx = Math.sin(t * 0.5);
      const vx = Math.cos(t * 0.5);
      const walkers = [
        { x: w * 0.3 + sx * w * 0.07, y: wy, v: vx, col: '255,217,160' },
        { x: w * 0.3 - sx * w * 0.07, y: wy - 16, v: -vx, col: '160,217,255' },
      ];
      ctx.setLineDash([3, 6]);
      for (const p of walkers) {
        const a = -0.62 + p.v * 0.25;
        const yHit = clamp(p.y + (gx - p.x) * Math.tan(a), h * 0.04, h * 0.96);
        ctx.strokeStyle = `rgba(${p.col},0.3)`;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(gx, yHit); ctx.stroke();
        glow(ctx, gx, yHit, 9, `rgba(${p.col},`, 0.6);
      }
      ctx.setLineDash([]);
      for (const p of walkers) {
        ctx.fillStyle = `rgba(${p.col},0.85)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      veil(c, 0.55, 0.5);
    },
  };

  // ======================================================================================================
  // Arquitetura — segundo cérebro: rede de notas ligadas
  // ======================================================================================================
  const NODE_LABELS = ['Ensaios', 'Notas', 'Leituras', 'Assunto', 'Série', 'Idioma', 'Citação', 'Obra', 'Tese', 'Fonte', 'Metadados', 'Slug'];
  const NODE_COLORS = ['184,216,232', '232,210,154', '205,191,240', '191,224,184', '242,179,179'];
  const network = {
    still: 6,
    init(c) {
      const r = rngFrom(23);
      const { w, h, st } = c;
      const n = clamp(Math.round((w * h) / 14000), 24, 52);
      st.nodes = Array.from({ length: n }, (_, i) => ({
        x: w * (0.15 + 0.82 * Math.pow(r(), 0.8)), y: h * (0.08 + 0.84 * r()), vx: 0, vy: 0, deg: 0, id: i,
        col: NODE_COLORS[(r() * NODE_COLORS.length) | 0], ph: r() * TAU, flash: -9,
      }));
      const edges = new Set();
      const add = (a, b) => { if (a !== b) edges.add(a < b ? `${a}-${b}` : `${b}-${a}`); };
      st.nodes.forEach((a, i) => {
        const near = st.nodes.map((b, j) => [j, Math.hypot(a.x - b.x, a.y - b.y)]).filter(([j]) => j !== i).sort((p, q) => p[1] - q[1]);
        add(i, near[0][0]);
        add(i, near[1][0]);
      });
      for (let k = 0; k < n / 4; k += 1) add((r() * n) | 0, (r() * n) | 0);
      st.edges = [...edges].map((e) => e.split('-').map(Number));
      st.adj = st.nodes.map(() => []);
      st.edges.forEach(([a, b]) => { st.adj[a].push(b); st.adj[b].push(a); st.nodes[a].deg += 1; st.nodes[b].deg += 1; });
      st.nodes.forEach((nd) => { nd.r = 2 + nd.deg * 0.7; });
      st.hubs = [...st.nodes].sort((a, b) => b.deg - a.deg).slice(0, NODE_LABELS.length);
      st.hubs.forEach((nd, i) => { nd.label = NODE_LABELS[i]; });
      st.fires = [];
      st.nextFire = 0.4;
      st.rest = Math.min(w, h) * 0.2;
    },
    draw(c, t, dt) {
      const { ctx, w, h, st } = c;
      const nodes = st.nodes;
      const d = Math.min(dt || 0.016, 0.04);
      const px = c.pointer.on ? c.pointer.x : null;
      const py = c.pointer.y;
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        let fx = (w * 0.5 - a.x) * 0.0006 + Math.sin(t * 0.3 + a.ph) * 0.02;
        let fy = (h * 0.5 - a.y) * 0.0006 + Math.cos(t * 0.27 + a.ph) * 0.02;
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy + 40;
          if (d2 < 16900) {
            const f = 90 / d2;
            fx += dx * f * 0.02; fy += dy * f * 0.02; b.vx -= dx * f * 0.02; b.vy -= dy * f * 0.02;
          }
        }
        a.vx += fx; a.vy += fy;
        if (px !== null) {
          const dx = px - a.x;
          const dy = py - a.y;
          const dd = Math.hypot(dx, dy);
          if (dd < 150 && dd > 1) { a.vx += (dx / dd) * 0.03; a.vy += (dy / dd) * 0.03; }
        }
      }
      for (const [ia, ib] of st.edges) {
        const a = nodes[ia];
        const b = nodes[ib];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dd = Math.hypot(dx, dy) || 1;
        const f = (dd - st.rest) * 0.0009;
        a.vx += (dx / dd) * f * dd * 0.02; a.vy += (dy / dd) * f * dd * 0.02;
        b.vx -= (dx / dd) * f * dd * 0.02; b.vy -= (dy / dd) * f * dd * 0.02;
      }
      for (const a of nodes) {
        a.vx *= 0.9; a.vy *= 0.9;
        a.x = clamp(a.x + a.vx * d * 60, 12, w - 12);
        a.y = clamp(a.y + a.vy * d * 60, 12, h - 12);
      }
      // ondas de ativação
      st.nextFire -= d;
      if (st.nextFire <= 0) {
        const src = (Math.random() * nodes.length) | 0;
        const hop = new Map([[src, 0]]);
        const q = [src];
        while (q.length) {
          const u = q.shift();
          if (hop.get(u) >= 4) continue;
          for (const v of st.adj[u]) if (!hop.has(v)) { hop.set(v, hop.get(u) + 1); q.push(v); }
        }
        st.fires.push({ t0: t, hop });
        st.nextFire = 1.2 + Math.random() * 0.8;
      }
      st.fires = st.fires.filter((f) => t - f.t0 < 3.6);
      const HOP = 0.3;

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(236,200,214,0.2)';
      ctx.beginPath();
      for (const [ia, ib] of st.edges) { ctx.moveTo(nodes[ia].x, nodes[ia].y); ctx.lineTo(nodes[ib].x, nodes[ib].y); }
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      for (const f of st.fires) {
        for (const [ia, ib] of st.edges) {
          for (const [from, to] of [[ia, ib], [ib, ia]]) {
            if (!f.hop.has(from) || f.hop.get(from) >= 4) continue;
            const dep = f.t0 + f.hop.get(from) * HOP;
            const u = (t - dep) / HOP;
            if (u < 0 || u > 1) continue;
            const a = nodes[from];
            const b = nodes[to];
            glow(ctx, lerp(a.x, b.x, u), lerp(a.y, b.y, u), 9, 'rgba(255,230,160,', 0.7);
            nodes[to].flash = Math.max(nodes[to].flash, dep + HOP);
          }
        }
        const s0 = nodes[[...f.hop.keys()][0]];
        s0.flash = Math.max(s0.flash, f.t0);
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const a of nodes) {
        const fl = clamp(1 - (t - a.flash) / 0.9, 0, 1);
        if (fl > 0) glow(ctx, a.x, a.y, a.r * 5 + 6, 'rgba(255,236,180,', 0.55 * fl);
        ctx.fillStyle = `rgba(${a.col},${0.78 + 0.2 * fl})`;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r + fl * 1.5, 0, TAU); ctx.fill();
      }
      ctx.font = '10.5px "Portfolio Typewriter", ui-monospace, monospace';
      ctx.fillStyle = 'rgba(244,226,232,0.5)';
      for (const a of st.hubs) ctx.fillText(a.label, a.x + a.r + 4, a.y + 3);
      if (px !== null) {
        const near = nodes.map((a) => [a, Math.hypot(a.x - px, a.y - py)]).filter(([, dd]) => dd < 170).sort((p, q) => p[1] - q[1]).slice(0, 3);
        ctx.strokeStyle = 'rgba(255,236,180,0.35)';
        for (const [a] of near) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(a.x, a.y); ctx.stroke(); }
      }
      veil(c, 0.55, 0.5);
    },
  };

  // ======================================================================================================
  // Documentação — chuva de glifos
  // ======================================================================================================
  const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎ0123456789ABCDEF<>/{}=';
  const WORDS = ['OBSIDIAN', 'GIT', 'ASTRO', 'PAGES', 'DEPLOY', 'RUNBOOK', 'BUILD', 'DOCS', 'COMMIT'];
  const matrix = {
    persistent: true,
    still: 0,
    init(c) {
      const { w, h, st } = c;
      st.cs = 16;
      st.cols = Array.from({ length: Math.ceil(w / st.cs) }, () => ({ y: -Math.random() * (h / st.cs), sp: 0.5 + Math.random() * 0.9, word: null, start: 0 }));
      st.acc = 0;
      c.ctx.font = `${st.cs - 2}px "Portfolio Typewriter", ui-monospace, monospace`;
    },
    draw(c, t, dt) {
      const { ctx, w, h, st } = c;
      st.acc += c.reduced ? 220 / 22 : Math.min(dt || 0.016, 0.1);
      const rows = h / st.cs;
      let guard = 0;
      while (st.acc >= 1 / 22 && guard < 260) {
        st.acc -= 1 / 22;
        guard += 1;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.085)';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
        ctx.font = `${st.cs - 2}px "Portfolio Typewriter", ui-monospace, monospace`;
        ctx.textBaseline = 'top';
        st.cols.forEach((col, i) => {
          const x = i * st.cs;
          const mul = w < 720 ? 0.32 : 0.22 + 0.78 * smooth(w * 0.18, w * 0.6, x);
          const prev = Math.floor(col.y);
          col.y += col.sp * 0.55;
          const row = Math.floor(col.y);
          if (row === prev) return;
          if (row > rows + 6 + Math.random() * 8) {
            col.y = -Math.random() * 14;
            col.word = Math.random() < 0.16 ? WORDS[(Math.random() * WORDS.length) | 0] : null;
            col.start = Math.floor(col.y);
            return;
          }
          const glyphAt = (r) => (col.word && r - col.start >= 0 && r - col.start < col.word.length ? col.word[r - col.start] : GLYPHS[(Math.random() * GLYPHS.length) | 0]);
          ctx.globalAlpha = mul;
          if (prev >= 0) {
            ctx.clearRect(x, prev * st.cs, st.cs, st.cs);
            ctx.fillStyle = col.word ? '#7dffb0' : '#19d36f';
            ctx.fillText(glyphAt(prev), x, prev * st.cs);
          }
          if (row >= 0) {
            ctx.fillStyle = '#e8fff0';
            ctx.fillText(glyphAt(row), x, row * st.cs);
          }
          ctx.globalAlpha = 1;
        });
      }
    },
  };

  // ======================================================================================================
  // Bastidores — sinapses e teoria da mente
  // ======================================================================================================
  const synapses = {
    still: 6,
    init(c) {
      const r = rngFrom(37);
      const { w, h, st } = c;
      const layer = document.createElement('canvas');
      layer.width = Math.max(1, Math.round(w * c.dpr));
      layer.height = Math.max(1, Math.round(h * c.dpr));
      const lc = layer.getContext('2d');
      lc.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
      const cols = clamp(Math.round(w / 190), 3, 7);
      const rowsN = clamp(Math.round(h / 190), 2, 7);
      const neurons = [];
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rowsN; j += 1) {
          neurons.push({ x: ((i + 0.5 + (r() - 0.5) * 0.6) / cols) * w, y: ((j + 0.5 + (r() - 0.5) * 0.6) / rowsN) * h, self: i < cols / 2, flash: -9, i: neurons.length });
        }
      }
      const SELF = '131,56,70';
      const OTHER = '61,127,138';
      const branch = (x, y, a, len, depth, col) => {
        if (depth === 0) return;
        const a2 = a + (r() - 0.5) * 1.1;
        const x2 = x + Math.cos(a2) * len;
        const y2 = y + Math.sin(a2) * len;
        const cx = x + Math.cos(a + (r() - 0.5)) * len * 0.6;
        const cy = y + Math.sin(a + (r() - 0.5)) * len * 0.6;
        lc.strokeStyle = `rgba(${col},${0.08 + depth * 0.05})`;
        lc.lineWidth = 0.6 + depth * 0.4;
        lc.beginPath(); lc.moveTo(x, y); lc.quadraticCurveTo(cx, cy, x2, y2); lc.stroke();
        branch(x2, y2, a2 - 0.4 - r() * 0.4, len * 0.74, depth - 1, col);
        branch(x2, y2, a2 + 0.4 + r() * 0.4, len * 0.74, depth - 1, col);
      };
      for (const nr of neurons) {
        const col = nr.self ? SELF : OTHER;
        const n = 4 + ((r() * 3) | 0);
        for (let k = 0; k < n; k += 1) branch(nr.x, nr.y, (k / n) * TAU + r(), 34 + r() * 22, 4, col);
        lc.fillStyle = `rgba(${col},0.34)`;
        lc.beginPath(); lc.arc(nr.x, nr.y, 6, 0, TAU); lc.fill();
        lc.strokeStyle = `rgba(${col},0.5)`;
        lc.lineWidth = 1;
        lc.beginPath(); lc.arc(nr.x, nr.y, 9, 0, TAU); lc.stroke();
      }
      // axônios
      st.edges = [];
      neurons.forEach((a) => {
        const near = neurons.filter((b) => b !== a).map((b) => [b, Math.hypot(a.x - b.x, a.y - b.y)]).sort((p, q) => p[1] - q[1]).slice(0, 2);
        near.forEach(([b]) => {
          const mx = (a.x + b.x) / 2 + (r() - 0.5) * 70;
          const my = (a.y + b.y) / 2 + (r() - 0.5) * 70;
          st.edges.push({ a, b, mx, my });
          lc.strokeStyle = `rgba(${a.self ? SELF : OTHER},0.2)`;
          lc.lineWidth = 1;
          lc.beginPath(); lc.moveTo(a.x, a.y); lc.quadraticCurveTo(mx, my, b.x, b.y); lc.stroke();
        });
      });
      // espelhamento entre as duas “mentes”: arcos tracejados entre pares
      const left = neurons.filter((n) => n.self).sort((p, q) => p.y - q.y);
      const right = neurons.filter((n) => !n.self).sort((p, q) => p.y - q.y);
      st.mirrors = [];
      left.forEach((a, i) => {
        const b = right[i % right.length];
        st.mirrors.push({ a, b });
        lc.setLineDash([2, 7]);
        lc.strokeStyle = 'rgba(170,120,60,0.2)';
        lc.beginPath(); lc.moveTo(a.x, a.y); lc.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - 40, b.x, b.y); lc.stroke();
        lc.setLineDash([]);
      });
      st.layer = layer;
      st.neurons = neurons;
      st.pulses = [];
      st.rings = [];
      st.next = 0.3;
    },
    draw(c, t, dt) {
      const { ctx, w, h, st } = c;
      const d = Math.min(dt || 0.016, 0.05);
      ctx.drawImage(st.layer, 0, 0, w, h);
      st.next -= d;
      if (st.next <= 0) {
        const e = st.edges[(Math.random() * st.edges.length) | 0];
        if (e) st.pulses.push({ e, u: 0, sp: 0.55 + Math.random() * 0.4 });
        st.next = 0.5 + Math.random() * 0.9;
      }
      ctx.globalCompositeOperation = 'lighter';
      const alive = [];
      for (const p of st.pulses) {
        p.u += d * p.sp;
        const { a, b, mx, my } = p.e;
        const u = Math.min(p.u, 1);
        const x = (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * mx + u * u * b.x;
        const y = (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * my + u * u * b.y;
        glow(ctx, x, y, 11, a.self ? 'rgba(217,160,58,' : 'rgba(61,170,185,', 0.8);
        if (p.u >= 1) {
          b.flash = t;
          if (Math.random() < 0.5) {
            const out = st.edges.filter((e) => e.a === b);
            if (out.length) alive.push({ e: out[(Math.random() * out.length) | 0], u: 0, sp: p.sp });
          }
          const m = st.mirrors.find((q) => q.a === b || q.b === b);
          if (m && Math.random() < 0.55) {
            const twin = m.a === b ? m.b : m.a;
            st.rings.push({ n: twin, t0: t + 0.6 });
          }
        } else alive.push(p);
      }
      st.pulses = alive;
      st.rings = st.rings.filter((q) => t - q.t0 < 1.6);
      for (const q of st.rings) {
        const u = (t - q.t0) / 1.6;
        if (u < 0) continue;
        ctx.strokeStyle = `rgba(217,160,58,${0.5 * (1 - u)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(q.n.x, q.n.y, 8 + u * 36, 0, TAU); ctx.stroke();
        q.n.flash = Math.max(q.n.flash, q.t0);
      }
      for (const n of st.neurons) {
        const fl = clamp(1 - (t - n.flash) / 0.9, 0, 1);
        if (fl > 0) glow(ctx, n.x, n.y, 22, n.self ? 'rgba(217,160,58,' : 'rgba(61,170,185,', 0.6 * fl);
      }
      ctx.globalCompositeOperation = 'source-over';
      veil(c, 0.45, 0.5);
    },
  };

  // ======================================================================================================
  // Percurso — uma carta e o zoom até as partículas
  // ======================================================================================================
  const ZSTAGES = [
    { a: 0, b: 8, name: 'carta · ≈ 10⁻¹ m' },
    { a: 6.5, b: 16, name: 'fibra de papel · ≈ 10⁻⁵ m' },
    { a: 14.5, b: 24, name: 'celulose · ≈ 10⁻⁹ m' },
    { a: 22.5, b: 32, name: 'átomo de carbono · ≈ 10⁻¹⁰ m' },
    { a: 30.5, b: 40, name: 'prótons e quarks · ≈ 10⁻¹⁸ m' },
  ];
  const zoom = {
    still: 12,
    init(c) {
      const r = rngFrom(53);
      const st = c.st;
      st.U = c.w < 720 ? Math.min(c.w * 0.4, 170) : 190;
      st.cx = c.w < 720 ? c.w * 0.5 : Math.min(c.w * 0.2, 250);
      st.cy = c.w < 720 ? Math.min(c.h * 0.5, 600) : c.h * 0.5;
      st.fibers = Array.from({ length: 70 }, () => ({ x0: (r() - 0.5) * 2.6, y0: (r() - 0.5) * 2.6, a: r() * TAU, len: 0.9 + r() * 1.3, bend: (r() - 0.5) * 1.2, wd: 0.006 + r() * 0.014 }));
      st.sea = Array.from({ length: 90 }, () => ({ a: r() * TAU, d: 0.15 + r() * 0.7, ph: r() * TAU, f: 1 + r() * 3 }));
    },
    draw(c, t) {
      const { ctx, w, h, st } = c;
      const U = st.U;
      const tt = t % 42;
      const cx = st.cx;
      const cy = st.cy;
      let best = null;
      ZSTAGES.forEach((s, i) => {
        if (tt < s.a || tt > s.b) return;
        const u = (tt - s.a) / (s.b - s.a);
        const sc = Math.exp(lerp(Math.log(i === 0 ? 0.9 : 0.12), Math.log(6), u));
        const al = smooth(0, 0.18, u) * (1 - smooth(0.82, 1, u));
        if (!best || al > best.al) best = { i, al };
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(sc, sc);
        ctx.globalAlpha = al * 0.95;
        layers[i](ctx, U, t, sc, st);
        ctx.restore();
      });
      // retícula e legenda de escala
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, TAU);
      ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 8, cy); ctx.moveTo(cx + 8, cy); ctx.lineTo(cx + 14, cy);
      ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy - 8); ctx.moveTo(cx, cy + 8); ctx.lineTo(cx, cy + 14);
      ctx.stroke();
      if (best) {
        ctx.font = '11px "Portfolio Typewriter", ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(255,255,255,${0.7 * Math.min(1, best.al * 1.4)})`;
        ctx.fillText(ZSTAGES[best.i].name, cx + 4 + 0, Math.min(h - 20, cy + U * 1.1));
        ctx.textAlign = 'left';
      }
    },
  };
  const layers = [
    // 0 · carta
    (ctx, U) => {
      ctx.rotate(-0.14);
      const cw = U * 0.62;
      const ch = U * 0.88;
      const rr = U * 0.05;
      ctx.beginPath();
      ctx.roundRect(-cw / 2, -ch / 2, cw, ch, rr);
      ctx.fillStyle = 'rgba(255,252,240,0.16)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,250,235,0.8)';
      ctx.lineWidth = U * 0.008;
      ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(-cw / 2 + U * 0.04, -ch / 2 + U * 0.04, cw - U * 0.08, ch - U * 0.08, rr * 0.6);
      ctx.strokeStyle = 'rgba(255,250,235,0.3)';
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,250,235,0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${U * 0.34}px Georgia, serif`;
      ctx.fillText('♠', 0, 0);
      ctx.font = `bold ${U * 0.12}px Georgia, serif`;
      ctx.fillText('A', -cw / 2 + U * 0.1, -ch / 2 + U * 0.12);
      ctx.save(); ctx.rotate(Math.PI); ctx.fillText('A', -cw / 2 + U * 0.1, -ch / 2 + U * 0.12); ctx.restore();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    },
    // 1 · fibras do papel
    (ctx, U, t, sc, st) => {
      ctx.lineCap = 'round';
      for (const f of st.fibers) {
        const x0 = f.x0 * U;
        const y0 = f.y0 * U;
        const dx = Math.cos(f.a) * f.len * U * 0.5;
        const dy = Math.sin(f.a) * f.len * U * 0.5;
        const nx = -Math.sin(f.a) * f.bend * U * 0.4;
        const ny = Math.cos(f.a) * f.bend * U * 0.4;
        ctx.strokeStyle = 'rgba(255,240,215,0.42)';
        ctx.lineWidth = f.wd * U;
        ctx.beginPath(); ctx.moveTo(x0 - dx, y0 - dy); ctx.quadraticCurveTo(x0 + nx, y0 + ny, x0 + dx, y0 + dy); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,240,215,0.22)';
        ctx.lineWidth = Math.max(f.wd * U * 0.18, 0.4 / sc);
        for (const o of [-0.8, 0.8]) {
          ctx.beginPath(); ctx.moveTo(x0 - dx - Math.sin(f.a) * o * f.wd * U, y0 - dy + Math.cos(f.a) * o * f.wd * U);
          ctx.quadraticCurveTo(x0 + nx - Math.sin(f.a) * o * f.wd * U, y0 + ny + Math.cos(f.a) * o * f.wd * U, x0 + dx - Math.sin(f.a) * o * f.wd * U, y0 + dy + Math.cos(f.a) * o * f.wd * U); ctx.stroke();
        }
      }
    },
    // 2 · cadeias de celulose (anéis de glicose)
    (ctx, U, t, sc) => {
      const R = U * 0.09;
      const lw = Math.max(U * 0.006, 0.8 / sc);
      for (let row = -1; row <= 1; row += 1) {
        for (let k = -4; k <= 4; k += 1) {
          const x = k * R * 1.75 + (row % 2 ? R * 0.87 : 0);
          const y = row * R * 2.6;
          ctx.beginPath();
          for (let i = 0; i < 6; i += 1) {
            const a = (i / 6) * TAU + Math.PI / 6;
            const px = x + Math.cos(a) * R;
            const py = y + Math.sin(a) * R;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = 'rgba(190,255,225,0.7)';
          ctx.lineWidth = lw;
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,130,130,0.8)';
          ctx.beginPath(); ctx.arc(x + R * 0.87, y + R * 0.5, R * 0.14, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.beginPath(); ctx.arc(x, y - R * 1.35, R * 0.1, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x, y - R); ctx.lineTo(x, y - R * 1.35); ctx.stroke();
        }
        if (row < 1) {
          ctx.setLineDash([R * 0.15, R * 0.3]);
          ctx.strokeStyle = 'rgba(190,255,225,0.3)';
          ctx.beginPath(); ctx.moveTo(-R * 7, row * R * 2.6 + R * 1.3); ctx.lineTo(R * 7, row * R * 2.6 + R * 1.3); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    },
    // 3 · átomo
    (ctx, U, t, sc) => {
      const lw = Math.max(U * 0.005, 0.8 / sc);
      for (let k = 0; k < 3; k += 1) {
        ctx.save();
        ctx.rotate((k * Math.PI) / 3 + t * 0.05);
        ctx.strokeStyle = 'rgba(190,210,255,0.4)';
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.ellipse(0, 0, U * 0.9, U * 0.32, 0, 0, TAU); ctx.stroke();
        for (let e = 0; e < 2; e += 1) {
          const a = t * (0.9 + k * 0.25) + e * Math.PI + k;
          glow(ctx, Math.cos(a) * U * 0.9, Math.sin(a) * U * 0.32, U * 0.07, 'rgba(180,215,255,', 0.9);
        }
        ctx.restore();
      }
      for (let i = 0; i < 12; i += 1) {
        const a = i * 2.4;
        const d = U * 0.06 * Math.sqrt(i / 12) * 2;
        ctx.fillStyle = i % 2 ? 'rgba(255,120,120,0.9)' : 'rgba(130,170,255,0.9)';
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, U * 0.034, 0, TAU); ctx.fill();
      }
    },
    // 4 · próton e quarks
    (ctx, U, t, sc, st) => {
      glow(ctx, 0, 0, U * 0.5, 'rgba(255,255,255,', 0.18);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = Math.max(U * 0.005, 0.8 / sc);
      ctx.beginPath(); ctx.arc(0, 0, U * 0.42, 0, TAU); ctx.stroke();
      for (const s of st.sea) {
        ctx.fillStyle = `rgba(255,255,255,${0.2 + 0.2 * Math.sin(t * s.f + s.ph)})`;
        ctx.beginPath(); ctx.arc(Math.cos(s.a + t * 0.1) * U * s.d * 0.55, Math.sin(s.a + t * 0.1) * U * s.d * 0.55, U * 0.008, 0, TAU); ctx.fill();
      }
      const cols = ['255,90,90', '90,230,130', '110,150,255'];
      const pts = cols.map((_, i) => {
        const a = t * 0.5 + (i / 3) * TAU;
        return [Math.cos(a) * U * 0.17, Math.sin(a) * U * 0.17];
      });
      for (let i = 0; i < 3; i += 1) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % 3];
        ctx.strokeStyle = 'rgba(255,236,170,0.7)';
        ctx.lineWidth = Math.max(U * 0.006, 0.8 / sc);
        ctx.beginPath();
        for (let k = 0; k <= 24; k += 1) {
          const u = k / 24;
          const nx = -(y1 - y0);
          const ny = x1 - x0;
          const nl = Math.hypot(nx, ny) || 1;
          const off = Math.sin(u * 22 + t * 8) * U * 0.012;
          const x = lerp(x0, x1, u) + (nx / nl) * off;
          const y = lerp(y0, y1, u) + (ny / nl) * off;
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      pts.forEach(([x, y], i) => {
        glow(ctx, x, y, U * 0.11, `rgba(${cols[i]},`, 0.9);
        ctx.fillStyle = `rgba(${cols[i]},0.95)`;
        ctx.beginPath(); ctx.arc(x, y, U * 0.05, 0, TAU); ctx.fill();
      });
    },
  ];

  const SCENES = { supernova, spacetime, network, matrix, synapses, zoom };

  // ======================================================================================================
  // Motor
  // ======================================================================================================
  const items = [];
  let frame = 0;
  let last = 0;
  const modeOn = () => root.dataset.seriousMode !== 'true' && root.dataset.legacyMode !== 'true';

  const resize = (c) => {
    const r = c.host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (w === c.w && h === c.h) return;
    c.w = w; c.h = h;
    c.dpr = Math.min(window.devicePixelRatio || 1, w * h > 700000 ? 1.25 : 1.5);
    c.canvas.width = Math.round(w * c.dpr);
    c.canvas.height = Math.round(h * c.dpr);
    c.st = {};
    c.scene.init(c);
    c.dirty = true;
  };

  const paint = (c, t, dt) => {
    const { ctx } = c;
    ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
    if (!c.scene.persistent) ctx.clearRect(0, 0, c.w, c.h);
    ctx.save();
    c.scene.draw(c, t, dt);
    ctx.restore();
  };

  const tick = (now) => {
    frame = 0;
    const dt = last ? (now - last) / 1000 : 0.016;
    last = now;
    let any = false;
    for (const c of items) {
      if (!c.visible || c.frozen || !modeOn()) continue;
      any = true;
      c.t += dt;
      paint(c, c.t, dt);
    }
    if (any && !document.hidden) frame = requestAnimationFrame(tick);
    else last = 0;
  };
  const wake = () => { if (!frame && !document.hidden && !reduce) { last = 0; frame = requestAnimationFrame(tick); } };

  const mount = (host) => {
    const scene = SCENES[host.dataset.scene];
    if (!scene || host._scene) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'scene-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.insertBefore(canvas, host.firstChild);
    const c = {
      host, canvas, ctx: canvas.getContext('2d'), scene, w: 0, h: 0, dpr: 1, st: {}, t: scene.still ? Math.random() * 3 : 0, visible: false,
      reduced: reduce, pointer: { on: false, x: 0, y: 0 },
    };
    if (!c.ctx) return;
    host._scene = c;
    items.push(c);
    resize(c);
    host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); c.pointer.on = true; c.pointer.x = e.clientX - r.left; c.pointer.y = e.clientY - r.top; }, { passive: true });
    host.addEventListener('pointerleave', () => { c.pointer.on = false; }, { passive: true });
    if (reduce) { if (modeOn()) paint(c, scene.still || 0, 0.016); }
  };

  const init = () => {
    document.querySelectorAll('[data-scene]').forEach(mount);
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver((entries) => {
        for (const e of entries) {
          const c = e.target._scene;
          if (!c) continue;
          resize(c);
          if (reduce && modeOn()) paint(c, c.scene.still || 0, 0.016);
        }
      });
      items.forEach((c) => ro.observe(c.host));
    }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        for (const e of entries) { const c = e.target._scene; if (c) c.visible = e.isIntersecting; }
        wake();
      }, { rootMargin: '80px 0px' });
      items.forEach((c) => io.observe(c.host));
    } else {
      items.forEach((c) => { c.visible = true; });
      wake();
    }
    document.addEventListener('visibilitychange', wake);
    new MutationObserver(wake).observe(root, { attributes: true, attributeFilter: ['data-serious-mode', 'data-legacy-mode'] });
    initShannon();
    window.PortfolioScenes = {
      renderAt(host, t) { const c = host._scene; if (!c) return false; c.frozen = true; resize(c); if (c.scene.persistent) { c.st = {}; c.scene.init(c); } c.reduced = true; paint(c, t, 0.016); c.reduced = reduce; return true; },
    };
  };

  // ======================================================================================================
  // Shannon — o retrato ganha vida
  // ======================================================================================================
  function initShannon() {
    const stage = document.querySelector('.github-board-stage');
    if (!stage || stage._live) return;
    stage._live = true;
    const mk = (cls) => { const d = document.createElement('div'); d.className = `shannon-layer ${cls}`; d.setAttribute('aria-hidden', 'true'); return d; };
    const body = mk('shannon-body');
    const head = mk('shannon-head');
    const hand = mk('shannon-hand');
    const fx = document.createElement('canvas');
    fx.className = 'shannon-fx';
    fx.setAttribute('aria-hidden', 'true');
    stage.append(body, head, hand, fx);
    const ctx = fx.getContext('2d');
    let W = 0;
    let H = 0;
    let dpr = 1;
    const size = () => {
      W = stage.clientWidth; H = stage.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
      fx.width = Math.round(W * dpr); fx.height = Math.round(H * dpr);
    };
    size();
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(stage);

    const look = { x: 0, y: 0, tx: 0, ty: 0, active: false };
    window.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      const cx = r.left + r.width * 0.5;
      const cy = r.top + r.height * 0.45;
      look.tx = clamp((e.clientX - cx) / (window.innerWidth * 0.5), -1, 1);
      look.ty = clamp((e.clientY - cy) / (window.innerHeight * 0.5), -1, 1);
      look.active = true;
    }, { passive: true });

    // alvos do ponteiro de giz, em fração do palco (fórmula, legenda, caixa)
    const targets = [[0.62, 0.34], [0.66, 0.43], [0.63, 0.51]];
    const finger = [0.492, 0.579];
    let visible = false;
    let raf = 0;
    let t0 = performance.now();
    const loop = (now) => {
      raf = 0;
      if (!visible || !modeOn() || document.hidden) return;
      const t = (now - t0) / 1000;
      look.x += (look.tx - look.x) * 0.06;
      look.y += (look.ty - look.y) * 0.06;
      const idle = look.active ? 0 : 1;
      const sway = Math.sin(t * 0.5) * 0.5 * idle;
      const breathe = Math.sin(t * 1.3);
      body.style.transform = `translate(${(look.x * 0.8).toFixed(2)}px, ${(breathe * 0.7).toFixed(2)}px) scale(${(1 + 0.0035 * breathe).toFixed(4)})`;
      head.style.transform = `translate(${((look.x + sway) * 3).toFixed(2)}px, ${(look.y * 2.2 + breathe * 0.7).toFixed(2)}px) rotate(${((look.x + sway) * 3.4).toFixed(2)}deg)`;
      // a mão bate no quadro a cada alvo
      const cyc = (t % 7.8) / 2.6;
      const k = cyc % 1;
      const tap = Math.exp(-Math.pow((k - 0.35) * 8, 2));
      hand.style.transform = `translate(${(tap * 2.4).toFixed(2)}px, ${(-tap * 1.2).toFixed(2)}px) rotate(${(-tap * 1.6).toFixed(2)}deg)`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const idx = Math.floor(cyc) % 3;
      const [tx, ty] = targets[idx];
      const fx0 = finger[0] * W;
      const fy0 = finger[1] * H;
      const x1 = tx * W + Math.sin(t * 2) * 6;
      const y1 = ty * H + Math.cos(t * 1.7) * 3;
      const al = smooth(0.05, 0.25, k) * (1 - smooth(0.85, 1, k));
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.setLineDash([2, 6]);
      ctx.lineDashOffset = -t * 18;
      ctx.strokeStyle = `rgba(247,236,200,${0.55 * al})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(fx0 + 4, fy0 - 2); ctx.quadraticCurveTo((fx0 + x1) / 2, Math.min(fy0, y1) - 14, x1, y1); ctx.stroke();
      ctx.setLineDash([]);
      glow(ctx, x1, y1, 16 + tap * 12, 'rgba(255,236,170,', 0.55 * al + 0.3 * tap);
      const ring = (k * 2) % 1;
      ctx.strokeStyle = `rgba(255,240,200,${0.5 * al * (1 - ring)})`;
      ctx.beginPath(); ctx.arc(x1, y1, 4 + ring * 18, 0, TAU); ctx.stroke();
      ctx.restore();
      raf = requestAnimationFrame(loop);
    };
    const go = () => { if (!raf && visible && !reduce) raf = requestAnimationFrame(loop); };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; go(); }, { rootMargin: '60px' }).observe(stage);
    }
    document.addEventListener('visibilitychange', go);
    new MutationObserver(go).observe(root, { attributes: true, attributeFilter: ['data-serious-mode', 'data-legacy-mode'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
