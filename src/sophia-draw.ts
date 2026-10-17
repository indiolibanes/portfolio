/**
 * Ferramentas para as ilustrações vetoriais da Sophia (retrato e sala gamer).
 *
 * Tudo é determinístico: a "pelagem" nasce de um gerador pseudoaleatório com
 * semente fixa, então o mesmo build sempre produz o mesmo desenho. Nada aqui
 * depende de imagem; o resultado é SVG puro, gerado na hora do build.
 */

export type Pt = [number, number];

export const n1 = (v: number): string => String(Math.round(v * 10) / 10);

/** mulberry32: gerador pequeno, rápido e estável. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (r: () => number, lo: number, hi: number): number => lo + (hi - lo) * r();

/** Catmull-Rom: amostra uma curva suave que passa pelos pontos de controle. */
export function spline(pts: Pt[], closed = true, step = 5): Pt[] {
  const n = pts.length;
  const get = (i: number): Pt => {
    if (closed) return pts[((i % n) + n) % n];
    return pts[Math.max(0, Math.min(n - 1, i))];
  };
  const out: Pt[] = [];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i += 1) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.max(2, Math.round(len / step));
    for (let s = 0; s < steps; s += 1) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

/** Caminho (d) de uma polilinha densa. */
export function poly(pts: Pt[], closed = true): string {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${n1(p[0])} ${n1(p[1])}`).join('') + (closed ? 'Z' : '');
}

/** Forma suave por pontos de controle. */
export function smooth(pts: Pt[], closed = true): string {
  return poly(spline(pts, closed, 4), closed);
}

export function area(pts: Pt[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    s += x0 * y1 - x1 * y0;
  }
  return s / 2;
}

export function inside(p: Pt, pts: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export function bounds(pts: Pt[]): { x0: number; y0: number; x1: number; y1: number } {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

export interface TuftOptions {
  seed: number;
  /** comprimento mínimo e máximo de cada tufo */
  len: [number, number];
  /** largura da base */
  width: [number, number];
  /** distância média entre tufos ao longo do contorno */
  gap: number;
  /** curvatura lateral (px) e viés de direção (radianos, giro dos tufos) */
  bend?: number;
  lean?: number;
  /** só gera tufos onde isto devolver true (recebe o ponto e a normal) */
  where?: (p: Pt, normal: Pt) => boolean;
}

/** Tufos de pelo pontudos, saindo do contorno para fora. Devolve um único `d`. */
export function tufts(outline: Pt[], o: TuftOptions): string {
  const r = rng(o.seed);
  const sign = Math.sign(area(outline)) || 1;
  const parts: string[] = [];
  let travelled = 0;
  let next = between(r, 0, o.gap);
  for (let i = 0; i < outline.length; i += 1) {
    const a = outline[i];
    const b = outline[(i + 1) % outline.length];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    travelled += seg;
    if (travelled < next) continue;
    next = travelled + between(r, o.gap * 0.55, o.gap * 1.45);
    const tx = (b[0] - a[0]) / (seg || 1);
    const ty = (b[1] - a[1]) / (seg || 1);
    // normal para fora (a orientação do polígono decide o lado)
    let nx = ty * sign;
    let ny = -tx * sign;
    if (o.where && !o.where(a, [nx, ny])) continue;
    const lean = (o.lean ?? 0) + between(r, -0.35, 0.35);
    const cs = Math.cos(lean);
    const sn = Math.sin(lean);
    [nx, ny] = [nx * cs - ny * sn, nx * sn + ny * cs];
    const len = between(r, o.len[0], o.len[1]);
    const w = between(r, o.width[0], o.width[1]);
    const bend = (o.bend ?? 0) * between(r, -1, 1);
    const tip: Pt = [a[0] + nx * len + tx * bend, a[1] + ny * len + ty * bend];
    const base1: Pt = [a[0] - tx * w * 0.5 - nx * 2, a[1] - ty * w * 0.5 - ny * 2];
    const base2: Pt = [a[0] + tx * w * 0.5 - nx * 2, a[1] + ty * w * 0.5 - ny * 2];
    // controles convexos: o tufo vira uma folha arredondada, não uma agulha
    const c1: Pt = [a[0] - tx * w * 0.7 + nx * len * 0.5 + tx * bend * 0.2, a[1] - ty * w * 0.7 + ny * len * 0.5 + ty * bend * 0.2];
    const c2: Pt = [a[0] + tx * w * 0.7 + nx * len * 0.5 + tx * bend * 0.8, a[1] + ty * w * 0.7 + ny * len * 0.5 + ty * bend * 0.8];
    parts.push(`M${n1(base1[0])} ${n1(base1[1])}Q${n1(c1[0])} ${n1(c1[1])} ${n1(tip[0])} ${n1(tip[1])}Q${n1(c2[0])} ${n1(c2[1])} ${n1(base2[0])} ${n1(base2[1])}Z`);
  }
  return parts.join('');
}

export interface StrandOptions {
  seed: number;
  count: number;
  /** centro de onde a pelagem "nasce"; os fios se afastam dele */
  from: Pt;
  len: [number, number];
  /** ângulo extra (rad) somado à direção radial */
  twist?: number;
  jitter?: number;
}

/** Fios finos dentro de uma forma, seguindo o fluxo da pelagem. Devolve um `d` de linhas curvas. */
export function strands(shape: Pt[], o: StrandOptions): string {
  const r = rng(o.seed);
  const bb = bounds(shape);
  const parts: string[] = [];
  let guard = 0;
  while (parts.length < o.count && guard < o.count * 30) {
    guard += 1;
    const p: Pt = [between(r, bb.x0, bb.x1), between(r, bb.y0, bb.y1)];
    if (!inside(p, shape)) continue;
    const ang = Math.atan2(p[1] - o.from[1], p[0] - o.from[0]) + (o.twist ?? 0) + between(r, -(o.jitter ?? 0.3), o.jitter ?? 0.3);
    const len = between(r, o.len[0], o.len[1]);
    const ex = p[0] + Math.cos(ang) * len;
    const ey = p[1] + Math.sin(ang) * len;
    const cx = p[0] + Math.cos(ang + 0.35) * len * 0.55;
    const cy = p[1] + Math.sin(ang + 0.35) * len * 0.55;
    parts.push(`M${n1(p[0])} ${n1(p[1])}Q${n1(cx)} ${n1(cy)} ${n1(ex)} ${n1(ey)}`);
  }
  return parts.join('');
}

/** Mecha de pelo: folha curva, base larga e ponta fina. `ang` em graus (0 = +x, 90 = para baixo). */
export type LockSpec = [x: number, y: number, ang: number, len: number, w: number, curl?: number];

export function lock(x: number, y: number, ang: number, len: number, w: number, curl = 0.15): string {
  const a = (ang * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const nx = -dy;
  const ny = dx;
  const k = curl * len;
  const P = (px: number, py: number) => `${n1(px)} ${n1(py)}`;
  const tipX = x + dx * len + nx * k;
  const tipY = y + dy * len + ny * k;
  return (
    `M${P(x - (nx * w) / 2, y - (ny * w) / 2)}` +
    `Q${P(x - nx * w * 0.7 + dx * len * 0.55 + nx * k * 0.3, y - ny * w * 0.7 + dy * len * 0.55 + ny * k * 0.3)} ${P(tipX, tipY)}` +
    `Q${P(x + nx * w * 0.7 + dx * len * 0.5 + nx * k * 0.9, y + ny * w * 0.7 + dy * len * 0.5 + ny * k * 0.9)} ${P(x + (nx * w) / 2, y + (ny * w) / 2)}Z`
  );
}

/** Várias mechas num `d` só; `grow` engorda cada uma (para a camada de sombra por trás). */
export function locks(list: LockSpec[], grow = 0): string {
  return list.map(([x, y, a, l, w, c]) => lock(x, y, a, l + grow, w + grow, c)).join('');
}

/** Espelha mechas no eixo vertical x = axis. */
export function mirrorLocks(list: LockSpec[], axis: number): LockSpec[] {
  return list.map(([x, y, a, l, w, c]) => [2 * axis - x, y, 180 - a, l, w, -(c ?? 0.15)] as LockSpec);
}

/** Estrela de quatro pontas côncava (a marca de Sophia). */
export function star4(cx: number, cy: number, rv: number, rh: number, pinch = 0.2): string {
  const q = (a: number, b: number) => `${n1(a)} ${n1(b)}`;
  return (
    `M${q(cx, cy - rv)}Q${q(cx + rh * pinch, cy - rv * pinch)} ${q(cx + rh, cy)}` +
    `Q${q(cx + rh * pinch, cy + rv * pinch)} ${q(cx, cy + rv)}` +
    `Q${q(cx - rh * pinch, cy + rv * pinch)} ${q(cx - rh, cy)}` +
    `Q${q(cx - rh * pinch, cy - rv * pinch)} ${q(cx, cy - rv)}Z`
  );
}

/** Homografia: mapeia o plano (0..1, 0..1) para um quadrilátero qualquer da tela. */
export function homography(q: [Pt, Pt, Pt, Pt]): (u: number, v: number) => Pt {
  // q = [topo-esq, topo-dir, base-dir, base-esq]
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  return (u, v): Pt => {
    const w = g * u + h * v + 1;
    return [(a * u + b * v + x0) / w, (d * u + e * v + y0) / w];
  };
}

/** Contorno de um membro: segue uma linha central com largura variável (interpolada). */
export function limb(center: Pt[], widths: number[], step = 5): Pt[] {
  const c = spline(center, false, step);
  const n = c.length;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < n; i += 1) {
    const a = c[Math.max(0, i - 1)];
    const b = c[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / len;
    const ny = (b[0] - a[0]) / len;
    const f = (i / (n - 1)) * (widths.length - 1);
    const k = Math.min(widths.length - 2, Math.floor(f));
    const w = (widths[k] + (widths[k + 1] - widths[k]) * (f - k)) / 2;
    left.push([c[i][0] + nx * w, c[i][1] + ny * w]);
    right.push([c[i][0] - nx * w, c[i][1] - ny * w]);
  }
  return [...left, ...right.reverse()];
}

/** Ponto sobre uma polilinha amostrada, na fração t (0..1). */
export function along(pts: Pt[], t: number): Pt {
  const i = Math.max(0, Math.min(pts.length - 1, Math.round(t * (pts.length - 1))));
  return pts[i];
}
