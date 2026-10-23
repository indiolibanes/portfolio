// Capa viva: lê a capa do álbum e escolhe uma animação leve que combine com ela.
//
// Inspiração: o player do BitChord (capa vertical grande, cores da arte no fundo, "canvas" animado
// por cima). Só a ideia foi reaproveitada; o código é todo próprio (o BitChord é GPL-3.0).
//
// Honestidade técnica: isto NÃO reconhece objetos (não sabe o que é um dragão). Mede cor, textura e
// forma em 64 px e aplica regras simples:
//   contour : silhueta nítida (duas massas bem separadas por luminância) -> o contorno vira uma rota
//             luminosa percorrida por corredores coloridos;
//   rain    : predominância de azuis/ciano frios -> gotas, ondas e riscos de chuva;
//   scales  : textura densa e saturada (pele, escamas, folhagem) -> escamas na cor dominante com onda de brilho;
//   embers  : predominância de quentes (vermelho/laranja) -> brasas subindo;
//   dust    : o resto -> poeira cintilante e véu de aurora nas cores da capa.
// Tudo é determinístico no tempo (sem estado), então o quadro estático de movimento reduzido é só t fixo.
(() => {
  const TAU = Math.PI * 2;
  const fract = (x) => x - Math.floor(x);
  const hash = (i, c, k) => fract(Math.sin(i * 127.1 + c * 311.7 + k * 74.7) * 43758.5453);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function rgbToHsv(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, max ? d / max : 0, max / 255];
  }

  const hsl = (h, s, l, a = 1) => `hsla(${Math.round(((h % 360) + 360) % 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${a})`;

  // ---------- análise ----------
  function otsu(hist, total) {
    let sum = 0;
    for (let i = 0; i < 256; i += 1) sum += i * hist[i];
    let wB = 0;
    let sumB = 0;
    let best = 0;
    let threshold = 128;
    for (let t = 0; t < 256; t += 1) {
      wB += hist[t];
      if (!wB) continue;
      const wF = total - wB;
      if (!wF) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > best) { best = between; threshold = t; }
    }
    let mean = sum / total;
    let variance = 0;
    for (let i = 0; i < 256; i += 1) variance += hist[i] * (i - mean) * (i - mean);
    variance /= total;
    // separabilidade normalizada: 1 = duas massas perfeitamente separadas
    const separability = variance ? best / (total * total) / variance : 0;
    return { threshold, separability };
  }

  // componentes conexos (4-vizinhos) de uma máscara, do maior para o menor
  function components(mask, W, H) {
    const seen = new Uint8Array(W * H);
    const stack = new Int32Array(W * H);
    const list = [];
    for (let start = 0; start < W * H; start += 1) {
      if (!mask[start] || seen[start]) continue;
      let sp = 0;
      let touch = 0;
      stack[sp++] = start;
      seen[start] = 1;
      const members = [];
      while (sp) {
        const p = stack[--sp];
        members.push(p);
        const x = p % W;
        const y = (p / W) | 0;
        if (x === 0 || y === 0 || x === W - 1 || y === H - 1) touch += 1;
        if (x > 0 && mask[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack[sp++] = p - 1; }
        if (x < W - 1 && mask[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack[sp++] = p + 1; }
        if (y > 0 && mask[p - W] && !seen[p - W]) { seen[p - W] = 1; stack[sp++] = p - W; }
        if (y < H - 1 && mask[p + W] && !seen[p + W]) { seen[p + W] = 1; stack[sp++] = p + W; }
      }
      list.push({ size: members.length, touch, members });
    }
    return list.sort((a, b) => b.size - a.size);
  }

  // contorno externo (Moore, sentido horário) de um componente
  function traceOutline(component, W, H) {
    const inside = new Uint8Array(W * H);
    component.members.forEach((p) => { inside[p] = 1; });
    const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && inside[y * W + x] === 1;
    const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    let sx = -1;
    let sy = -1;
    for (let i = 0; i < component.members.length; i += 1) {
      const p = component.members[i];
      const y = (p / W) | 0;
      const x = p % W;
      if (sy < 0 || y < sy || (y === sy && x < sx)) { sx = x; sy = y; }
    }
    const points = [[sx, sy]];
    let cx = sx;
    let cy = sy;
    let dir = 6;
    for (let steps = 0; steps < W * H * 4; steps += 1) {
      let moved = false;
      for (let k = 0; k < 8; k += 1) {
        const nd = (dir + 6 + k) % 8;
        const nx = cx + dirs[nd][0];
        const ny = cy + dirs[nd][1];
        if (at(nx, ny)) { cx = nx; cy = ny; dir = nd; moved = true; break; }
      }
      if (!moved) return null;
      if (cx === sx && cy === sy) break;
      points.push([cx, cy]);
    }
    if (points.length < 24) return null;
    // simplifica e suaviza (laço fechado)
    let pts = points.filter((_, i) => i % 2 === 0).map(([x, y]) => [(x + 0.5) / W, (y + 0.5) / H]);
    for (let pass = 0; pass < 3; pass += 1) {
      pts = pts.map((p, i) => {
        const a = pts[(i - 1 + pts.length) % pts.length];
        const b = pts[(i + 1) % pts.length];
        return [(a[0] + p[0] * 2 + b[0]) / 4, (a[1] + p[1] * 2 + b[1]) / 4];
      });
    }
    return pts;
  }

  function analyze(img, aspect = 0.75) {
    const W = 64;
    const H = Math.round(W / aspect);
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const nw = img.naturalWidth || W;
    const nh = img.naturalHeight || H;
    let sw = nw;
    let sh = nh;
    if (nw / nh > aspect) sw = nh * aspect; else sh = nw / aspect; // mesmo recorte do object-fit: cover
    ctx.drawImage(img, (nw - sw) / 2, (nh - sh) / 2, sw, sh, 0, 0, W, H);
    const data = ctx.getImageData(0, 0, W, H).data; // lança se o canvas estiver "sujo" (CORS)

    const lum = new Float32Array(W * H);
    const hist = new Uint32Array(256);
    const buckets = Array.from({ length: 18 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
    let cool = 0;
    let warm = 0;
    let satSum = 0;
    let lumSum = 0;
    for (let i = 0; i < W * H; i += 1) {
      const r = data[i * 4];
      const g = data[i * 4 + 1];
      const b = data[i * 4 + 2];
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lum[i] = y / 255;
      hist[Math.round(y)] += 1;
      lumSum += y / 255;
      const [h, s, v] = rgbToHsv(r, g, b);
      satSum += s;
      if (s > 0.22 && v > 0.2) {
        if (h >= 170 && h <= 265) cool += 1;
        if (h <= 45 || h >= 335) warm += s > 0.35 && v > 0.3 ? 1 : 0;
        const bucket = buckets[Math.floor(h / 20) % 18];
        const weight = s * v;
        bucket.w += weight; bucket.r += r * weight; bucket.g += g * weight; bucket.b += b * weight;
      }
    }
    const count = W * H;

    // textura: densidade de bordas (Sobel sobre a luminância)
    let edges = 0;
    for (let y = 1; y < H - 1; y += 1) {
      for (let x = 1; x < W - 1; x += 1) {
        const i = y * W + x;
        const gx = lum[i - W + 1] + 2 * lum[i + 1] + lum[i + W + 1] - lum[i - W - 1] - 2 * lum[i - 1] - lum[i + W - 1];
        const gy = lum[i + W - 1] + 2 * lum[i + W] + lum[i + W + 1] - lum[i - W - 1] - 2 * lum[i - W] - lum[i - W + 1];
        if (Math.hypot(gx, gy) > 0.7) edges += 1;
      }
    }
    const stats = {
      cool: cool / count,
      warm: warm / count,
      sat: satSum / count,
      lum: lumSum / count,
      edges: edges / ((W - 2) * (H - 2)),
      separability: 0,
      foreground: 0,
    };

    // paleta: três baldes de matiz mais pesados
    const ranked = buckets.filter((b) => b.w > 0).sort((a, b) => b.w - a.w).slice(0, 3);
    let palette = ranked.map((b) => {
      const [h, s] = rgbToHsv(b.r / b.w, b.g / b.w, b.b / b.w);
      return { h, s: clamp(Math.max(s, 0.65), 0, 1) };
    });
    if (!palette.length || ranked[0].w / count < 0.01) palette = [{ h: 42, s: 0.85 }, { h: 300, s: 0.6 }, { h: 200, s: 0.7 }];
    const accent = palette[0];

    // silhueta: duas massas bem separadas, a menor (sem colar na borda) é o "retrato"
    let contour = null;
    const { threshold, separability } = otsu(hist, count);
    stats.separability = separability;
    // zona cinzenta: pixels perto do limiar. Silhueta de verdade quase não tem; degradê e textura têm muitos.
    let nearThreshold = 0;
    for (let i = 0; i < count; i += 1) if (Math.abs(lum[i] - threshold / 255) < 0.1) nearThreshold += 1;
    stats.mid = nearThreshold / count;
    if (separability > 0.7 && stats.mid < 0.07) {
      const thr = threshold / 255;
      let best = null;
      [false, true].forEach((light) => {
        const mask = new Uint8Array(count);
        let classCount = 0;
        for (let i = 0; i < count; i += 1) { mask[i] = (lum[i] > thr) === light ? 1 : 0; classCount += mask[i]; }
        // peças relevantes: >= 1,5 % da imagem, no máximo 3 (cabeça + ombros, por exemplo)
        const pieces = components(mask, W, H).filter((c) => c.size >= count * 0.015).slice(0, 3);
        if (!pieces.length) return;
        const size = pieces.reduce((n, c) => n + c.size, 0);
        const touch = pieces.reduce((n, c) => n + c.touch, 0);
        const area = size / count;
        const border = touch / (2 * (W + H));
        if (size / classCount < 0.8) return; // a massa é feita dessas poucas peças, não de poeira
        if (area >= 0.08 && area <= 0.6 && border < 0.45 && (!best || border < best.border)) best = { pieces, area, border };
      });
      if (best) {
        stats.foreground = best.area;
        const loops = best.pieces.map((c) => traceOutline(c, W, H)).filter(Boolean);
        if (loops.length) contour = loops;
      }
    }

    let style = 'dust';
    if (contour) style = 'contour';
    else if (stats.cool > 0.38) style = 'rain';
    else if (stats.edges > 0.16 && stats.sat > 0.28) style = 'scales';
    else if (stats.warm > 0.3) style = 'embers';
    return { style, palette, accent, contour, stats };
  }

  // ---------- desenho ----------
  const painters = {
    rain(ctx, w, h, t, r) {
      const base = r.accent.h >= 170 && r.accent.h <= 265 ? r.accent.h : 205;
      const u = Math.min(w, h);
      ctx.globalCompositeOperation = 'lighter';
      // ondas: cada gota pinga num ponto novo a cada ciclo
      for (let i = 0; i < 14; i += 1) {
        const period = 2300 + ((i * 137) % 900);
        const shifted = t + i * 331;
        const cycle = Math.floor(shifted / period);
        const k = (shifted % period) / period;
        const x = (0.08 + 0.84 * hash(i, cycle, 1)) * w;
        const y = (0.12 + 0.82 * hash(i, cycle, 2)) * h;
        const radius = k * u * (0.1 + 0.12 * hash(i, cycle, 3));
        const alpha = Math.pow(1 - k, 1.6) * 0.75;
        ctx.lineWidth = 1.6;
        for (let ring = 0; ring < 2; ring += 1) {
          ctx.strokeStyle = hsl(base + ring * 14, 0.9, 0.72, alpha * (ring ? 0.5 : 1));
          ctx.beginPath();
          ctx.ellipse(x, y, radius * (1 - ring * 0.38), radius * (1 - ring * 0.38) * 0.42, 0, 0, TAU);
          ctx.stroke();
        }
      }
      // fios de chuva em diagonal
      ctx.lineCap = 'round';
      for (let i = 0; i < 26; i += 1) {
        const speed = 0.00022 + 0.00026 * hash(i, 0, 4);
        const k = fract(t * speed + hash(i, 0, 5));
        const x = (hash(i, 0, 6) * 1.15 - 0.05 + k * 0.1) * w;
        const y = (k * 1.3 - 0.15) * h;
        const len = (0.03 + 0.05 * hash(i, 0, 7)) * h;
        ctx.strokeStyle = hsl(base - 6, 0.85, 0.8, 0.22 + 0.2 * hash(i, 0, 8));
        ctx.lineWidth = 1 + hash(i, 0, 9);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len * 0.1, y + len);
        ctx.stroke();
      }
    },

    contour(ctx, w, h, t, r) {
      if (!r.cache || r.cache.w !== w || r.cache.h !== h) {
        r.cache = {
          w,
          h,
          loops: r.contour.map((loop) => {
            const pts = loop.map(([x, y]) => [x * w, y * h]);
            const cum = [0];
            for (let i = 1; i <= pts.length; i += 1) {
              const a = pts[i - 1];
              const b = pts[i % pts.length];
              cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
            }
            return { pts, cum, total: cum[cum.length - 1] };
          }),
        };
      }
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      r.cache.loops.forEach((loop, index) => {
        const { pts, cum, total } = loop;
        const at = (s) => {
          const d = ((s % total) + total) % total;
          let lo = 0;
          let hi = cum.length - 1;
          while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
          const a = pts[lo % pts.length];
          const b = pts[(lo + 1) % pts.length];
          const f = (d - cum[lo]) / ((cum[lo + 1] - cum[lo]) || 1);
          return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
        };
        // contorno em brasa, sempre aceso
        ctx.shadowBlur = 10;
        ctx.shadowColor = hsl(r.accent.h, 1, 0.6, 0.9);
        ctx.strokeStyle = hsl(r.accent.h, 0.95, 0.62, 0.5);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.stroke();
        // corredores: um na cor da capa e, na peça principal, outro na complementar em sentido oposto
        const runners = [{ hue: r.accent.h, dir: 1, offset: index * total * 0.37, speed: total / 6200, trail: 0.28, width: 6 }];
        if (index === 0) runners.push({ hue: r.accent.h + 150, dir: -1, offset: total * 0.5, speed: total / 8800, trail: 0.18, width: 4.5 });
        runners.forEach((run) => {
          const head = run.offset + run.dir * t * run.speed;
          const steps = 44;
          for (let i = 0; i < steps; i += 1) {
            const k0 = i / steps;
            const k1 = (i + 1) / steps;
            const p0 = at(head - run.dir * run.trail * total * (1 - k0));
            const p1 = at(head - run.dir * run.trail * total * (1 - k1));
            ctx.strokeStyle = hsl(run.hue, 1, 0.55 + 0.35 * k1, Math.pow(k1, 2.2));
            ctx.shadowColor = hsl(run.hue, 1, 0.6, 0.9);
            ctx.shadowBlur = 8 + 14 * k1;
            ctx.lineWidth = 1 + run.width * k1;
            ctx.beginPath();
            ctx.moveTo(p0[0], p0[1]);
            ctx.lineTo(p1[0], p1[1]);
            ctx.stroke();
          }
          const tip = at(head);
          ctx.fillStyle = hsl(run.hue, 1, 0.92, 0.95);
          ctx.beginPath();
          ctx.arc(tip[0], tip[1], run.width * 0.9, 0, TAU);
          ctx.fill();
        });
      });
      ctx.shadowBlur = 0;
    },

    scales(ctx, w, h, t, r) {
      const size = w / 9;
      const rowH = size * 0.52;
      const rows = Math.ceil(h / rowH) + 2;
      const cols = Math.ceil(w / size) + 2;
      const hue = r.accent.h;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 1.3;
      for (let row = -1; row < rows; row += 1) {
        const y = row * rowH;
        const shift = row % 2 ? size / 2 : 0;
        for (let col = -1; col < cols; col += 1) {
          const x = col * size + shift;
          // onda diagonal de brilho atravessando a pele
          const wave = Math.max(0, Math.sin((x * 0.8 + y * 1.2) / size - t * 0.0016 + hash(col, row, 1) * 0.6));
          const glow = Math.pow(wave, 3);
          const a = 0.07 + 0.6 * glow;
          const tint = hue + (hash(col, row, 2) - 0.5) * 24;
          ctx.strokeStyle = hsl(tint, 0.9, 0.6 + 0.2 * glow, a);
          ctx.beginPath();
          ctx.arc(x, y, size / 2, 0.08 * Math.PI, 0.92 * Math.PI);
          ctx.stroke();
          if (glow > 0.15) {
            ctx.fillStyle = hsl(tint, 0.9, 0.62, glow * 0.12);
            ctx.beginPath();
            ctx.arc(x, y, size / 2, 0, Math.PI);
            ctx.fill();
          }
        }
      }
    },

    embers(ctx, w, h, t, r) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 40; i += 1) {
        const period = 5200 + hash(i, 0, 1) * 4200;
        const k = fract((t + hash(i, 0, 2) * period) / period);
        const hue = (r.accent.h + (hash(i, 0, 3) - 0.5) * 36 + 360) % 360;
        const x = (hash(i, 0, 4) + Math.sin(k * 7 + i) * 0.035) * w;
        const y = (1.06 - k * 1.2) * h;
        const size = (1.2 + 2.8 * hash(i, 0, 5)) * (1 - k * 0.5);
        const alpha = Math.sin(Math.PI * k) * (0.55 + 0.4 * hash(i, 0, 6));
        ctx.fillStyle = hsl(hue, 1, 0.58, alpha * 0.22);
        ctx.beginPath();
        ctx.arc(x, y, size * 3.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = hsl(hue, 1, 0.8, alpha);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TAU);
        ctx.fill();
      }
    },

    dust(ctx, w, h, t, r) {
      ctx.globalCompositeOperation = 'lighter';
      // véu de aurora: faixa diagonal larga que respira nas cores da capa
      const phase = Math.sin(t * 0.00035) * 0.5 + 0.5;
      const grad = ctx.createLinearGradient(0, h * (0.2 + 0.3 * phase), w, h * (0.7 - 0.3 * phase));
      const p = r.palette;
      grad.addColorStop(0, hsl(p[0].h, 0.9, 0.55, 0));
      grad.addColorStop(0.4, hsl(p[0].h, 0.9, 0.58, 0.16));
      grad.addColorStop(0.7, hsl((p[1] || p[0]).h, 0.85, 0.6, 0.12));
      grad.addColorStop(1, hsl((p[2] || p[0]).h, 0.8, 0.55, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i += 1) {
        const period = 7000 + hash(i, 0, 1) * 6000;
        const k = fract((t + hash(i, 0, 2) * period) / period);
        const hue = p[i % p.length].h;
        const x = (hash(i, 0, 3) + Math.sin(k * TAU + i) * 0.02) * w;
        const y = (1 - k) * h * 1.05;
        const twinkle = 0.45 + 0.55 * Math.sin(t * 0.004 * (0.5 + hash(i, 0, 4)) + i);
        const size = 0.8 + 2.2 * hash(i, 0, 5);
        ctx.fillStyle = hsl(hue, 0.9, 0.82, Math.sin(Math.PI * k) * twinkle * 0.9);
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TAU);
        ctx.fill();
      }
    },
  };

  // ---------- controlador ----------
  function create(canvas, result, options = {}) {
    const ctx = canvas.getContext('2d');
    const quiet = options.quiet || (() => false);
    const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
    const frameMs = 1000 / 30;
    let raf = 0;
    let last = 0;
    let origin = 0;
    let visible = true;
    let width = 0;
    let height = 0;

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.round(box.width));
      height = Math.max(1, Math.round(box.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      result.cache = null;
    };

    const draw = (t) => {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      painters[result.style](ctx, width, height, t, result);
      ctx.restore();
    };

    const tick = (now) => {
      raf = 0;
      if (!visible || document.hidden || quiet() || reduced.matches) return;
      raf = requestAnimationFrame(tick);
      if (now - last < frameMs) return;
      last = now;
      draw(now - origin);
    };

    const sync = () => {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (quiet()) { ctx.clearRect(0, 0, width, height); return; }
      if (reduced.matches) { draw(3200); return; } // um quadro estático e bonito
      if (visible && !document.hidden) raf = requestAnimationFrame(tick);
    };

    resize();
    origin = performance.now();
    let observer = null;
    if ('ResizeObserver' in window) {
      observer = new ResizeObserver(() => { resize(); sync(); });
      observer.observe(canvas);
    }
    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(([entry]) => { visible = Boolean(entry?.isIntersecting); sync(); }, { threshold: 0.05 });
      io.observe(canvas);
    }
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('portfolio:mode', sync);
    if (reduced.addEventListener) reduced.addEventListener('change', sync);
    sync();

    return {
      redraw: sync,
      destroy() {
        if (raf) cancelAnimationFrame(raf);
        observer?.disconnect();
        io?.disconnect();
        document.removeEventListener('visibilitychange', sync);
        window.removeEventListener('portfolio:mode', sync);
        ctx.clearRect(0, 0, width, height);
      },
    };
  }

  window.PortfolioCoverFX = { analyze, create };
})();
