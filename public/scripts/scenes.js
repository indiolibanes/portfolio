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
//   flipbook   Método        páginas folheadas: sketch → wireframe → app de astrofísica gamificada
//   cosmos     Contato       céu profundo: estrelas, nebulosas, planetas, asteroides, cometas e estrelas cadentes
//   zoom       Percurso      a equação de Dirac: da tinta no papel ao átomo, aos quarks e ao mar de Dirac
//
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
      const cx = w * 0.5;
      const cy = narrow ? h * 0.7 : h * 0.5;
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
      veil(c, 0.4, 0.32);
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
      const cx = narrow ? w * 0.5 : w * 0.56;
      const cy = h * 0.5;
      const m = Math.min(w, h);
      const sig = m * 0.27;
      const orb = m * 0.17;
      const ang = t * 0.5;
      const masses = [
        { x: cx + Math.cos(ang) * orb, y: cy + Math.sin(ang) * orb * 0.8, k: 0.78 },
        { x: cx - Math.cos(ang) * orb * 0.9, y: cy - Math.sin(ang) * orb * 0.72, k: 0.6 },
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
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = 'rgba(196,188,255,0.45)';
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
      // poços de gravidade: a grade brilha onde o espaço se dobra
      for (const q of masses) glow(ctx, q.x, q.y, sig * 1.5, q === masses[0] ? 'rgba(255,120,200,' : 'rgba(120,200,255,', 0.3);
      // anéis que encolhem: o tempo andando para trás
      for (let k = 0; k < 6; k += 1) {
        const ph = (t * 0.2 + k / 6) % 1;
        const r = orb * 0.8 + (1 - ph) * m * 0.5;
        ctx.strokeStyle = `rgba(243,216,255,${0.7 * Math.sin(ph * Math.PI)})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
      }
      // relógio
      const R = m * 0.27;
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgba(250,232,255,0.5)';
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      for (let i = 0; i < 60; i += 1) {
        const a = (i / 60) * TAU;
        const l = i % 5 === 0 ? 0.13 : 0.05;
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
      hand(-t * 0.5 - Math.PI / 2, 0.85, 3, 0.75);
      hand(-t * 0.04 - Math.PI / 2, 0.55, 4, 0.75);
      hand(-t * 3 - Math.PI / 2, 0.92, 1.4, 0.6);
      // massas (com rastro orbital)
      for (let k = 1; k <= 14; k += 1) {
        const a2 = ang - k * 0.09;
        const al = 0.4 * (1 - k / 15);
        glow(ctx, cx + Math.cos(a2) * orb, cy + Math.sin(a2) * orb * 0.8, 14, 'rgba(255,154,213,', al);
        glow(ctx, cx - Math.cos(a2) * orb * 0.9, cy - Math.sin(a2) * orb * 0.72, 12, 'rgba(154,215,255,', al);
      }
      glow(ctx, masses[0].x, masses[0].y, 64, 'rgba(255,154,213,', 0.9);
      glow(ctx, masses[1].x, masses[1].y, 54, 'rgba(154,215,255,', 0.85);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      for (const q of masses) { ctx.beginPath(); ctx.arc(q.x, q.y, 5, 0, TAU); ctx.fill(); }

      // paradoxo de Andrômeda: dois pedestres, dois “agoras” sobre a mesma galáxia
      const gx = narrow ? w * 0.82 : w * 0.9;
      const gy = h * 0.16;
      for (let i = 0; i < 5; i += 1) {
        ctx.fillStyle = `hsla(280,80%,82%,${0.1 + 0.05 * i})`;
        ctx.beginPath(); ctx.ellipse(gx, gy, 62 - i * 9, 19 - i * 2.6, 0.5, 0, TAU); ctx.fill();
      }
      glow(ctx, gx, gy, 28, 'rgba(255,240,255,', 0.8);
      ctx.strokeStyle = 'rgba(200,190,255,0.28)';
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
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = `rgba(${p.col},0.6)`;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(gx, yHit); ctx.stroke();
        glow(ctx, gx, yHit, 14, `rgba(${p.col},`, 0.9);
      }
      ctx.setLineDash([]);
      for (const p of walkers) {
        glow(ctx, p.x, p.y, 16, `rgba(${p.col},`, 0.6);
        ctx.fillStyle = `rgba(${p.col},1)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      veil(c, 0.4, 0.3);
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
      // amostragem estratificada: uma nota por célula, sempre cobrindo o cartão inteiro
      const n0 = clamp(Math.round((w * h) / 9000), 36, 90);
      const cols = Math.max(4, Math.round(Math.sqrt(n0 * (w / h))));
      const rows = Math.max(3, Math.round(n0 / cols));
      const n = cols * rows;
      st.nodes = Array.from({ length: n }, (_, i) => ({
        x: w * (0.03 + 0.94 * (((i % cols) + 0.15 + 0.7 * r()) / cols)),
        y: h * (0.05 + 0.9 * ((((i / cols) | 0) + 0.15 + 0.7 * r()) / rows)),
        vx: 0, vy: 0, deg: 0, id: i,
        col: NODE_COLORS[(r() * NODE_COLORS.length) | 0], ph: r() * TAU, flash: -9,
      }));
      const edges = new Set();
      const add = (a, b) => { if (a !== b) edges.add(a < b ? `${a}-${b}` : `${b}-${a}`); };
      st.nodes.forEach((a, i) => {
        const near = st.nodes.map((b, j) => [j, Math.hypot(a.x - b.x, a.y - b.y)]).filter(([j]) => j !== i).sort((p, q) => p[1] - q[1]);
        add(i, near[0][0]);
        add(i, near[1][0]);
      });
      for (let k = 0; k < n / 5; k += 1) add((r() * n) | 0, (r() * n) | 0);
      st.edges = [...edges].map((e) => e.split('-').map(Number));
      st.adj = st.nodes.map(() => []);
      st.edges.forEach(([a, b]) => { st.adj[a].push(b); st.adj[b].push(a); st.nodes[a].deg += 1; st.nodes[b].deg += 1; });
      st.nodes.forEach((nd) => { nd.r = 3 + nd.deg * 1.05; });
      st.hubs = [...st.nodes].sort((a, b) => b.deg - a.deg).slice(0, NODE_LABELS.length);
      st.hubs.forEach((nd, i) => { nd.label = NODE_LABELS[i]; });
      st.fires = [];
      st.nextFire = 0.4;
      st.rest = Math.sqrt((w * h) / n) * 0.9;
    },
    draw(c, t, dt) {
      const { ctx, w, h, st } = c;
      const nodes = st.nodes;
      const d = Math.min(dt || 0.016, 0.04);
      const px = c.pointer.on ? c.pointer.x : null;
      const py = c.pointer.y;
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        let fx = Math.sin(t * 0.3 + a.ph) * 0.035;
        let fy = Math.cos(t * 0.27 + a.ph) * 0.035;
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy + 40;
          if (d2 < 40000) {
            const f = 160 / d2;
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
        const f = (dd - st.rest) * 0.0005;
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

      ctx.lineWidth = 1.3;
      ctx.strokeStyle = 'rgba(244,208,224,0.42)';
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
            glow(ctx, lerp(a.x, b.x, u), lerp(a.y, b.y, u), 15, 'rgba(255,230,160,', 0.95);
            nodes[to].flash = Math.max(nodes[to].flash, dep + HOP);
          }
        }
        const s0 = nodes[[...f.hop.keys()][0]];
        s0.flash = Math.max(s0.flash, f.t0);
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const a of nodes) {
        const fl = clamp(1 - (t - a.flash) / 0.9, 0, 1);
        if (fl > 0) glow(ctx, a.x, a.y, a.r * 6 + 10, 'rgba(255,236,180,', 0.8 * fl);
        ctx.fillStyle = `rgba(${a.col},${0.9 + 0.1 * fl})`;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r + fl * 2, 0, TAU); ctx.fill();
      }
      ctx.font = '12px "Portfolio Typewriter", ui-monospace, monospace';
      ctx.fillStyle = 'rgba(250,236,240,0.78)';
      for (const a of st.hubs) ctx.fillText(a.label, a.x + a.r + 4, a.y + 3);
      if (px !== null) {
        const near = nodes.map((a) => [a, Math.hypot(a.x - px, a.y - py)]).filter(([, dd]) => dd < 170).sort((p, q) => p[1] - q[1]).slice(0, 3);
        ctx.strokeStyle = 'rgba(255,236,180,0.35)';
        for (const [a] of near) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(a.x, a.y); ctx.stroke(); }
      }
      veil(c, 0.35, 0.28);
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
      const cols = clamp(Math.round(w / 150), 3, 9);
      const rowsN = clamp(Math.round(h / 150), 3, 8);
      const neurons = [];
      for (let i = 0; i < cols; i += 1) {
        for (let j = 0; j < rowsN; j += 1) {
          neurons.push({ x: ((i + 0.5 + (r() - 0.5) * 0.6) / cols) * w, y: ((j + 0.5 + (r() - 0.5) * 0.6) / rowsN) * h, self: i < cols / 2, flash: -9, i: neurons.length });
        }
      }
      const SELF = '244,176,90';
      const OTHER = '110,214,230';
      // duas “mentes”: um halo dourado à esquerda, um turquesa à direita
      const g1 = lc.createRadialGradient(w * 0.25, h * 0.5, 0, w * 0.25, h * 0.5, w * 0.34);
      g1.addColorStop(0, 'rgba(244,176,90,0.16)'); g1.addColorStop(1, 'rgba(244,176,90,0)');
      lc.fillStyle = g1; lc.fillRect(0, 0, w, h);
      const g2 = lc.createRadialGradient(w * 0.75, h * 0.5, 0, w * 0.75, h * 0.5, w * 0.34);
      g2.addColorStop(0, 'rgba(110,214,230,0.16)'); g2.addColorStop(1, 'rgba(110,214,230,0)');
      lc.fillStyle = g2; lc.fillRect(0, 0, w, h);
      const branch = (x, y, a, len, depth, col) => {
        if (depth === 0) return;
        const a2 = a + (r() - 0.5) * 1.1;
        const x2 = x + Math.cos(a2) * len;
        const y2 = y + Math.sin(a2) * len;
        const cx = x + Math.cos(a + (r() - 0.5)) * len * 0.6;
        const cy = y + Math.sin(a + (r() - 0.5)) * len * 0.6;
        lc.strokeStyle = `rgba(${col},${0.2 + depth * 0.1})`;
        lc.lineWidth = 0.8 + depth * 0.45;
        lc.beginPath(); lc.moveTo(x, y); lc.quadraticCurveTo(cx, cy, x2, y2); lc.stroke();
        branch(x2, y2, a2 - 0.4 - r() * 0.4, len * 0.74, depth - 1, col);
        branch(x2, y2, a2 + 0.4 + r() * 0.4, len * 0.74, depth - 1, col);
      };
      for (const nr of neurons) {
        const col = nr.self ? SELF : OTHER;
        const n = 4 + ((r() * 3) | 0);
        for (let k = 0; k < n; k += 1) branch(nr.x, nr.y, (k / n) * TAU + r(), 34 + r() * 22, 4, col);
        glow(lc, nr.x, nr.y, 26, `rgba(${col},`, 0.35);
        lc.fillStyle = `rgba(${col},0.85)`;
        lc.beginPath(); lc.arc(nr.x, nr.y, 7, 0, TAU); lc.fill();
        lc.strokeStyle = `rgba(${col},0.8)`;
        lc.lineWidth = 1.4;
        lc.beginPath(); lc.arc(nr.x, nr.y, 12, 0, TAU); lc.stroke();
      }
      // axônios
      st.edges = [];
      neurons.forEach((a) => {
        const near = neurons.filter((b) => b !== a).map((b) => [b, Math.hypot(a.x - b.x, a.y - b.y)]).sort((p, q) => p[1] - q[1]).slice(0, 2);
        near.forEach(([b]) => {
          const mx = (a.x + b.x) / 2 + (r() - 0.5) * 70;
          const my = (a.y + b.y) / 2 + (r() - 0.5) * 70;
          st.edges.push({ a, b, mx, my });
          lc.strokeStyle = `rgba(${a.self ? SELF : OTHER},0.5)`;
          lc.lineWidth = 1.8;
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
        lc.setLineDash([3, 7]);
        lc.lineWidth = 1.3;
        lc.strokeStyle = 'rgba(255,226,170,0.45)';
        lc.beginPath(); lc.moveTo(a.x, a.y); lc.quadraticCurveTo((a.x + b.x) / 2, Math.min(a.y, b.y) - 40, b.x, b.y); lc.stroke();
        lc.setLineDash([]);
      });
      st.layer = layer;
      st.neurons = neurons;
      st.pulses = st.edges.length ? Array.from({ length: 9 }, () => ({ e: st.edges[(r() * st.edges.length) | 0], u: r(), sp: 0.6 })) : [];
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
        st.next = 0.18 + Math.random() * 0.35;
      }
      ctx.globalCompositeOperation = 'lighter';
      const alive = [];
      for (const p of st.pulses) {
        p.u += d * p.sp;
        const { a, b, mx, my } = p.e;
        const u = Math.min(p.u, 1);
        const x = (1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * mx + u * u * b.x;
        const y = (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * my + u * u * b.y;
        glow(ctx, x, y, 22, a.self ? 'rgba(255,196,96,' : 'rgba(110,226,242,', 1);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.fill();
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
        ctx.strokeStyle = `rgba(255,214,140,${0.85 * (1 - u)})`;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(q.n.x, q.n.y, 10 + u * 58, 0, TAU); ctx.stroke();
        q.n.flash = Math.max(q.n.flash, q.t0);
      }
      for (const n of st.neurons) {
        const fl = clamp(1 - (t - n.flash) / 0.9, 0, 1);
        if (fl > 0) glow(ctx, n.x, n.y, 44, n.self ? 'rgba(255,196,96,' : 'rgba(110,226,242,', 0.95 * fl);
      }
      ctx.globalCompositeOperation = 'source-over';
      veil(c, 0.42, 0.38);
    },
  };

  // ======================================================================================================
  // Método — folheando páginas: do sketch ao wireframe até o aplicativo pronto (astrofísica gamificada)
  // ======================================================================================================
  const FP = 12; // páginas do bloco
  const FSTAGE = ['SKETCH', 'SKETCH', 'SKETCH', 'SKETCH', 'WIREFRAME', 'WIREFRAME', 'WIREFRAME', 'WIREFRAME', 'PROTÓTIPO', 'PROTÓTIPO', 'PROTÓTIPO', 'APP PRONTO'];
  const FCYCLE = 9.4;
  const flipStart = (i) => (i < FP - 1 ? 0.4 + i * 0.32 : 8.5);
  const flipDur = (i) => (i < FP - 1 ? 0.5 : 0.75);

  const wobbleLine = (ctx, r, x1, y1, x2, y2, amp) => {
    ctx.beginPath();
    ctx.moveTo(x1 + (r() - 0.5) * amp, y1 + (r() - 0.5) * amp);
    ctx.lineTo((x1 + x2) / 2 + (r() - 0.5) * amp, (y1 + y2) / 2 + (r() - 0.5) * amp);
    ctx.lineTo(x2 + (r() - 0.5) * amp, y2 + (r() - 0.5) * amp);
    ctx.stroke();
  };
  const wobbleRect = (ctx, r, x, y, w, h, amp) => {
    for (let k = 0; k < 2; k += 1) {
      wobbleLine(ctx, r, x, y, x + w, y, amp);
      wobbleLine(ctx, r, x + w, y, x + w, y + h, amp);
      wobbleLine(ctx, r, x + w, y + h, x, y + h, amp);
      wobbleLine(ctx, r, x, y + h, x, y, amp);
    }
  };
  const wobbleCircle = (ctx, r, x, y, rad, amp, turns = 1.08) => {
    ctx.beginPath();
    const a0 = r() * TAU;
    for (let k = 0; k <= 28; k += 1) {
      const a = a0 + (k / 28) * TAU * turns;
      const rr = rad + (r() - 0.5) * amp;
      if (k === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.stroke();
  };

  // Uma tela do app em três níveis de fidelidade (i = 0…11).
  const drawAppPage = (ctx, W, H, i) => {
    const r = rngFrom(1000 + i * 17);
    const mode = i < 4 ? 0 : i < 8 ? 1 : 2;
    const q = mode === 0 ? i / 3 : mode === 1 ? (i - 4) / 3 : (i - 8) / 3; // refinamento dentro do nível
    const u = W / 100; // 1 unidade = 1% da largura
    const hv = H / 100;
    const E = {
      hero: [8, 14, 84, 30], bar: [8, 48, 84, 3.2],
      c1: [8, 54, 84, 10], c2: [8, 66.5, 84, 10], c3: [8, 79, 84, 10], nav: [0, 93, 100, 7],
    };
    const P = (e) => [e[0] * u, e[1] * hv, e[2] * u, e[3] * hv];
    ctx.save();
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, W * 0.07); ctx.clip();

    if (mode === 0) {
      // ---- sketch: lápis sobre papel
      ctx.fillStyle = 'rgba(255,248,226,0.07)'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(220,235,255,0.07)'; ctx.lineWidth = 1;
      for (let y = hv * 6; y < H; y += hv * 4.2) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      const amp = (1 - q * 0.6) * W * 0.03;
      ctx.strokeStyle = 'rgba(255,246,222,0.8)'; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
      const [hx, hy, hw, hh] = P(E.hero);
      wobbleRect(ctx, r, hx, hy, hw, hh, amp);
      wobbleRect(ctx, r, ...P(E.nav), amp);
      wobbleLine(ctx, r, 10 * u, 9 * hv, 46 * u, 9 * hv, amp);
      if (i >= 1) { for (const k of ['c1', 'c2', 'c3']) wobbleRect(ctx, r, ...P(E[k]), amp); }
      if (i >= 2) {
        wobbleCircle(ctx, r, 50 * u, 29 * hv, 12 * u, amp);
        ctx.save(); ctx.translate(50 * u, 29 * hv); ctx.rotate(-0.4); ctx.scale(1, 0.32); wobbleCircle(ctx, r, 0, 0, 24 * u, amp, 1.0); ctx.restore();
      }
      if (i >= 3) {
        wobbleRect(ctx, r, ...P(E.bar), amp);
        ctx.fillStyle = 'rgba(255,246,222,0.3)'; ctx.fillRect(9 * u, 48.6 * hv, 46 * u, 2 * hv);
        ctx.strokeStyle = 'rgba(255,150,130,0.9)';
        ctx.font = `${W * 0.07}px "Heart Breaking Bad", "Comic Sans MS", cursive`;
        ctx.fillStyle = 'rgba(255,150,130,0.95)';
        ctx.fillText('XP?', 60 * u, 46.5 * hv);
        wobbleLine(ctx, r, 58 * u, 47 * hv, 56 * u, 49 * hv, amp);
      }
      // ícones e linhas de texto rabiscadas
      ctx.strokeStyle = 'rgba(255,246,222,0.55)';
      for (const k of ['c1', 'c2', 'c3']) {
        if (i < 1) break;
        const [x, y, , hgt] = P(E[k]);
        wobbleCircle(ctx, r, x + 6 * u, y + hgt / 2, 3 * u, amp * 0.6);
        wobbleLine(ctx, r, x + 14 * u, y + hgt * 0.35, x + 60 * u, y + hgt * 0.35, amp * 0.8);
        wobbleLine(ctx, r, x + 14 * u, y + hgt * 0.65, x + 44 * u, y + hgt * 0.65, amp * 0.8);
      }
    } else if (mode === 1) {
      // ---- wireframe: caixas cinza, texto em barras
      ctx.fillStyle = 'rgba(230,240,250,0.07)'; ctx.fillRect(0, 0, W, H);
      const box = (e, fill) => { const [x, y, w, h] = P(e); ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); ctx.strokeStyle = 'rgba(214,228,244,0.75)'; ctx.lineWidth = 1.2; ctx.strokeRect(x, y, w, h); };
      const bar = (x, y, w, h, c = 'rgba(214,228,244,0.4)') => { ctx.fillStyle = c; ctx.fillRect(x * u, y * hv, w * u, h * hv); };
      bar(8, 6.5, 40, 2.4, 'rgba(214,228,244,0.55)'); ctx.fillStyle = 'rgba(214,228,244,0.4)'; ctx.beginPath(); ctx.arc(88 * u, 8 * hv, 4 * u, 0, TAU); ctx.fill();
      box(E.hero, 'rgba(230,240,250,0.08)');
      const [hx, hy, hw, hh] = P(E.hero);
      ctx.strokeStyle = 'rgba(214,228,244,0.45)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + hw, hy + hh); ctx.moveTo(hx + hw, hy); ctx.lineTo(hx, hy + hh); ctx.stroke();
      if (q > 0.2) { ctx.strokeStyle = 'rgba(214,228,244,0.85)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(50 * u, 29 * hv, 12 * u, 0, TAU); ctx.stroke(); }
      box(E.bar, 'rgba(230,240,250,0.12)');
      ctx.fillStyle = 'rgba(214,228,244,0.6)'; ctx.fillRect(8 * u, 48 * hv, 50 * u, 3.2 * hv);
      for (const k of ['c1', 'c2', 'c3']) {
        box(E[k], 'rgba(230,240,250,0.08)');
        const [x, y, , hgt] = P(E[k]);
        ctx.fillStyle = 'rgba(214,228,244,0.4)'; ctx.beginPath(); ctx.arc(x + 7 * u, y + hgt / 2, 3.6 * u, 0, TAU); ctx.fill();
        bar(8 + 15, (E[k][1] + 2.6), 44, 1.6, 'rgba(214,228,244,0.55)'); bar(8 + 15, (E[k][1] + 6), 30, 1.3);
        if (q > 0.5) { ctx.strokeStyle = 'rgba(214,228,244,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(x + 66 * u, y + hgt * 0.3, 13 * u, hgt * 0.4); }
      }
      box(E.nav, 'rgba(230,240,250,0.1)');
      for (let k = 0; k < 4; k += 1) { ctx.fillStyle = 'rgba(214,228,244,0.55)'; ctx.beginPath(); ctx.arc((14 + k * 24) * u, 96.5 * hv, 2.4 * u, 0, TAU); ctx.fill(); }
      if (q > 0.66) {
        ctx.fillStyle = 'rgba(240,246,255,0.92)'; ctx.font = `600 ${W * 0.05}px ui-sans-serif, system-ui, sans-serif`;
        ctx.fillText('Nível 7', 8 * u, 9 * hv); ctx.fillText('Missão do dia', 23 * u, 59 * hv);
      }
    } else {
      // ---- protótipo de alta fidelidade → app pronto
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, q < 0.34 ? 'rgba(20,24,58,0.62)' : 'rgba(10,14,46,0.64)'); g.addColorStop(1, q < 0.34 ? 'rgba(35,32,79,0.62)' : 'rgba(43,26,92,0.64)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      if (q > 0.3) { for (let k = 0; k < 40; k += 1) { ctx.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`; ctx.fillRect(r() * W, r() * H, 1.4, 1.4); } }
      ctx.fillStyle = '#f4efe6'; ctx.font = `700 ${W * 0.058}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText('Astro Quest', 8 * u, 9.2 * hv);
      ctx.fillStyle = '#ffcf5c'; ctx.beginPath(); ctx.arc(88 * u, 8 * hv, 4.4 * u, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a2a00'; ctx.font = `800 ${W * 0.04}px ui-sans-serif, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('7', 88 * u, 9.4 * hv); ctx.textAlign = 'left';
      // cartão-herói com o planeta
      const [hx, hy, hw, hh] = P(E.hero);
      const hg = ctx.createLinearGradient(hx, hy, hx + hw, hy + hh);
      hg.addColorStop(0, '#2b2f78'); hg.addColorStop(1, '#4b2a86');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect(hx, hy, hw, hh, 3 * u); ctx.fill();
      const px = 50 * u;
      const py = 29 * hv;
      if (q > 0.34) glow(ctx, px, py, 24 * u, 'rgba(255,170,90,', 0.45);
      const pg = ctx.createRadialGradient(px - 4 * u, py - 4 * u, 1, px, py, 12 * u);
      pg.addColorStop(0, q > 0.34 ? '#ffd08a' : '#e7a45e'); pg.addColorStop(1, q > 0.34 ? '#b5471f' : '#c76a35');
      ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 12 * u, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(px, py); ctx.rotate(-0.4); ctx.scale(1, 0.32);
      ctx.strokeStyle = q > 0.34 ? 'rgba(160,230,255,0.9)' : 'rgba(160,230,255,0.6)'; ctx.lineWidth = 1.6 * u * 0.5; ctx.beginPath(); ctx.arc(0, 0, 24 * u, 0, TAU); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = '#9fe8ff'; ctx.beginPath(); ctx.arc(px + Math.cos(-0.4 + 1) * 24 * u, py + Math.sin(1) * 7.4 * hv * 0.6, 2.2 * u, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f4efe6'; ctx.font = `600 ${W * 0.042}px ui-sans-serif, sans-serif`;
      ctx.fillText('Órbitas · Missão 3', hx + 3 * u, hy + hh - 2.6 * hv);
      // XP
      const [bx, by, bw, bh] = P(E.bar);
      ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, bh / 2); ctx.fill();
      const xg = ctx.createLinearGradient(bx, 0, bx + bw * 0.62, 0); xg.addColorStop(0, '#5fd0ff'); xg.addColorStop(1, '#c58bff');
      ctx.fillStyle = xg; ctx.beginPath(); ctx.roundRect(bx, by, bw * 0.62, bh, bh / 2); ctx.fill();
      ctx.fillStyle = '#d7d2ff'; ctx.font = `600 ${W * 0.034}px ui-sans-serif, sans-serif`; ctx.fillText('1.240 / 2.000 XP', bx, by - 1.2 * hv);
      const items = [['Descubra Marte', '+120 XP', '#ff7a59'], ['Cometa Halley', '+80 XP', '#5fd0ff'], ['Estrelas variáveis', '+60 XP', '#ffd25c']];
      ['c1', 'c2', 'c3'].forEach((k, n) => {
        const [x, y, w, hgt] = P(E[k]);
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.roundRect(x, y, w, hgt, 2.4 * u); ctx.fill();
        if (q > 0.34) { ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.stroke(); }
        glow(ctx, x + 7 * u, y + hgt / 2, 7 * u, `rgba(${items[n][2] === '#ff7a59' ? '255,122,89' : items[n][2] === '#5fd0ff' ? '95,208,255' : '255,210,92'},`, 0.45);
        ctx.fillStyle = items[n][2]; ctx.beginPath(); ctx.arc(x + 7 * u, y + hgt / 2, 3.8 * u, 0, TAU); ctx.fill();
        ctx.fillStyle = '#f4efe6'; ctx.font = `600 ${W * 0.042}px ui-sans-serif, sans-serif`; ctx.fillText(items[n][0], x + 15 * u, y + hgt * 0.45);
        ctx.fillStyle = '#b9b4e6'; ctx.font = `${W * 0.034}px ui-sans-serif, sans-serif`; ctx.fillText(items[n][1], x + 15 * u, y + hgt * 0.8);
        if (q > 0.6) { ctx.fillStyle = items[n][2]; ctx.beginPath(); ctx.roundRect(x + 66 * u, y + hgt * 0.28, 14 * u, hgt * 0.44, 2 * u); ctx.fill(); }
      });
      ctx.fillStyle = 'rgba(8,10,40,0.6)'; ctx.fillRect(...P(E.nav));
      for (let k = 0; k < 4; k += 1) { ctx.fillStyle = k === 0 ? '#ffd25c' : '#8d88c8'; ctx.beginPath(); ctx.arc((14 + k * 24) * u, 96.5 * hv, 2.6 * u, 0, TAU); ctx.fill(); }
      if (q > 0.9) { for (let k = 0; k < 14; k += 1) { ctx.fillStyle = ['#ffd25c', '#5fd0ff', '#ff7a59', '#c58bff'][k % 4]; ctx.save(); ctx.translate(r() * W, r() * H * 0.45); ctx.rotate(r() * TAU); ctx.fillRect(-3, -1, 6, 2); ctx.restore(); } }
    }
    ctx.restore();
    // borda do “papel/tela”
    ctx.strokeStyle = mode === 2 ? 'rgba(220,210,255,0.55)' : 'rgba(240,244,250,0.4)';
    ctx.lineWidth = mode === 2 ? 2.4 : 1.2;
    ctx.beginPath(); ctx.roundRect(0, 0, W, H, W * 0.07); ctx.stroke();
  };

  const flipbook = {
    still: 6.5,
    init(c) {
      const { w, h } = c;
      const narrow = w < 720;
      c.st.H = narrow ? Math.min(h * 0.7, w * 1.35) : Math.min(h * 0.84, 800);
      c.st.W = c.st.H * 0.56;
      c.st.cx = narrow ? w * 0.5 : w * 0.27;
    },
    draw(c, t) {
      const { ctx, w, h, st } = c;
      const { W, H } = st;
      const narrow = w < 720;
      let cy = h * 0.5;
      try {
        const rc = c.host.getBoundingClientRect();
        cy = clamp(window.innerHeight * 0.5 - rc.top, H * 0.55, Math.max(H * 0.55, h - H * 0.55));
      } catch {}
      if (c.frozen) cy = h * 0.5;
      const tau = t % FCYCLE;
      const f = Array.from({ length: FP }, (_, i) => clamp((tau - flipStart(i)) / flipDur(i), 0, 1));
      let base = f.findIndex((v) => v === 0);
      if (base < 0) base = 0;
      const sx = st.cx - W / 2;
      const sy = cy - H / 2;
      ctx.save();
      ctx.translate(sx, sy);
      // folhas empilhadas por trás: a espessura do bloco
      for (let k = 3; k >= 1; k -= 1) {
        ctx.fillStyle = `rgba(244,236,214,${0.18 - k * 0.03})`;
        ctx.beginPath(); ctx.roundRect(k * 4, k * 3, W, H, W * 0.07); ctx.fill();
      }
      ctx.globalAlpha = 0.85;
      drawAppPage(ctx, W, H, base);
      // páginas em voo (a de menor índice fica por cima)
      for (let i = FP - 1; i >= 0; i -= 1) {
        const v = f[i];
        if (v <= 0 || v >= 1) continue;
        const e = v * v * (3 - 2 * v);
        const a = e * Math.PI;
        const ca = Math.cos(a);
        ctx.save();
        ctx.globalAlpha = 0.85 * (1 - smooth(0.7, 1, v) * 0.6);
        ctx.transform(ca, Math.sin(a) * 0.07, 0, 1, 0, -Math.sin(a) * H * 0.02);
        if (a < Math.PI / 2) drawAppPage(ctx, W, H, i);
        else {
          ctx.fillStyle = 'rgba(255,248,226,0.12)'; ctx.beginPath(); ctx.roundRect(0, 0, W, H, W * 0.07); ctx.fill();
          ctx.strokeStyle = 'rgba(240,244,250,0.3)'; ctx.stroke();
        }
        ctx.fillStyle = `rgba(0,0,0,${0.3 * Math.sin(a)})`;
        ctx.beginPath(); ctx.roundRect(0, 0, W, H, W * 0.07); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      // lombada
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-2, 0, 3, H);
      // etiqueta do estágio
      const shown = FSTAGE[Math.min(base, FP - 1)];
      ctx.font = '700 13px "Portfolio Typewriter", ui-monospace, monospace';
      ctx.fillStyle = 'rgba(255,244,214,0.92)';
      const lx = narrow ? 0 : W + 16;
      const ly = narrow ? -12 : 26;
      ctx.fillText(`${String(Math.min(base, FP - 1) + 1).padStart(2, '0')}/${FP} · ${shown}`, lx, ly);
      for (let k = 0; k < 3; k += 1) {
        const act = (base < 4 ? 0 : base < 8 ? 1 : 2) === k;
        ctx.fillStyle = act ? '#ffd98a' : 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.arc(lx + 5 + k * 14, ly + 14, act ? 4 : 3, 0, TAU); ctx.fill();
      }
      ctx.restore();
    },
  };

  // ======================================================================================================
  // Percurso — a equação de Dirac, do macro ao subatômico
  // ======================================================================================================
  const ZSTAGES = [
    { a: 0, b: 10, s0: 1, s1: 14, name: 'equação de Dirac · ≈ 10⁻¹ m', note: 'o macro: uma linha de tinta (1928)' },
    { a: 8.5, b: 18, s0: 0.3, s1: 5, name: 'tinta e fibras de papel · ≈ 10⁻⁴ m', note: 'o traço do ψ sobre a celulose' },
    { a: 16.5, b: 26, s0: 0.3, s1: 5, name: 'moléculas de celulose · ≈ 10⁻⁹ m', note: 'anéis de glicose, carbono e oxigênio' },
    { a: 24.5, b: 34, s0: 0.3, s1: 5, name: 'átomo · ≈ 10⁻¹⁰ m', note: 'o elétron que a equação descreve' },
    { a: 32.5, b: 42, s0: 0.3, s1: 5, name: 'núcleo e quarks · ≈ 10⁻¹⁵ m', note: 'prótons, glúons e o mar de vácuo' },
    { a: 40.5, b: 50, s0: 0.5, s1: 2.4, name: 'espinor ψ · mar de Dirac', note: 'matéria e antimatéria: pares elétron–pósitron' },
  ];
  const ZLOOP = 50;
  const zoom = {
    still: 3,
    init(c) {
      const r = rngFrom(53);
      const st = c.st;
      const narrow = c.w < 720;
      st.U = narrow ? Math.min(c.w * 0.42, 170) : Math.min(c.w * 0.2, c.h * 0.3, 250);
      st.cx = narrow ? c.w * 0.5 : Math.min(c.w * 0.25, 330);
      st.fibers = Array.from({ length: 70 }, () => ({ x0: (r() - 0.5) * 2.6, y0: (r() - 0.5) * 2.6, a: r() * TAU, len: 0.9 + r() * 1.3, bend: (r() - 0.5) * 1.2, wd: 0.006 + r() * 0.014 }));
      st.sea = Array.from({ length: 90 }, () => ({ a: r() * TAU, d: 0.15 + r() * 0.7, ph: r() * TAU, f: 1 + r() * 3 }));
      st.grain = Array.from({ length: 160 }, () => ({ x: (r() - 0.5) * 1.4, y: (r() - 0.5) * 1.4, s: 0.004 + r() * 0.012, a: 0.2 + r() * 0.5 }));
      st.stars = Array.from({ length: Math.round((c.w * c.h) / 9000) }, () => ({ x: r() * c.w, y: r() * c.h, s: r() * 1.2 + 0.3, p: r() * TAU, f: 0.4 + r() * 1.4 }));
    },
    draw(c, t) {
      const { ctx, w, h, st } = c;
      const U = st.U;
      const tt = t % ZLOOP;
      const cx = st.cx;
      // o foco acompanha o meio da janela, para a animação ficar sempre à vista
      let cy = h * 0.5;
      try {
        const rc = c.host.getBoundingClientRect();
        const mid = window.innerHeight * 0.5 - rc.top;
        cy = clamp(mid, U * 1.7, Math.max(U * 1.7, h - U * 1.7));
      } catch {}
      if (c.frozen) cy = Math.min(h * 0.5, Math.max(h * 0.3, U * 1.7));
      for (const s of st.stars) {
        ctx.fillStyle = `rgba(214,226,255,${0.18 + 0.2 * Math.sin(t * s.f + s.p)})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, TAU); ctx.fill();
      }
      let best = null;
      ZSTAGES.forEach((s, i) => {
        if (tt < s.a || tt > s.b) return;
        const u = (tt - s.a) / (s.b - s.a);
        const sc = Math.exp(lerp(Math.log(s.s0), Math.log(s.s1), i === 0 ? smooth(0.3, 1, u) : u));
        const al = smooth(0, 0.16, u) * (1 - smooth(0.84, 1, u));
        if (!best || al > best.al) best = { i, al };
        glow(ctx, cx, cy, U * 1.7, 'rgba(120,150,255,', 0.1 * al);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(sc, sc);
        ctx.globalAlpha = al;
        layers[i](ctx, U, t, sc, st, u);
        ctx.restore();
      });
      // retícula e legenda de escala
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, TAU);
      ctx.moveTo(cx - 16, cy); ctx.lineTo(cx - 9, cy); ctx.moveTo(cx + 9, cy); ctx.lineTo(cx + 16, cy);
      ctx.moveTo(cx, cy - 16); ctx.lineTo(cx, cy - 9); ctx.moveTo(cx, cy + 9); ctx.lineTo(cx, cy + 16);
      ctx.stroke();
      if (best) {
        const a = Math.min(1, best.al * 1.5);
        const ly = Math.min(h - 26, cy + U * 1.28);
        ctx.textAlign = 'center';
        ctx.font = '14px "Portfolio Typewriter", ui-monospace, monospace';
        ctx.fillStyle = `rgba(244,232,200,${0.95 * a})`;
        ctx.fillText(ZSTAGES[best.i].name, cx, ly);
        ctx.font = '12.5px "Portfolio Typewriter", ui-monospace, monospace';
        ctx.fillStyle = `rgba(200,214,255,${0.75 * a})`;
        ctx.fillText(ZSTAGES[best.i].note, cx, ly + 17);
        ctx.textAlign = 'left';
      }
    },
  };
  const layers = [
    // 0 · a equação de Dirac, escrita com tinta luminosa — o foco desce até o ψ
    (ctx, U, t, sc, st, u) => {
      const f = U * 0.22;
      const parts = [['(iγ', 0, 1], ['μ', -0.32, 0.55], ['∂', 0, 1], ['μ', 0.22, 0.55], [' − m)', 0, 1], ['ψ', 0, 1.25], [' = 0', 0, 1]];
      let x = 0;
      let xPsi = 0;
      let psiW = 0;
      const placed = parts.map(([s, dy, k], i) => {
        ctx.font = `italic ${f * k}px Georgia, "Times New Roman", serif`;
        const wd = ctx.measureText(s).width;
        if (i === 5) { xPsi = x; psiW = wd; }
        const o = { s, dy, k, x, wd };
        x += wd;
        return o;
      });
      const e = smooth(0.35, 0.85, u);
      const x0 = lerp(-x / 2, -(xPsi + psiW / 2), e);
      ctx.textBaseline = 'middle';
      for (const p of placed) {
        const isPsi = p.s === 'ψ';
        ctx.font = `italic ${f * p.k}px Georgia, "Times New Roman", serif`;
        ctx.shadowColor = isPsi ? 'rgba(255,200,90,0.95)' : 'rgba(150,190,255,0.8)';
        ctx.shadowBlur = (isPsi ? 18 : 10) / Math.sqrt(sc);
        ctx.fillStyle = isPsi ? '#ffd98a' : '#eef3ff';
        ctx.fillText(p.s, x0 + p.x, p.dy * f);
      }
      ctx.shadowBlur = 0;
      ctx.textBaseline = 'alphabetic';
    },
    // 1 · tinta sobre as fibras do papel
    (ctx, U, t, sc, st) => {
      ctx.lineCap = 'round';
      for (const fb of st.fibers) {
        const x0 = fb.x0 * U;
        const y0 = fb.y0 * U;
        const dx = Math.cos(fb.a) * fb.len * U * 0.5;
        const dy = Math.sin(fb.a) * fb.len * U * 0.5;
        const nx = -Math.sin(fb.a) * fb.bend * U * 0.4;
        const ny = Math.cos(fb.a) * fb.bend * U * 0.4;
        ctx.strokeStyle = 'rgba(255,240,215,0.5)';
        ctx.lineWidth = fb.wd * U;
        ctx.beginPath(); ctx.moveTo(x0 - dx, y0 - dy); ctx.quadraticCurveTo(x0 + nx, y0 + ny, x0 + dx, y0 + dy); ctx.stroke();
      }
      // o traço do ψ: uma faixa de tinta que penetra nas fibras
      ctx.strokeStyle = 'rgba(255,205,100,0.9)';
      ctx.lineWidth = U * 0.34;
      ctx.shadowColor = 'rgba(255,190,80,0.9)';
      ctx.shadowBlur = 14 / Math.sqrt(sc);
      ctx.beginPath(); ctx.moveTo(0, -U * 1.1); ctx.bezierCurveTo(U * 0.06, -U * 0.3, -U * 0.06, U * 0.3, 0, U * 1.1); ctx.stroke();
      ctx.shadowBlur = 0;
      for (const g of st.grain) {
        ctx.fillStyle = `rgba(255,226,150,${g.a})`;
        ctx.beginPath(); ctx.arc(g.x * U * 0.5, g.y * U * 1.4, g.s * U, 0, TAU); ctx.fill();
      }
    },
    // 2 · cadeias de celulose (anéis de glicose)
    (ctx, U, t, sc) => {
      const R = U * 0.11;
      const lw = Math.max(U * 0.007, 0.9 / sc);
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
          ctx.strokeStyle = 'rgba(190,255,225,0.9)';
          ctx.lineWidth = lw;
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,130,130,0.95)';
          ctx.beginPath(); ctx.arc(x + R * 0.87, y + R * 0.5, R * 0.16, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.beginPath(); ctx.arc(x, y - R * 1.35, R * 0.12, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.moveTo(x, y - R); ctx.lineTo(x, y - R * 1.35); ctx.stroke();
        }
      }
    },
    // 3 · átomo com nuvem eletrônica
    (ctx, U, t, sc) => {
      const lw = Math.max(U * 0.006, 0.9 / sc);
      glow(ctx, 0, 0, U * 1.1, 'rgba(110,150,255,', 0.3);
      for (let k = 0; k < 3; k += 1) {
        ctx.save();
        ctx.rotate((k * Math.PI) / 3 + t * 0.06);
        ctx.strokeStyle = 'rgba(190,215,255,0.65)';
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.ellipse(0, 0, U * 0.95, U * 0.34, 0, 0, TAU); ctx.stroke();
        for (let e = 0; e < 2; e += 1) {
          const a = t * (0.9 + k * 0.25) + e * Math.PI + k;
          const ex = Math.cos(a) * U * 0.95;
          const ey = Math.sin(a) * U * 0.34;
          glow(ctx, ex, ey, U * 0.12, 'rgba(150,215,255,', 1);
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(ex, ey, U * 0.03, 0, TAU); ctx.fill();
        }
        ctx.restore();
      }
      for (let i = 0; i < 12; i += 1) {
        const a = i * 2.4;
        const d = U * 0.06 * Math.sqrt(i / 12) * 2;
        ctx.fillStyle = i % 2 ? 'rgba(255,120,120,0.95)' : 'rgba(130,170,255,0.95)';
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, U * 0.036, 0, TAU); ctx.fill();
      }
    },
    // 4 · próton e quarks
    (ctx, U, t, sc, st) => {
      glow(ctx, 0, 0, U * 0.6, 'rgba(255,255,255,', 0.28);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = Math.max(U * 0.006, 0.9 / sc);
      ctx.beginPath(); ctx.arc(0, 0, U * 0.45, 0, TAU); ctx.stroke();
      for (const s of st.sea) {
        ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(t * s.f + s.ph)})`;
        ctx.beginPath(); ctx.arc(Math.cos(s.a + t * 0.1) * U * s.d * 0.58, Math.sin(s.a + t * 0.1) * U * s.d * 0.58, U * 0.01, 0, TAU); ctx.fill();
      }
      const cols = ['255,90,90', '90,230,130', '110,150,255'];
      const pts = cols.map((_, i) => {
        const a = t * 0.5 + (i / 3) * TAU;
        return [Math.cos(a) * U * 0.19, Math.sin(a) * U * 0.19];
      });
      for (let i = 0; i < 3; i += 1) {
        const [x0, y0] = pts[i];
        const [x1, y1] = pts[(i + 1) % 3];
        ctx.strokeStyle = 'rgba(255,236,170,0.9)';
        ctx.lineWidth = Math.max(U * 0.007, 0.9 / sc);
        ctx.beginPath();
        for (let k = 0; k <= 24; k += 1) {
          const q = k / 24;
          const nx = -(y1 - y0);
          const ny = x1 - x0;
          const nl = Math.hypot(nx, ny) || 1;
          const off = Math.sin(q * 22 + t * 8) * U * 0.014;
          const x = lerp(x0, x1, q) + (nx / nl) * off;
          const y = lerp(y0, y1, q) + (ny / nl) * off;
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      pts.forEach(([x, y], i) => {
        glow(ctx, x, y, U * 0.13, `rgba(${cols[i]},`, 1);
        ctx.fillStyle = `rgba(${cols[i]},1)`;
        ctx.beginPath(); ctx.arc(x, y, U * 0.055, 0, TAU); ctx.fill();
      });
    },
    // 5 · o mar de Dirac: estados de energia negativa e pares elétron–pósitron
    (ctx, U, t, sc) => {
      const gap = U * 0.22;
      const half = U * 1.15;
      const lw = Math.max(U * 0.006, 0.9 / sc);
      ctx.strokeStyle = 'rgba(190,210,255,0.8)';
      ctx.lineWidth = lw;
      for (const sgn of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(-half, sgn * gap); ctx.lineTo(half, sgn * gap); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(210,225,255,0.12)';
      ctx.fillRect(-half, gap, half * 2, U * 0.9);
      ctx.fillStyle = 'rgba(255,200,120,0.05)';
      ctx.fillRect(-half, -gap - U * 0.9, half * 2, U * 0.9);
      ctx.font = `italic ${U * 0.13}px Georgia, serif`;
      ctx.fillStyle = 'rgba(255,230,170,0.95)';
      ctx.textAlign = 'center';
      ctx.fillText('+mc²', half + U * 0.02, -gap + U * 0.04);
      ctx.fillText('−mc²', half + U * 0.02, gap + U * 0.14);
      ctx.fillText('E', 0, -gap - U * 0.95);
      ctx.textAlign = 'left';
      // mar preenchido (estados de energia negativa)
      const nx = 15;
      for (let row = 0; row < 4; row += 1) {
        for (let k = 0; k < nx; k += 1) {
          const x = -half + ((k + 0.5) / nx) * half * 2;
          const y = gap + U * (0.14 + row * 0.19);
          ctx.fillStyle = 'rgba(150,200,255,0.85)';
          ctx.beginPath(); ctx.arc(x, y, U * 0.034, 0, TAU); ctx.fill();
        }
      }
      // criação de pares: fóton → elétron (acima) + pósitron (buraco abaixo)
      for (let k = 0; k < 5; k += 1) {
        const ph = (t * 0.22 + k * 0.2) % 1;
        const x = -half + ((k * 3 + 2 + 0.5) / nx) * half * 2;
        const y0 = gap + U * 0.14;
        const y1 = -gap - U * (0.2 + 0.12 * (k % 3));
        const up = smooth(0.12, 0.34, ph) * (1 - smooth(0.72, 0.92, ph));
        if (ph < 0.14) {
          ctx.strokeStyle = `rgba(255,240,170,${0.95 * (1 - ph / 0.14)})`;
          ctx.lineWidth = lw * 1.6;
          ctx.beginPath();
          for (let q = 0; q <= 30; q += 1) {
            const xx = x - U * 0.9 + (q / 30) * U * 0.9;
            const yy = y0 + Math.sin(q * 1.2) * U * 0.03;
            if (q === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
          }
          ctx.stroke();
        }
        if (up > 0) {
          const ey = lerp(y0, y1, up);
          glow(ctx, x, ey, U * 0.16, 'rgba(120,225,255,', up);
          ctx.fillStyle = `rgba(230,250,255,${up})`;
          ctx.beginPath(); ctx.arc(x, ey, U * 0.05, 0, TAU); ctx.fill();
          ctx.strokeStyle = `rgba(255,140,200,${up})`;
          ctx.lineWidth = lw * 1.8;
          ctx.fillStyle = 'rgba(8,10,28,0.9)';
          ctx.beginPath(); ctx.arc(x, y0, U * 0.05, 0, TAU); ctx.fill(); ctx.stroke();
          glow(ctx, x, y0, U * 0.15, 'rgba(255,120,190,', 0.7 * up);
        }
      }
    },
  ];

  // ======================================================================================================
  // Contato — céu profundo: estrelas, nebulosas, planetas, asteroides, cometas e estrelas cadentes
  // ======================================================================================================
  const STAR_COLS = ['255,255,255', '190,215,255', '255,232,190', '255,200,220', '200,255,240'];
  const cosmos = {
    still: 7,
    init(c) {
      const r = rngFrom(71);
      const { w, h, st } = c;
      const m = Math.min(w, h);
      st.stars = Array.from({ length: clamp(Math.round((w * h) / 1500), 160, 760) }, () => {
        const big = r() < 0.07;
        return { x: r() * w, y: r() * h, s: big ? 1.4 + r() * 1.3 : 0.35 + r() * 0.95, p: r() * TAU, f: 0.5 + r() * 2.6, col: STAR_COLS[(r() * STAR_COLS.length) | 0], big, z: 0.2 + r() * 0.8 };
      });
      st.neb = [
        { x: 0.78, y: 0.3, r: 0.5, col: '120,70,200', a: 0.2 },
        { x: 0.2, y: 0.86, r: 0.46, col: '40,110,190', a: 0.17 },
        { x: 0.52, y: 0.1, r: 0.36, col: '200,70,140', a: 0.12 },
        { x: 0.95, y: 0.9, r: 0.4, col: '40,170,170', a: 0.12 },
      ];
      st.ast = Array.from({ length: clamp(Math.round(w / 12), 40, 110) }, () => ({
        a: r() * TAU, d: 0.86 + r() * 0.28, sp: 0.012 + r() * 0.02, s: 1.6 + r() * 4.2, rot: r() * TAU, rs: (r() - 0.5) * 1.4,
        pts: Array.from({ length: 7 }, (_, k) => [(k / 7) * TAU, 0.6 + r() * 0.55]), tone: 90 + ((r() * 70) | 0),
      }));
      st.m = m;
      st.gal = Array.from({ length: 220 }, () => { const arm = (r() * 2) | 0; const d = Math.pow(r(), 0.7); return { a: arm * Math.PI + d * 5.2 + (r() - 0.5) * 0.5, d, s: 0.4 + r() * 0.9 }; });
    },
    draw(c, t) {
      const { ctx, w, h, st } = c;
      const m = st.m;
      const narrow = w < 720;
      // nebulosas
      for (const n of st.neb) glow(ctx, w * n.x + Math.sin(t * 0.05 + n.x * 9) * 14, h * n.y + Math.cos(t * 0.04 + n.y * 7) * 10, Math.max(w, h) * n.r, `rgba(${n.col},`, n.a);
      // estrelas
      for (const s of st.stars) {
        const tw = 0.55 + 0.45 * Math.sin(t * s.f + s.p);
        const x = (s.x + t * 1.2 * s.z) % w;
        ctx.fillStyle = `rgba(${s.col},${(0.45 + 0.5 * tw) * (s.big ? 1 : 0.9)})`;
        ctx.beginPath(); ctx.arc(x, s.y, s.s * (0.85 + 0.3 * tw), 0, TAU); ctx.fill();
        if (s.big) {
          ctx.globalCompositeOperation = 'lighter';
          glow(ctx, x, s.y, 9 + 6 * tw, `rgba(${s.col},`, 0.5 * tw);
          ctx.strokeStyle = `rgba(${s.col},${0.4 * tw})`; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(x - 9 * tw - 3, s.y); ctx.lineTo(x + 9 * tw + 3, s.y); ctx.moveTo(x, s.y - 9 * tw - 3); ctx.lineTo(x, s.y + 9 * tw + 3); ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      // galáxia espiral distante
      {
        const gx = narrow ? w * 0.78 : w * 0.56;
        const gy = narrow ? h * 0.14 : h * 0.78;
        const gr = m * (narrow ? 0.12 : 0.15);
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, gx, gy, gr * 0.9, 'rgba(255,225,190,', 0.3);
        ctx.save(); ctx.translate(gx, gy); ctx.scale(1, 0.42); ctx.rotate(-0.5);
        for (const g of st.gal) {
          const a = g.a + t * 0.05 * (1.2 - g.d);
          ctx.fillStyle = `rgba(${g.d < 0.35 ? '255,230,190' : '170,200,255'},${0.8 * (1 - g.d * 0.55)})`;
          ctx.beginPath(); ctx.arc(Math.cos(a) * g.d * gr, Math.sin(a) * g.d * gr, g.s, 0, TAU); ctx.fill();
        }
        ctx.restore();
        ctx.globalCompositeOperation = 'source-over';
      }
      // planetas
      const planet = (x, y, rad, kind) => {
        ctx.save();
        if (kind === 'gas') {
          ctx.translate(x, y); ctx.rotate(-0.32);
          // anel (metade de trás)
          const ring = (front) => {
            ctx.save(); ctx.scale(1, 0.26);
            for (const [r0, r1, al] of [[1.45, 1.62, 0.5], [1.68, 1.95, 0.38], [2.0, 2.12, 0.25]]) {
              ctx.strokeStyle = `rgba(232,208,160,${al})`; ctx.lineWidth = (r1 - r0) * rad;
              ctx.beginPath(); ctx.arc(0, 0, (r0 + r1) / 2 * rad, front ? 0 : Math.PI, front ? Math.PI : TAU); ctx.stroke();
            }
            ctx.restore();
          };
          ring(false);
          const g = ctx.createRadialGradient(-rad * 0.35, -rad * 0.4, rad * 0.1, 0, 0, rad);
          g.addColorStop(0, '#f6dcae'); g.addColorStop(0.55, '#c78f55'); g.addColorStop(1, '#6b3d24');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.fill();
          ctx.save(); ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.clip();
          for (let k = -4; k <= 4; k += 1) { ctx.fillStyle = `rgba(${k % 2 ? '120,66,36' : '255,230,190'},${k % 2 ? 0.32 : 0.2})`; ctx.fillRect(-rad, k * rad * 0.2 - rad * 0.05 + Math.sin(t * 0.2 + k) * rad * 0.01, rad * 2, rad * 0.11); }
          const sh = ctx.createRadialGradient(-rad * 0.5, -rad * 0.5, rad * 0.5, -rad * 0.2, -rad * 0.2, rad * 1.5);
          sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,10,0.82)');
          ctx.fillStyle = sh; ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
          ctx.restore();
          ring(true);
        } else {
          ctx.translate(x, y);
          const pal = kind === 'ice' ? ['#d6f6ff', '#4ea6c9', '#16466a'] : ['#f0a47a', '#b04a2c', '#4a1a14'];
          const g = ctx.createRadialGradient(-rad * 0.4, -rad * 0.4, rad * 0.1, 0, 0, rad);
          g.addColorStop(0, pal[0]); g.addColorStop(0.55, pal[1]); g.addColorStop(1, pal[2]);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.fill();
          ctx.save(); ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.clip();
          if (kind === 'ice') { ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = rad * 0.07; for (let k = -2; k <= 2; k += 1) { ctx.beginPath(); ctx.ellipse(0, k * rad * 0.3, rad * 1.1, rad * 0.16, 0.2 + t * 0.01, 0, TAU); ctx.stroke(); } }
          else { for (const [cx2, cy2, cr] of [[-0.2, -0.1, 0.22], [0.3, 0.2, 0.15], [-0.05, 0.45, 0.12], [0.35, -0.35, 0.1]]) { ctx.fillStyle = 'rgba(60,18,12,0.35)'; ctx.beginPath(); ctx.arc(cx2 * rad, cy2 * rad, cr * rad, 0, TAU); ctx.fill(); } }
          const sh = ctx.createRadialGradient(-rad * 0.5, -rad * 0.5, rad * 0.5, -rad * 0.2, -rad * 0.2, rad * 1.5);
          sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,10,0.85)');
          ctx.fillStyle = sh; ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
          ctx.restore();
          // atmosfera
          ctx.strokeStyle = kind === 'ice' ? 'rgba(170,230,255,0.45)' : 'rgba(255,170,120,0.35)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(0, 0, rad + 1, Math.PI * 0.95, Math.PI * 1.65); ctx.stroke();
          // lua
          const ma = t * (kind === 'ice' ? 0.5 : 0.8);
          const mx = Math.cos(ma) * rad * 1.9;
          const my = Math.sin(ma) * rad * 0.55;
          if (Math.sin(ma) < 0 || true) {
            ctx.fillStyle = '#cfcfd6'; ctx.beginPath(); ctx.arc(mx, my, rad * 0.18, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,15,0.45)'; ctx.beginPath(); ctx.arc(mx + rad * 0.06, my + rad * 0.05, rad * 0.18, 0, TAU); ctx.fill();
          }
        }
        ctx.restore();
      };
      ctx.globalCompositeOperation = 'lighter';
      const R1 = m * 0.12;
      glow(ctx, w * (narrow ? 0.84 : 0.9), h * (narrow ? 0.3 : 0.2), R1 * 3, 'rgba(255,190,120,', 0.14);
      glow(ctx, w * 0.62, h * (narrow ? 0.9 : 0.14), m * 0.07 * 3, 'rgba(120,210,255,', 0.1);
      ctx.globalCompositeOperation = 'source-over';
      planet(w * (narrow ? 0.84 : 0.9) + Math.sin(t * 0.05) * 6, h * (narrow ? 0.3 : 0.2) + Math.cos(t * 0.04) * 5, R1, 'gas');
      planet(w * 0.62 + Math.cos(t * 0.06) * 8, h * (narrow ? 0.9 : 0.14) + Math.sin(t * 0.05) * 6, m * 0.07, 'ice');
      planet(w * (narrow ? 0.12 : 0.42), h * (narrow ? 0.62 : 0.88) + Math.sin(t * 0.07) * 6, m * 0.045, 'red');

      // cinturão de asteroides
      {
        const bx = w * 0.45;
        const by = h * 1.62;
        const rx = w * 0.72;
        const ry = h * 0.82;
        ctx.save();
        for (const a of st.ast) {
          const an = a.a + t * a.sp;
          const x = bx + Math.cos(an) * rx * a.d;
          const y = by - Math.abs(Math.sin(an)) * ry * a.d;
          if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
          ctx.save(); ctx.translate(x, y); ctx.rotate(a.rot + t * a.rs);
          ctx.beginPath();
          a.pts.forEach(([ang, k], i) => { const px = Math.cos(ang) * a.s * k; const py = Math.sin(ang) * a.s * k; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
          ctx.closePath();
          ctx.fillStyle = `rgb(${a.tone},${a.tone - 12},${a.tone - 22})`; ctx.fill();
          ctx.strokeStyle = 'rgba(255,240,220,0.5)'; ctx.lineWidth = 0.7; ctx.stroke();
          ctx.restore();
        }
        ctx.restore();
      }

      // cometas (cada um num ciclo próprio; a trajetória muda a cada passagem)
      ctx.globalCompositeOperation = 'lighter';
      const CP = [7, 10, 13, 19];
      CP.forEach((P, k) => {
        const tt = t + k * 5.3;
        const cyc = Math.floor(tt / P);
        const u0 = (tt / P) % 1;
        const vis = 0.34;
        if (u0 > vis) return;
        const u = u0 / vis;
        const rr = rngFrom(k * 977 + cyc * 131 + 5);
        const fromTop = rr() < 0.6;
        const x0 = fromTop ? rr() * w : -0.05 * w;
        const y0 = fromTop ? -0.08 * h : rr() * h * 0.7;
        const ang = fromTop ? Math.PI * (0.32 + rr() * 0.3) : Math.PI * (0.05 + rr() * 0.18);
        const len = Math.hypot(w, h) * 1.25;
        const x = x0 + Math.cos(ang) * len * u;
        const y = y0 + Math.sin(ang) * len * u;
        const fade = smooth(0, 0.08, u) * (1 - smooth(0.9, 1, u));
        const tl = m * (0.3 + 0.18 * rr());
        const tx = x - Math.cos(ang) * tl;
        const ty = y - Math.sin(ang) * tl;
        const g = ctx.createLinearGradient(x, y, tx, ty);
        g.addColorStop(0, `rgba(210,240,255,${0.9 * fade})`);
        g.addColorStop(0.3, `rgba(120,190,255,${0.4 * fade})`);
        g.addColorStop(1, 'rgba(120,190,255,0)');
        ctx.strokeStyle = g; ctx.lineCap = 'round';
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
        // cauda de poeira, curva e dourada
        const g2 = ctx.createLinearGradient(x, y, tx, ty);
        g2.addColorStop(0, `rgba(255,220,160,${0.55 * fade})`); g2.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.strokeStyle = g2; ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo((x + tx) / 2 + Math.sin(ang) * 26, (y + ty) / 2 - Math.cos(ang) * 26, tx + Math.sin(ang) * 40, ty - Math.cos(ang) * 40); ctx.stroke();
        for (let q = 0; q < 14; q += 1) {
          const f = q / 14;
          ctx.fillStyle = `rgba(255,240,210,${0.6 * (1 - f) * fade})`;
          ctx.beginPath(); ctx.arc(lerp(x, tx, f) + Math.sin(q * 9 + t * 3) * 4, lerp(y, ty, f) + Math.cos(q * 7 + t * 3) * 4, 1.4 * (1 - f) + 0.4, 0, TAU); ctx.fill();
        }
        glow(ctx, x, y, 26, 'rgba(210,240,255,', 0.9 * fade);
        ctx.fillStyle = `rgba(255,255,255,${fade})`; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
      });
      // estrelas cadentes
      for (let k = 0; k < 4; k += 1) {
        const P = 3.1 + k * 0.9;
        const tt = t + k * 1.7;
        const cyc = Math.floor(tt / P);
        const u0 = (tt / P) % 1;
        if (u0 > 0.14) continue;
        const u = u0 / 0.14;
        const rr = rngFrom(k * 313 + cyc * 17 + 3);
        const x0 = rr() * w * 1.1;
        const y0 = rr() * h * 0.6;
        const ang = Math.PI * (0.2 + rr() * 0.15);
        const sp = m * (0.9 + rr() * 0.6);
        const x = x0 + Math.cos(ang) * sp * u;
        const y = y0 + Math.sin(ang) * sp * u;
        const tl = m * 0.12;
        const g = ctx.createLinearGradient(x, y, x - Math.cos(ang) * tl, y - Math.sin(ang) * tl);
        const al = Math.sin(u * Math.PI);
        g.addColorStop(0, `rgba(255,255,255,${al})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * tl, y - Math.sin(ang) * tl); ctx.stroke();
      }
      // pulsar
      {
        const px = narrow ? w * 0.22 : w * 0.7;
        const py = narrow ? h * 0.78 : h * 0.52;
        const pu = Math.pow(Math.max(0, Math.sin(t * 5)), 6);
        glow(ctx, px, py, 24 + 16 * pu, 'rgba(160,230,255,', 0.25 + 0.55 * pu);
        ctx.strokeStyle = `rgba(160,230,255,${0.2 + 0.4 * pu})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(px, py - 60 - 20 * pu); ctx.lineTo(px, py + 60 + 20 * pu); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      veil(c, 0.42, 0.25);
    },
  };

  const SCENES = { supernova, spacetime, network, matrix, synapses, zoom, flipbook, cosmos };

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
    window.PortfolioScenes = {
      renderAt(host, t) { const c = host._scene; if (!c) return false; c.frozen = true; resize(c); if (c.scene.persistent) { c.st = {}; c.scene.init(c); } c.reduced = true; paint(c, t, 0.016); c.reduced = reduce; return true; },
    };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
