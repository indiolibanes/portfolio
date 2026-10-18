/**
 * Cidade medieval alemã, pintada à maneira dos fundos de "Sousou no Frieren":
 * céu limpo, colinas azuladas, casas de enxaimel e de pedra com telhado laranja,
 * hera, sacadas de madeira, bandeirolas, uma fonte e barracas de feira num
 * calçamento quente, com sombras arroxeadas. Sem contornos: manchas de cor,
 * degradês e um leve grão. Tudo gerado no build (PRNG de semente fixa), SVG puro.
 *
 * Luz: vem do alto à esquerda; as sombras caem para a direita no chão.
 * O chão onde a Sophia corre fica entre y = 440 e y = 500.
 */
import { type Pt, n1, rng, spline } from './sophia-draw.ts';

export const TOWN_W = 1200;
export const TOWN_H = 520;
const f = n1;

const jit = (r: () => number, v: number): number => (r() - 0.5) * 2 * v;
const pick = <T,>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length) % a.length];

export function townDefs(): string {
  return `<defs>
<linearGradient id="tw-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5fb0e8"/><stop offset=".55" stop-color="#9ccfee"/><stop offset="1" stop-color="#e6efe2"/></linearGradient>
<linearGradient id="tw-hill-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb4b8"/><stop offset="1" stop-color="#b9d0c2"/></linearGradient>
<linearGradient id="tw-hill-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c9a58"/><stop offset="1" stop-color="#9ab870"/></linearGradient>
<linearGradient id="tw-roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0704a"/><stop offset=".55" stop-color="#c85a3a"/><stop offset="1" stop-color="#9d4330"/></linearGradient>
<linearGradient id="tw-roof-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d98a70"/><stop offset="1" stop-color="#b87868"/></linearGradient>
<linearGradient id="tw-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9cfae"/><stop offset=".5" stop-color="#dcb88f"/><stop offset="1" stop-color="#c79a74"/></linearGradient>
<linearGradient id="tw-sun" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2c0" stop-opacity=".42"/><stop offset=".55" stop-color="#fff2c0" stop-opacity="0"/></linearGradient>
<linearGradient id="tw-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5e3a"/><stop offset="1" stop-color="#5a3b27"/></linearGradient>
<linearGradient id="tw-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fa1b6"/><stop offset=".5" stop-color="#3f4f60"/><stop offset="1" stop-color="#2a2e3a"/></linearGradient>
<linearGradient id="tw-stone" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e6dcc8"/><stop offset="1" stop-color="#b9a98f"/></linearGradient>
<linearGradient id="tw-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd8ec"/><stop offset="1" stop-color="#5aa0c0"/></linearGradient>
<radialGradient id="tw-cloud" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".6" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="tw-wobble" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter>
<filter id="tw-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
<filter id="tw-haze" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="1.6"/></filter>
<filter id="tw-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .28  0 0 0 0 .22  0 0 0 .55 -.2"/></filter>
</defs>`;
}

// ------------------------------------------------------------------ céu ----

function sky(): string {
  const r = rng(5);
  const clouds: string[] = [];
  const spots: [number, number, number][] = [[210, 70, 1], [520, 40, 0.8], [880, 84, 1.15], [1100, 38, 0.7], [700, 120, 0.6]];
  for (const [cx, cy, k] of spots) {
    for (let i = 0; i < 6; i += 1) {
      clouds.push(`<ellipse cx="${f(cx + jit(r, 70) * k)}" cy="${f(cy + jit(r, 10) * k)}" rx="${f((50 + r() * 50) * k)}" ry="${f((14 + r() * 12) * k)}" fill="url(#tw-cloud)"/>`);
    }
  }
  const birds = [[430, 120], [455, 104], [480, 126]].map(([x, y]) => `<path d="M${x - 7} ${y}Q${x - 3} ${y - 5} ${x} ${y}Q${x + 3} ${y - 5} ${x + 7} ${y}" fill="none" stroke="#3a4a5a" stroke-width="1.3" stroke-linecap="round"/>`).join('');
  return `<rect width="${TOWN_W}" height="360" fill="url(#tw-sky)"/><g class="town-clouds">${clouds.join('')}</g>${birds}`;
}

// -------------------------------------------------------------- colinas ----

function hills(): string {
  const r = rng(11);
  const a = `<path d="M0 262Q120 226 260 246T520 232T800 250T1010 226T1200 238V340H0Z" fill="url(#tw-hill-a)"/>`;
  const ridge = spline([[0, 292], [140, 268], [300, 284], [470, 270], [640, 290], [820, 272], [1000, 282], [1200, 262]], false, 8);
  const bPath = `M${ridge.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}V345H0Z`;
  const trees: string[] = [];
  for (let i = 0; i < 260; i += 1) {
    const x = r() * 1200;
    const base = ridge[Math.min(ridge.length - 1, Math.floor((x / 1200) * (ridge.length - 1)))][1];
    const y = base + r() * 46 - 6;
    const k = 7 + r() * 11;
    trees.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(k)}" ry="${f(k * 0.85)}" fill="${pick(r, ['#3f6d3a', '#4f7f3e', '#5e8c44', '#2f5a36', '#7aa24e'])}" opacity="${f(0.55 + r() * 0.4)}"/>`);
  }
  const rock = `<path d="M250 250Q290 226 330 240Q350 248 372 244" fill="none" stroke="#c9c4b0" stroke-width="3" opacity=".5" stroke-linecap="round"/>`;
  return `${a}${rock}<path d="${bPath}" fill="url(#tw-hill-b)"/><g>${trees.join('')}</g>`;
}

// ------------------------------------------- vila distante e campanário ----

function farTown(): string {
  const r = rng(21);
  const out: string[] = [];
  let x = 470;
  while (x < 700) {
    const w = 34 + r() * 30;
    const h = 22 + r() * 22;
    const base = 322 + r() * 6;
    out.push(`<path d="M${f(x)} ${f(base)}V${f(base - h)}H${f(x + w)}V${f(base)}Z" fill="${pick(r, ['#d9cdb8', '#cfc2b2', '#e0d4c0'])}"/>`);
    out.push(`<path d="M${f(x - 3)} ${f(base - h)}L${f(x + w / 2)} ${f(base - h - 14 - r() * 8)}L${f(x + w + 3)} ${f(base - h)}Z" fill="url(#tw-roof-far)"/>`);
    out.push(`<path d="M${f(x + 6)} ${f(base - h + 8)}h5v7h-5zM${f(x + w - 12)} ${f(base - h + 8)}h5v7h-5z" fill="#6a5a58" opacity=".6"/>`);
    x += w + 6 + r() * 8;
  }
  const tower = `<g>
<path d="M764 326V170H812V326Z" fill="#cdbfae"/>
<path d="M790 170H812V326H790Z" fill="#a89a8e" opacity=".55"/>
<path d="M764 232H812" stroke="#9a8c80" stroke-width="2"/>
<path d="M774 190Q774 180 782 180Q790 180 790 190V214H774Z" fill="#4b4048"/>
<path d="M774 252Q774 244 779 244Q784 244 784 252V268H774Z" fill="#4b4048"/>
<path d="M756 172L788 92L820 172Z" fill="#5b6479"/>
<path d="M788 92L820 172H800Z" fill="#454c5f"/>
<path d="M788 92V76M783 82H793" stroke="#b79a4a" stroke-width="2" stroke-linecap="round"/>
</g>`;
  return `<g filter="url(#tw-haze)" opacity=".92">${tower}${out.join('')}</g>`;
}

// --------------------------------------------------------- peças de casa ----

let gid = 0;

function windowArch(x: number, y: number, w: number, h: number, r: () => number, shutters: boolean): string {
  const cx = x + w / 2;
  const frame = '#efe2c8';
  const sh = shutters
    ? `<path d="M${f(x - w * 0.5)} ${f(y + 3)}h${f(w * 0.42)}v${f(h)}h${f(-w * 0.42)}Z" fill="${pick(r, ['#5d7f56', '#7a5236', '#4f6f58'])}"/><path d="M${f(x + w * 1.08)} ${f(y + 3)}h${f(w * 0.42)}v${f(h)}h${f(-w * 0.42)}Z" fill="${pick(r, ['#5d7f56', '#7a5236', '#4f6f58'])}" opacity=".85"/>`
    : '';
  return `${sh}<path d="M${f(x - 3)} ${f(y + h + 3)}V${f(y + w / 2)}Q${f(x - 3)} ${f(y - 3)} ${f(cx)} ${f(y - 3)}Q${f(x + w + 3)} ${f(y - 3)} ${f(x + w + 3)} ${f(y + w / 2)}V${f(y + h + 3)}Z" fill="${frame}"/>
<path d="M${f(x)} ${f(y + h)}V${f(y + w / 2)}Q${f(x)} ${f(y)} ${f(cx)} ${f(y)}Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + w / 2)}V${f(y + h)}Z" fill="url(#tw-glass)"/>
<path d="M${f(cx)} ${f(y)}V${f(y + h)}M${f(x)} ${f(y + h * 0.5)}H${f(x + w)}" stroke="#d9cbb0" stroke-width="1.6"/>
<path d="M${f(x + 3)} ${f(y + h * 0.4)}L${f(x + w * 0.55)} ${f(y + 4)}" stroke="#d9efff" stroke-width="1.4" opacity=".5"/>
<path d="M${f(x - 5)} ${f(y + h + 3)}h${f(w + 10)}v3h${f(-w - 10)}Z" fill="#cdbd9f"/>`;
}

/** Sacada de madeira com treliça em X, como a dos fundos do anime. */
function balcony(x: number, y: number, w: number): string {
  const posts: string[] = [];
  const n = Math.max(3, Math.round(w / 24));
  const step = w / n;
  let lattice = '';
  for (let i = 0; i < n; i += 1) {
    lattice += `M${f(x + i * step)} ${f(y - 22)}L${f(x + (i + 1) * step)} ${f(y)}M${f(x + (i + 1) * step)} ${f(y - 22)}L${f(x + i * step)} ${f(y)}`;
    posts.push(`<path d="M${f(x + i * step - 1.5)} ${f(y - 26)}h3v28h-3z" fill="#6b4630"/>`);
  }
  return `<g>
<path d="M${f(x - 6)} ${f(y)}h${f(w + 12)}v8h${f(-w - 12)}Z" fill="url(#tw-wood)"/>
<path d="M${f(x - 6)} ${f(y + 8)}h${f(w + 12)}v10h${f(-w - 12)}Z" fill="#3b2a20" opacity=".55"/>
<path d="${lattice}" stroke="#a97a50" stroke-width="2.2" fill="none"/>
${posts.join('')}
<path d="M${f(x - 6)} ${f(y - 26)}h${f(w + 12)}v4h${f(-w - 12)}Z" fill="#7a5236"/>
</g>`;
}

function ivy(x: number, y: number, w: number, h: number, r: () => number, count: number): string {
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const px = x + r() * w;
    const py = y + Math.pow(r(), 0.8) * h;
    const k = 3 + r() * 5;
    out.push(`<ellipse cx="${f(px)}" cy="${f(py)}" rx="${f(k * 1.3)}" ry="${f(k)}" fill="${pick(r, ['#5f8f2e', '#78a63c', '#8cba4a', '#4a7a30', '#a3c95a'])}" transform="rotate(${f(r() * 180)} ${f(px)} ${f(py)})"/>`);
  }
  return out.join('');
}

interface House {
  x: number;
  base: number;
  w: number;
  h: number;
  roofH: number;
  kind: 'timber' | 'stone' | 'plaster';
  tint: string;
  seed: number;
  rows: number;
  cols: number;
  balcony?: boolean;
  ivy?: [number, number, number, number, number];
  shutters?: boolean;
}

function house(o: House): string {
  const r = rng(o.seed);
  gid += 1;
  const g = `tw-h${gid}`;
  const top = o.base - o.h;
  const apex = top - o.roofH;
  const out: string[] = [];
  out.push(`<linearGradient id="${g}" x1="0" y1="0" x2="1" y2="0.2"><stop offset="0" stop-color="${o.tint}"/><stop offset=".6" stop-color="${o.tint}"/><stop offset="1" stop-color="#9a86a2"/></linearGradient>`);
  out.push(`<clipPath id="${g}c"><path d="M${f(o.x)} ${f(o.base)}V${f(top)}H${f(o.x + o.w)}V${f(o.base)}Z"/></clipPath>`);
  out.push(`<clipPath id="${g}r"><path d="M${f(o.x - 14)} ${f(top + 4)}L${f(o.x + o.w / 2)} ${f(apex)}L${f(o.x + o.w + 14)} ${f(top + 4)}Z"/></clipPath>`);
  // parede
  out.push(`<path d="M${f(o.x)} ${f(o.base)}V${f(top)}H${f(o.x + o.w)}V${f(o.base)}Z" fill="url(#${g})"/>`);
  const wash: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    wash.push(`<ellipse cx="${f(o.x + r() * o.w)}" cy="${f(top + r() * o.h)}" rx="${f(18 + r() * 40)}" ry="${f(8 + r() * 24)}" fill="${pick(r, ['#fff6e0', '#c9b79a', '#b59f86', '#f4e6c8'])}" opacity="${f(0.1 + r() * 0.16)}"/>`);
  }
  out.push(`<g clip-path="url(#${g}c)">${wash.join('')}`);
  if (o.kind !== 'timber') {
    const blocks: string[] = [];
    const lite: string[] = [];
    const dark: string[] = [];
    for (let y = top + 4; y < o.base; y += 12 + r() * 4) {
      let x = o.x - r() * 14;
      while (x < o.x + o.w) {
        const bw = 16 + r() * 22;
        const bh = 9 + r() * 4;
        (r() > 0.5 ? lite : dark).push(`M${f(x + 1)} ${f(y)}h${f(bw - 2)}v${f(bh)}h${f(-(bw - 2))}Z`);
        blocks.push(`M${f(x)} ${f(y + bh + 1)}h${f(bw)}`);
        x += bw;
      }
    }
    out.push(`<path d="${lite.join('')}" fill="#fff8e6" opacity=".2"/><path d="${dark.join('')}" fill="#7a6650" opacity=".14"/><path d="${blocks.join('')}" stroke="#8b765c" stroke-width=".8" opacity=".3" fill="none"/>`);
  }
  // sombra do beiral
  out.push(`<rect x="${f(o.x)}" y="${f(top)}" width="${f(o.w)}" height="16" fill="#5a4658" opacity=".32"/>`);
  out.push(`<rect x="${f(o.x + o.w - 14)}" y="${f(top)}" width="14" height="${f(o.h)}" fill="#5a4a6a" opacity=".16"/>`);
  out.push('</g>');
  // enxaimel
  if (o.kind === 'timber') {
    const beams: string[] = [];
    const rowH = o.h / o.rows;
    for (let i = 0; i <= o.rows; i += 1) beams.push(`M${f(o.x)} ${f(top + i * rowH - 3)}h${f(o.w)}v6h${f(-o.w)}Z`);
    const colW = o.w / o.cols;
    for (let c = 0; c <= o.cols; c += 1) beams.push(`M${f(o.x + c * colW - 3)} ${f(top)}h6v${f(o.h)}h-6Z`);
    for (let i = 0; i < o.rows; i += 1) {
      for (let c = 0; c < o.cols; c += 1) {
        if ((i + c) % 2 === 0) {
          const x0 = o.x + c * colW;
          const y0 = top + i * rowH;
          beams.push(`M${f(x0 + 3)} ${f(y0 + rowH - 3)}L${f(x0 + colW - 3)} ${f(y0 + 3)}`.replace(/^M(.*)$/, (m) => m));
        }
      }
    }
    const diag = beams.filter((b) => b.includes('L') && !b.includes('h')).join('');
    out.push(`<path d="${beams.filter((b) => b.includes('h')).join('')}" fill="#5e3f2a"/><path d="${diag}" stroke="#5e3f2a" stroke-width="5" fill="none" stroke-linecap="round"/>`);
    out.push(`<path d="${beams.filter((b) => b.includes('h')).join('')}" fill="none" stroke="#a87c52" stroke-width=".8" opacity=".5"/>`);
  }
  // janelas
  const wx = o.w / (o.cols + 0.0);
  for (let i = 0; i < o.rows; i += 1) {
    for (let c = 0; c < o.cols; c += 1) {
      if (o.kind === 'timber' && (i + c) % 2 === 0 && o.cols > 2) continue;
      const ww = Math.min(26, wx * 0.42);
      const wh = Math.min(40, (o.h / o.rows) * 0.5);
      const cx = o.x + (c + 0.5) * wx - ww / 2;
      const cy = top + i * (o.h / o.rows) + (o.h / o.rows) * 0.22;
      if (cy + wh > o.base - 14) continue;
      out.push(windowArch(cx, cy, ww, wh, r, !!o.shutters));
    }
  }
  // porta
  const dw = 30;
  const dx = o.x + o.w * (0.3 + r() * 0.3);
  out.push(`<path d="M${f(dx)} ${f(o.base)}V${f(o.base - 46)}Q${f(dx + dw / 2)} ${f(o.base - 62)} ${f(dx + dw)} ${f(o.base - 46)}V${f(o.base)}Z" fill="#5a3b27"/><path d="M${f(dx + 3)} ${f(o.base)}V${f(o.base - 44)}Q${f(dx + dw / 2)} ${f(o.base - 56)} ${f(dx + dw - 3)} ${f(o.base - 44)}V${f(o.base)}Z" fill="#8a5e3a"/><path d="M${f(dx + dw / 2)} ${f(o.base - 54)}V${f(o.base)}" stroke="#3b2a20" stroke-width="1.2"/>`);
  if (o.balcony) out.push(balcony(o.x + o.w * 0.18, top + o.h * 0.5, o.w * 0.64));
  if (o.ivy) out.push(ivy(o.ivy[0], o.ivy[1], o.ivy[2], o.ivy[3], r, o.ivy[4]));
  // telhado
  const rows: string[] = [];
  const tiles: string[] = [];
  for (let y = apex + 5; y < top + 4; y += 6) {
    rows.push(`M${f(o.x - 16)} ${f(y)}H${f(o.x + o.w + 16)}`);
    for (let x = o.x - 14 + ((y / 6) % 2) * 7; x < o.x + o.w + 14; x += 14) tiles.push(`M${f(x)} ${f(y)}v6`);
  }
  out.push(`<path d="M${f(o.x - 14)} ${f(top + 4)}L${f(o.x + o.w / 2)} ${f(apex)}L${f(o.x + o.w + 14)} ${f(top + 4)}Z" fill="url(#tw-roof)"/>`);
  out.push(`<g clip-path="url(#${g}r)"><path d="${rows.join('')}" stroke="#7a2f22" stroke-width="1" opacity=".35"/><path d="${tiles.join('')}" stroke="#7a2f22" stroke-width=".8" opacity=".25"/><path d="M${f(o.x - 14)} ${f(top + 4)}L${f(o.x + o.w / 2)} ${f(apex)}" stroke="#ffb28a" stroke-width="3" opacity=".5"/><path d="M${f(o.x + o.w / 2)} ${f(apex)}L${f(o.x + o.w + 14)} ${f(top + 4)}V${f(top + 8)}H${f(o.x + o.w / 2)}Z" fill="#6a3a5a" opacity=".22"/></g>`);
  out.push(`<path d="M${f(o.x - 14)} ${f(top + 4)}H${f(o.x + o.w + 14)}" stroke="#5a2a22" stroke-width="3" opacity=".6"/>`);
  // chaminé
  const chx = o.x + o.w * (0.62 + r() * 0.15);
  out.push(`<path d="M${f(chx)} ${f(apex + o.roofH * 0.4)}v-20h16v20z" fill="#cdbfae"/><path d="M${f(chx + 8)} ${f(apex + o.roofH * 0.4)}v-20h8v20z" fill="#9a8a82" opacity=".6"/><path d="M${f(chx - 2)} ${f(apex + o.roofH * 0.4 - 20)}h20v4h-20z" fill="#7a6a66"/>`);
  return `<g filter="url(#tw-wobble)">${out.join('')}</g>`;
}

// ------------------------------------------------------------ bandeirolas ----

function bunting(x1: number, y1: number, x2: number, y2: number, sag: number, seed: number): string {
  const r = rng(seed);
  const n = Math.max(6, Math.round(Math.hypot(x2 - x1, y2 - y1) / 22));
  const pt = (t: number): Pt => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t + Math.sin(Math.PI * t) * sag];
  let line = `M${f(x1)} ${f(y1)}`;
  const flags: string[] = [];
  for (let i = 1; i <= 40; i += 1) {
    const p = pt(i / 40);
    line += `L${f(p[0])} ${f(p[1])}`;
  }
  for (let i = 0; i < n; i += 1) {
    const a = pt((i + 0.15) / n);
    const b = pt((i + 0.75) / n);
    const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 14 + r() * 2];
    flags.push(`<path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}L${f(mid[0])} ${f(mid[1])}Z" fill="${i % 2 ? '#e6c24a' : '#5e9a4a'}"/>`);
  }
  return `<g class="town-bunting"><path d="${line}" stroke="#4a3a2e" stroke-width="1.2" fill="none"/>${flags.join('')}</g>`;
}

// ---------------------------------------------------------------- chão ----

function ground(): string {
  const r = rng(31);
  const stones = new Map<string, string[]>();
  const pal = ['#ecd5b4', '#e2c8a0', '#d8bb92', '#cfb08a', '#f0dec4', '#c9a681', '#c4a58e'];
  const N = 15;
  for (let i = 0; i < N; i += 1) {
    const t0 = Math.pow(i / N, 1.55);
    const t1 = Math.pow((i + 1) / N, 1.55);
    const y0 = 352 + t0 * 168;
    const y1 = 352 + t1 * 168;
    const sh = y1 - y0;
    const sw = 16 + t0 * 56;
    let x = -r() * sw;
    while (x < 1210) {
      const w = sw * (0.8 + r() * 0.6);
      const c = pick(r, pal);
      const p: Pt[] = [
        [x + 1.5 + jit(r, 1.5), y0 + 1 + jit(r, 1)], [x + w - 1.5 + jit(r, 1.5), y0 + 1 + jit(r, 1)],
        [x + w - 1 + jit(r, 2), y1 - 1 + jit(r, 1)], [x + 1 + jit(r, 2), y1 - 1 + jit(r, 1)],
      ];
      const k = `M${p.map((q) => `${f(q[0])} ${f(q[1])}`).join('L')}Z`;
      if (!stones.has(c)) stones.set(c, []);
      stones.get(c)!.push(k);
      x += w;
    }
    void sh;
  }
  const base = `<path d="M0 352H1200V520H0Z" fill="#9c7a5e"/>`;
  const paths = [...stones].map(([c, ds]) => `<path d="${ds.join('')}" fill="${c}"/>`).join('');
  // manchas de luz e de sombra
  const patches: string[] = [];
  for (let i = 0; i < 18; i += 1) {
    patches.push(`<ellipse cx="${f(r() * 1200)}" cy="${f(380 + r() * 130)}" rx="${f(60 + r() * 120)}" ry="${f(10 + r() * 26)}" fill="${r() > 0.55 ? '#fff2cc' : '#a07a6a'}" opacity="${f(0.1 + r() * 0.14)}" filter="url(#tw-soft)"/>`);
  }
  return `<g filter="url(#tw-wobble)">${base}${paths}</g><g>${patches.join('')}</g>`;
}

function castShadows(): string {
  return `<g filter="url(#tw-soft)" opacity=".4" fill="#7a5a86">
<path d="M-20 372L330 372L520 470L0 470Z"/>
<path d="M880 372L1220 372L1220 500L1010 500Z" opacity=".8"/>
<ellipse cx="640" cy="414" rx="96" ry="12"/>
<path d="M690 398H800L860 440H730Z" opacity=".8"/>
</g>`;
}

function grass(): string {
  const r = rng(41);
  const out: string[] = [];
  const clump = (cx: number, cy: number, n: number, h: number) => {
    for (let i = 0; i < n; i += 1) {
      const x = cx + jit(r, 26);
      const k = h * (0.5 + r() * 0.7);
      out.push(`<path d="M${f(x)} ${f(cy)}Q${f(x + jit(r, 5))} ${f(cy - k * 0.6)} ${f(x + jit(r, 8))} ${f(cy - k)}" stroke="${pick(r, ['#5f8f2e', '#78a63c', '#4a7a30', '#92b84a'])}" stroke-width="2" fill="none" stroke-linecap="round"/>`);
    }
  };
  for (const [x, y, n, h] of [[40, 505, 16, 20], [190, 516, 10, 14], [1120, 506, 18, 22], [980, 514, 8, 12], [330, 360, 8, 10], [920, 372, 8, 10], [520, 358, 6, 8]] as const) clump(x, y, n, h);
  // faixa de grama no canto, como no fundo do anime
  out.push(`<path d="M980 520Q1040 488 1120 498Q1180 492 1200 480V520Z" fill="#6f9a3a"/><path d="M0 520V504Q60 490 120 502Q170 498 210 520Z" fill="#76a23e"/>`);
  return out.join('');
}

// ----------------------------------------------------- fonte e barracas ----

function fountain(): string {
  const cx = 600;
  const base = 404;
  return `<g filter="url(#tw-wobble)">
<ellipse cx="${cx}" cy="${base + 4}" rx="92" ry="20" fill="#7a6a78" opacity=".5"/>
<path d="M${cx - 88} ${base - 8}Q${cx - 88} ${base + 14} ${cx} ${base + 18}Q${cx + 88} ${base + 14} ${cx + 88} ${base - 8}Z" fill="url(#tw-stone)"/>
<ellipse cx="${cx}" cy="${base - 8}" rx="88" ry="19" fill="#e9e0cd"/>
<ellipse cx="${cx}" cy="${base - 7}" rx="76" ry="15" fill="url(#tw-water)"/>
<path d="M${cx - 58} ${base - 6}Q${cx - 30} ${base - 14} ${cx - 6} ${base - 8}M${cx + 12} ${base - 4}Q${cx + 40} ${base - 12} ${cx + 62} ${base - 6}" stroke="#fff" stroke-width="1.6" fill="none" opacity=".6" stroke-linecap="round"/>
<path d="M${cx - 12} ${base - 10}V${base - 74}Q${cx - 12} ${base - 80} ${cx - 6} ${base - 80}H${cx + 6}Q${cx + 12} ${base - 80} ${cx + 12} ${base - 74}V${base - 10}Z" fill="url(#tw-stone)"/>
<path d="M${cx + 2} ${base - 80}H${cx + 12}V${base - 10}H${cx + 2}Z" fill="#a89a8e" opacity=".5"/>
<path d="M${cx - 30} ${base - 78}Q${cx - 28} ${base - 66} ${cx} ${base - 64}Q${cx + 28} ${base - 66} ${cx + 30} ${base - 78}Z" fill="#d9cfbb"/>
<ellipse cx="${cx}" cy="${base - 78}" rx="30" ry="6" fill="#efe7d6"/>
<path d="M${cx - 16} ${base - 98}Q${cx - 16} ${base - 108} ${cx} ${base - 110}Q${cx + 16} ${base - 108} ${cx + 16} ${base - 98}V${base - 82}H${cx - 16}Z" fill="#c8bcaa"/>
<circle cx="${cx}" cy="${base - 118}" r="9" fill="#cfc3b0"/>
<path d="M${cx - 5} ${base - 124}Q${cx} ${base - 130} ${cx + 5} ${base - 124}" stroke="#7a6a58" stroke-width="2" fill="none"/>
<path d="M${cx - 26} ${base - 76}Q${cx - 34} ${base - 50} ${cx - 44} ${base - 20}M${cx + 26} ${base - 76}Q${cx + 34} ${base - 50} ${cx + 44} ${base - 20}M${cx - 8} ${base - 100}Q${cx - 20} ${base - 70} ${cx - 24} ${base - 36}M${cx + 8} ${base - 100}Q${cx + 20} ${base - 70} ${cx + 24} ${base - 36}" stroke="#d6f0fb" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".85"/>
</g>`;
}

function stall(x: number, base: number, w: number, a: string, b: string, seed: number): string {
  const r = rng(seed);
  const h = 78;
  const stripes: string[] = [];
  const n = Math.round(w / 12);
  for (let i = 0; i < n; i += 1) {
    const x0 = x - 8 + (i * (w + 16)) / n;
    const x1 = x - 8 + ((i + 1) * (w + 16)) / n;
    stripes.push(`<path d="M${f(x0)} ${f(base - h - 20)}H${f(x1)}L${f(x1 + 2)} ${f(base - h + 6)}Q${f((x0 + x1) / 2 + 1)} ${f(base - h + 14)} ${f(x0 - 1)} ${f(base - h + 6)}Z" fill="${i % 2 ? a : b}"/>`);
  }
  const goods: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    goods.push(`<ellipse cx="${f(x + 8 + r() * (w - 16))}" cy="${f(base - 22 + r() * 6)}" rx="${f(3 + r() * 3)}" ry="${f(3 + r() * 2.4)}" fill="${pick(r, ['#c8553a', '#e0b050', '#7a4a32', '#9fb85a', '#d9d0c0', '#6a5a8a'])}"/>`);
  }
  return `<g filter="url(#tw-wobble)">
<path d="M${f(x)} ${f(base)}V${f(base - h)}M${f(x + w)} ${f(base)}V${f(base - h)}" stroke="#6a4630" stroke-width="4" stroke-linecap="round"/>
<path d="M${f(x - 4)} ${f(base - 30)}H${f(x + w + 4)}V${f(base - 8)}H${f(x - 4)}Z" fill="#8a5e3a"/>
<path d="M${f(x - 4)} ${f(base - 30)}H${f(x + w + 4)}V${f(base - 25)}H${f(x - 4)}Z" fill="#e8dcc0"/>
<path d="M${f(x - 4)} ${f(base - 8)}H${f(x + w + 4)}V${f(base - 4)}H${f(x - 4)}Z" fill="#3b2a20" opacity=".5"/>
${goods.join('')}
<path d="M${f(x - 8)} ${f(base - h - 20)}H${f(x + w + 8)}L${f(x + w + 10)} ${f(base - h + 6)}H${f(x - 10)}Z" fill="${a}" opacity="0"/>
${stripes.join('')}
<path d="M${f(x - 8)} ${f(base - h - 20)}H${f(x + w + 8)}V${f(base - h - 15)}H${f(x - 8)}Z" fill="#fff" opacity=".18"/>
</g>`;
}

function barrel(x: number, y: number): string {
  return `<g><path d="M${x - 11} ${y}Q${x - 14} ${y - 14} ${x - 11} ${y - 28}H${x + 11}Q${x + 14} ${y - 14} ${x + 11} ${y}Z" fill="#8a5e3a"/><path d="M${x - 12} ${y - 20}H${x + 12}M${x - 12} ${y - 8}H${x + 12}" stroke="#3b2a20" stroke-width="1.6"/><ellipse cx="${x}" cy="${y - 28}" rx="11" ry="3" fill="#a87c52"/><path d="M${x + 4} ${y}Q${x + 8} ${y - 14} ${x + 4} ${y - 28}H${x + 11}Q${x + 14} ${y - 14} ${x + 11} ${y}Z" fill="#3b2a20" opacity=".3"/></g>`;
}

function folk(x: number, y: number, k: number, cloth: string, hat: string, kind: 'villager' | 'knight' = 'villager'): string {
  const body = kind === 'knight' ? '#8e949f' : cloth;
  return `<g transform="translate(${x} ${y}) scale(${k})">
<ellipse cx="0" cy="1" rx="9" ry="2.4" fill="#4a3a58" opacity=".4"/>
<path d="M-6 0L-7 -22H7L6 0Z" fill="${kind === 'knight' ? '#6e7480' : '#4a3c34'}"/>
<path d="M-8 -22Q-9 -36 -4 -40H4Q9 -36 8 -22Z" fill="${body}"/>
<circle cx="0" cy="-45" r="5.4" fill="${kind === 'knight' ? '#aab0ba' : '#efd2b4'}"/>
<path d="M-5.6 -46Q0 -54 5.6 -46Z" fill="${hat}"/>
${kind === 'knight' ? '<path d="M10 -2L12 -46" stroke="#5a4636" stroke-width="1.6"/><path d="M12 -48l-3 7h6z" fill="#cfd4dc"/>' : ''}
</g>`;
}

// -------------------------------------------------------------- cena ----

export function townMarkup(): string {
  gid = 0;
  const houses = [
    house({ x: -40, base: 374, w: 300, h: 214, roofH: 96, kind: 'timber', tint: '#efdcc0', seed: 101, rows: 3, cols: 4, balcony: false, shutters: true }),
    house({ x: 258, base: 366, w: 196, h: 150, roofH: 62, kind: 'stone', tint: '#ead9bb', seed: 102, rows: 2, cols: 3, balcony: true, ivy: [262, 214, 60, 150, 70], shutters: true }),
    house({ x: 884, base: 372, w: 214, h: 196, roofH: 78, kind: 'plaster', tint: '#f0e6d2', seed: 103, rows: 3, cols: 3, balcony: true, ivy: [884, 176, 70, 190, 90], shutters: false }),
    house({ x: 1086, base: 368, w: 170, h: 176, roofH: 72, kind: 'timber', tint: '#e9c6c2', seed: 104, rows: 3, cols: 3, shutters: true }),
  ];
  return `<svg class="town" viewBox="0 0 ${TOWN_W} ${TOWN_H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
${townDefs()}
${sky()}
${hills()}
${farTown()}
${ground()}
${castShadows()}
${houses.join('\n')}
${bunting(230, 192, 452, 176, 34, 7)}
${bunting(454, 174, 884, 150, 48, 8)}
${bunting(1100, 160, 1200, 150, 12, 9)}
${fountain()}
${stall(690, 398, 100, '#e6c24a', '#f3dc8c', 61)}
${stall(806, 402, 84, '#4f8a4f', '#7db070', 62)}
${barrel(676, 404)}${barrel(900, 408)}
${folk(760, 400, 1.05, '#7a5a6a', '#4a3a2e')}
${folk(842, 408, 1.1, '#5a6a8a', '#cbbfa8')}
${folk(930, 414, 1.25, '#8e949f', '#8e949f', 'knight')}
${folk(515, 394, 1.0, '#b05a4a', '#e8dcc8')}
${grass()}
<rect width="${TOWN_W}" height="${TOWN_H}" fill="url(#tw-sun)"/>
<rect width="${TOWN_W}" height="${TOWN_H}" filter="url(#tw-grain)" opacity=".55"/>
</svg>`;
}
