/**
 * A parede do outro lado da sala: mesa com vários monitores, prateleira,
 * poster e um rack cheio de equipamentos. Tudo é desenhado num plano local de
 * 600×360 e projetado em perspectiva (homografia) sobre a parede da direita.
 */
import { type Pt, homography, n1, rng } from './sophia-draw.ts';
import { WALL_QUAD } from './sophia-lounge-room.ts';

const LW = 600;
const LH = 360;
const DESK_Y = 262;
const f = (p: Pt): string => `${n1(p[0])} ${n1(p[1])}`;

class Wall {
  private m = homography(WALL_QUAD);
  p(x: number, y: number): Pt {
    return this.m(x / LW, y / LH);
  }
  d(x: number, y: number, w: number, h: number): string {
    return `M${f(this.p(x, y))}L${f(this.p(x + w, y))}L${f(this.p(x + w, y + h))}L${f(this.p(x, y + h))}Z`;
  }
  pl(pts: Pt[], close = true): string {
    return pts.map((q, i) => `${i ? 'L' : 'M'}${f(this.p(q[0], q[1]))}`).join('') + (close ? 'Z' : '');
  }
  ell(cx: number, cy: number, rx: number, ry: number, n = 14): string {
    const pts: Pt[] = [];
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    return this.pl(pts);
  }
  /** Curva quadrática com pontos de controle projetados. */
  q(a: Pt, c: Pt, b: Pt): string {
    return `M${f(this.p(a[0], a[1]))}Q${f(this.p(c[0], c[1]))} ${f(this.p(b[0], b[1]))}`;
  }
  /** Tamanho vertical, em px de tela, de h px locais perto de (x,y). */
  sy(x: number, y: number, h: number): number {
    return Math.abs(this.p(x, y + h)[1] - this.p(x, y)[1]);
  }
}

/** Acumula retângulos por cor para gerar poucos <path>. */
class Batch {
  private m = new Map<string, string[]>();
  add(fill: string, d: string): void {
    if (!this.m.has(fill)) this.m.set(fill, []);
    this.m.get(fill)!.push(d);
  }
  out(extra = ''): string {
    return [...this.m].map(([fill, ds]) => `<path fill="${fill}" d="${ds.join('')}"${extra}/>`).join('');
  }
}

export function wallDefs(): string {
  return `
<linearGradient id="slo-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0a3d"/><stop offset=".5" stop-color="#7a1f8f"/><stop offset=".85" stop-color="#ff4f8b"/><stop offset="1" stop-color="#ffb36b"/></linearGradient>
<linearGradient id="slo-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff08a"/><stop offset="1" stop-color="#ff5f9a"/></linearGradient>
<linearGradient id="slo-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0b4a"/><stop offset="1" stop-color="#0c0420"/></linearGradient>
<linearGradient id="slo-gfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#36e0ff" stop-opacity=".45"/><stop offset="1" stop-color="#36e0ff" stop-opacity="0"/></linearGradient>
<linearGradient id="slo-gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="slo-unit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2e3b"/><stop offset=".15" stop-color="#1b1e28"/><stop offset="1" stop-color="#0f1118"/></linearGradient>
<linearGradient id="slo-deskwood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a4328"/><stop offset="1" stop-color="#2e1b10"/></linearGradient>
<linearGradient id="slo-rgb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff3fb4"/><stop offset=".33" stop-color="#ffd23f"/><stop offset=".66" stop-color="#36e0ff"/><stop offset="1" stop-color="#8a5bff"/></linearGradient>`;
}

interface Mon {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'game' | 'code' | 'graph' | 'chat' | 'cams' | 'dash' | 'spectrum';
  tint: string;
  arm?: boolean;
  seed: number;
}

const MONITORS: Mon[] = [
  { x: 20, y: 150, w: 46, h: 100, kind: 'chat', tint: '#4d7cff', seed: 1 },
  { x: 78, y: 176, w: 162, h: 74, kind: 'game', tint: '#ff4fa8', seed: 2 },
  { x: 252, y: 186, w: 100, h: 64, kind: 'code', tint: '#6a8bff', seed: 3 },
  { x: 364, y: 200, w: 64, h: 50, kind: 'graph', tint: '#36e0ff', seed: 4 },
  { x: 40, y: 84, w: 100, h: 56, kind: 'cams', tint: '#6bd0ff', arm: true, seed: 5 },
  { x: 152, y: 74, w: 116, h: 66, kind: 'dash', tint: '#7a8bff', arm: true, seed: 6 },
  { x: 280, y: 84, w: 100, h: 56, kind: 'spectrum', tint: '#ff7ad9', arm: true, seed: 7 },
];

function screenContent(W: Wall, m: Mon, sx: number, sy: number, sw: number, sh: number): string {
  const r = rng(m.seed * 101);
  const out: string[] = [];
  const b = new Batch();
  switch (m.kind) {
    case 'game': {
      const hy = sy + sh * 0.58;
      const cx = sx + sw * 0.5;
      out.push(`<path d="${W.d(sx, sy, sw, sh * 0.58)}" fill="url(#slo-sky)"/>`);
      out.push(`<path d="${W.ell(cx, sy + sh * 0.5, sh * 0.2, sh * 0.2, 18)}" fill="url(#slo-sun)"/>`);
      const mt: Pt[] = [[sx, hy], [sx, hy - sh * 0.1], [sx + sw * 0.12, hy - sh * 0.2], [sx + sw * 0.22, hy - sh * 0.08], [sx + sw * 0.3, hy - sh * 0.16], [sx + sw * 0.38, hy], [sx + sw * 0.62, hy], [sx + sw * 0.7, hy - sh * 0.14], [sx + sw * 0.8, hy - sh * 0.26], [sx + sw * 0.92, hy - sh * 0.1], [sx + sw, hy - sh * 0.18], [sx + sw, hy]];
      out.push(`<path d="${W.pl(mt)}" fill="#240a45"/>`);
      out.push(`<path d="${W.d(sx, hy, sw, sh * 0.42)}" fill="url(#slo-ground)"/>`);
      const lines: string[] = [];
      for (let i = -7; i <= 7; i += 1) lines.push(`M${f(W.p(cx + i * sw * 0.018, hy))}L${f(W.p(cx + i * sw * 0.13, sy + sh))}`);
      for (const t of [0.07, 0.16, 0.3, 0.5, 0.78]) lines.push(`M${f(W.p(sx, hy + t * sh * 0.42))}L${f(W.p(sx + sw, hy + t * sh * 0.42))}`);
      out.push(`<path d="${lines.join('')}" stroke="#ff4fd8" stroke-width=".9" fill="none" opacity=".85"/>`);
      out.push(`<path d="${W.pl([[cx - sw * 0.02, hy], [cx + sw * 0.02, hy], [cx + sw * 0.09, sy + sh], [cx - sw * 0.09, sy + sh]])}" fill="#0a0420" opacity=".8"/>`);
      b.add('#ffe35a', W.d(cx - 1, hy + sh * 0.1, 2, sh * 0.05) + W.d(cx - 1.6, hy + sh * 0.22, 3.2, sh * 0.08));
      // carro
      out.push(`<path d="${W.pl([[cx - sw * 0.07, sy + sh * 0.9], [cx - sw * 0.055, sy + sh * 0.8], [cx + sw * 0.055, sy + sh * 0.8], [cx + sw * 0.07, sy + sh * 0.9]])}" fill="#161020"/>`);
      b.add('#ff3b4a', W.d(cx - sw * 0.06, sy + sh * 0.85, sw * 0.03, sh * 0.03) + W.d(cx + sw * 0.03, sy + sh * 0.85, sw * 0.03, sh * 0.03));
      // HUD
      b.add('#36e0ff', W.d(sx + 4, sy + 4, sw * 0.22, 2.4));
      b.add('#ffffff', W.d(sx + sw - 22, sy + 4, 16, 8));
      b.add('#ff4fd8', W.d(sx + sw - 20, sy + 6, 4, 4));
      break;
    }
    case 'code': {
      const rows = Math.floor(sh / 5);
      const pitch = sh / rows;
      const cols = ['#7aa2f7', '#bb9af7', '#9ece6a', '#e0af68', '#c0caf5', '#f7768e', '#7dcfff'];
      // duas cópias idênticas (mesma semente) para o rolo ser contínuo
      const copy = (oy: number): string => {
        const rr = rng(m.seed * 7);
        const cb = new Batch();
        for (let i = 0; i < rows; i += 1) {
          const y = sy + 2 + i * pitch + oy;
          cb.add('#4a5174', W.d(sx + 3, y, 5, 2.2));
          let x = sx + 12 + Math.floor(rr() * 3) * 6;
          const nt = 2 + Math.floor(rr() * 4);
          for (let t = 0; t < nt; t += 1) {
            const w = 4 + rr() * 16;
            if (x + w > sx + sw - 3) break;
            cb.add(cols[Math.floor(rr() * cols.length)], W.d(x, y, w, 2.2));
            x += w + 3;
          }
        }
        return cb.out();
      };
      out.push(`<path d="${W.d(sx, sy, sw, sh)}" fill="#0e1424"/>`);
      out.push(`<path d="${W.d(sx, sy + sh * 0.4, sw, 5)}" fill="#1a2240"/>`);
      out.push(`<g class="slo-scroll" style="--dy:${n1(W.sy(sx, sy, sh))}px">${copy(0)}${copy(sh)}</g>`);
      break;
    }
    case 'graph': {
      const g: string[] = [];
      for (let i = 1; i < 5; i += 1) g.push(`M${f(W.p(sx, sy + (sh * i) / 5))}L${f(W.p(sx + sw, sy + (sh * i) / 5))}`);
      for (let i = 1; i < 6; i += 1) g.push(`M${f(W.p(sx + (sw * i) / 6, sy))}L${f(W.p(sx + (sw * i) / 6, sy + sh))}`);
      out.push(`<path d="${W.d(sx, sy, sw, sh)}" fill="#0b1220"/><path d="${g.join('')}" stroke="#1d3350" stroke-width=".7" fill="none"/>`);
      const s1: Pt[] = [];
      const s2: Pt[] = [];
      for (let i = 0; i <= 20; i += 1) {
        const t = i / 20;
        s1.push([sx + 3 + t * (sw - 6), sy + sh * (0.5 - 0.28 * Math.sin(t * 7) * (0.6 + t * 0.6) - 0.08 * Math.sin(t * 19))]);
        s2.push([sx + 3 + t * (sw - 6), sy + sh * (0.62 + 0.16 * Math.sin(t * 5 + 1))]);
      }
      out.push(`<path d="${W.pl([...s1, [sx + sw - 3, sy + sh - 3], [sx + 3, sy + sh - 3]])}" fill="url(#slo-gfill)"/>`);
      out.push(`<path d="${W.pl(s1, false)}" stroke="#36e0ff" stroke-width="1.2" fill="none"/><path d="${W.pl(s2, false)}" stroke="#ff4fd8" stroke-width=".9" fill="none" opacity=".9"/>`);
      b.add('#ffffff', W.ell(s1[14][0], s1[14][1], 1.8, 1.8, 8));
      break;
    }
    case 'chat': {
      out.push(`<path d="${W.d(sx, sy, sw, sh)}" fill="#0e1322"/><path d="${W.d(sx, sy, sw, 8)}" fill="#18203a"/>`);
      let y = sy + 12;
      let i = 0;
      while (y < sy + sh - 14) {
        const mine = i % 3 === 1;
        const w = sw * (0.4 + r() * 0.32);
        const h = 5 + r() * 6;
        b.add(mine ? '#3a6bff' : '#2a3150', W.d(mine ? sx + sw - 4 - w : sx + 4, y, w, h));
        if (!mine) b.add('#7dcfff', W.ell(sx + 3, y + h / 2, 1.6, 1.6, 6));
        y += h + 4;
        i += 1;
      }
      b.add('#1d2644', W.d(sx + 3, sy + sh - 9, sw - 6, 6));
      break;
    }
    case 'cams': {
      const tw = (sw - 6) / 2;
      const th = (sh - 6) / 2;
      const tints = ['#16324a', '#2a1d46', '#17382e', '#3a2a1a'];
      for (let k = 0; k < 4; k += 1) {
        const tx = sx + 2 + (k % 2) * (tw + 2);
        const ty = sy + 2 + Math.floor(k / 2) * (th + 2);
        b.add(tints[k], W.d(tx, ty, tw, th));
        b.add('#0a0d14', W.ell(tx + tw * 0.5, ty + th * 0.42, th * 0.2, th * 0.2, 8) + W.ell(tx + tw * 0.5, ty + th + 2, tw * 0.3, th * 0.38, 10));
        b.add('#d4dcff', W.d(tx + 2, ty + th - 3, tw * 0.3, 1.2));
      }
      out.push(`<path d="${W.ell(sx + 6, sy + 6, 1.8, 1.8, 6)}" fill="#ff3b4a" class="slo-rec"/>`);
      break;
    }
    case 'dash': {
      out.push(`<path d="${W.d(sx, sy, sw, sh)}" fill="#0c1124"/>`);
      const cw = (sw - 8) / 3;
      for (let k = 0; k < 3; k += 1) {
        const tx = sx + 2 + k * (cw + 2);
        b.add('#151d3a', W.d(tx, sy + 2, cw, sh * 0.26));
        b.add(['#36e0ff', '#ff4fd8', '#ffd23f'][k], W.d(tx + 2, sy + 4, cw * 0.5, 2.2));
        b.add('#c8d2ff', W.d(tx + 2, sy + 8, cw * 0.7, 3));
      }
      const ring: Pt[] = [];
      for (let i = 0; i <= 16; i += 1) {
        const a = -Math.PI / 2 + (i / 16) * Math.PI * 1.45;
        ring.push([sx + sw * 0.22 + Math.cos(a) * sh * 0.2, sy + sh * 0.64 + Math.sin(a) * sh * 0.2]);
      }
      out.push(`<path d="${W.ell(sx + sw * 0.22, sy + sh * 0.64, sh * 0.2, sh * 0.2, 16)}" stroke="#1d2850" stroke-width="3" fill="none"/>`);
      out.push(`<path d="${W.pl(ring, false)}" stroke="#36e0ff" stroke-width="3" fill="none"/>`);
      for (let k = 0; k < 7; k += 1) {
        const bh = sh * (0.12 + r() * 0.34);
        b.add(k % 2 ? '#7a8bff' : '#a78bff', W.d(sx + sw * 0.46 + k * (sw * 0.075), sy + sh - 3 - bh, sw * 0.05, bh));
      }
      break;
    }
    case 'spectrum': {
      out.push(`<path d="${W.d(sx, sy, sw, sh)}" fill="#0d0a1f"/>`);
      const n = 18;
      const bw = (sw - 8) / n;
      for (let k = 0; k < n; k += 1) {
        const bh = sh * (0.18 + 0.7 * Math.abs(Math.sin(k * 0.7 + 1)) * (0.5 + r() * 0.5));
        const hue = ['#36e0ff', '#6a8bff', '#a78bff', '#ff4fd8', '#ffd23f'][Math.floor((k / n) * 5)];
        out.push(`<path class="slo-eq" style="animation-delay:${n1(r() * 1.4)}s;animation-duration:${n1(0.7 + r() * 0.9)}s" fill="${hue}" d="${W.d(sx + 4 + k * bw, sy + sh - 3 - bh, bw * 0.7, bh)}"/>`);
      }
      break;
    }
  }
  return out.join('') + b.out();
}

/** Um monitor: brilho, suporte, moldura e tela. Devolve [brilho, corpo]. */
function monitor(W: Wall, m: Mon, idx: number): [string, string] {
  const glow = `<path d="${W.d(m.x - 8, m.y - 8, m.w + 16, m.h + 16)}" fill="${m.tint}" opacity=".55"/>`;
  const inset = 3;
  const sx = m.x + inset;
  const sy = m.y + inset;
  const sw = m.w - inset * 2;
  const sh = m.h - inset * 2;
  const stand = m.arm
    ? `<path d="${W.d(m.x + m.w / 2 - 2.5, 62, 5, m.y - 62)}" fill="#12141c"/><path d="${W.d(m.x + m.w / 2 - 9, m.y + m.h - 1, 18, 4)}" fill="#0b0c12"/>`
    : `<path d="${W.d(m.x + m.w / 2 - 3, m.y + m.h, 6, DESK_Y - (m.y + m.h))}" fill="#14161e"/><path d="${W.ell(m.x + m.w / 2, DESK_Y - 1.5, Math.min(26, m.w * 0.3), 3.2)}" fill="#0d0e14"/>`;
  const clip = `slo-scr-${idx}`;
  const body = `${stand}
<path d="${W.d(m.x, m.y, m.w, m.h)}" fill="#08090e" stroke="#2c3042" stroke-width=".9"/>
<clipPath id="${clip}"><path d="${W.d(sx, sy, sw, sh)}"/></clipPath>
<g clip-path="url(#${clip})" class="slo-screen">${screenContent(W, m, sx, sy, sw, sh)}<path d="${W.pl([[sx, sy], [sx + sw * 0.7, sy], [sx, sy + sh * 0.9]])}" fill="url(#slo-gloss)"/></g>
<path d="${W.ell(m.x + m.w / 2, m.y + m.h - 1.5, 1, 1, 6)}" fill="#7dffb0" class="slo-led slo-led-b"/>`;
  return [glow, body];
}

// ------------------------------------------------------------------ rack ---

const RX = 452;
const RW = 126;
const UX = RX + 8;
const UW = RW - 16;

function rack(W: Wall): string {
  const b = new Batch();
  const out: string[] = [];
  const r = rng(77);
  const U = 14;
  let y = 44;
  const led = (x: number, yy: number, color: string, cls: string): void => {
    out.push(`<path class="slo-led ${cls}" fill="${color}" d="${W.d(x, yy, 2.2, 2.2)}"/>`);
  };
  const unit = (h: number, label?: string): number => {
    const top = y;
    out.push(`<path d="${W.d(UX, top, UW, h - 0.8)}" fill="url(#slo-unit)"/>`);
    b.add('#07080c', W.d(UX, top + h - 0.8, UW, 0.8));
    // orelhas e parafusos
    b.add('#3b4053', W.d(UX - 3, top + 1, 3, h - 2) + W.d(UX + UW, top + 1, 3, h - 2));
    b.add('#8d96b0', W.d(UX - 2, top + 2.4, 1.2, 1.2) + W.d(UX + UW + 0.8, top + 2.4, 1.2, 1.2) + W.d(UX - 2, top + h - 4, 1.2, 1.2) + W.d(UX + UW + 0.8, top + h - 4, 1.2, 1.2));
    if (label) b.add(label, W.d(UX + 3, top + 1.6, 10, 1.4));
    y += h;
    return top;
  };

  // cantoneiras do rack e fundo
  out.push(`<path d="${W.d(RX, 36, RW, 322)}" fill="#07080c"/>`);
  out.push(`<path d="${W.d(RX + 1, 36, 4, 322)}" fill="#1c1f2b"/><path d="${W.d(RX + RW - 5, 36, 4, 322)}" fill="#1c1f2b"/>`);
  out.push(`<path d="${W.d(RX, 32, RW, 5)}" fill="#161924"/><path d="${W.d(RX - 2, 355, RW + 4, 5)}" fill="#161924"/>`);

  // 1U bandeja de ventoinhas
  let t = unit(U, '#4cf0ff');
  for (let i = 0; i < 4; i += 1) {
    const cx = UX + 16 + i * 25;
    b.add('#07080c', W.ell(cx, t + 6.5, 8, 5.4, 10));
    b.add('#3a4056', W.d(cx - 7, t + 6, 14, 1) + W.d(cx - 0.5, t + 1.6, 1, 9.8));
  }
  // 1U patch panel
  t = unit(U, '#ffd23f');
  for (let i = 0; i < 16; i += 1) {
    b.add('#05060a', W.d(UX + 5 + i * 6.1, t + 6, 4.4, 5));
    b.add(['#36e0ff', '#ff4fd8', '#ffd23f', '#7dffb0'][i % 4], W.d(UX + 5 + i * 6.1, t + 3.6, 4.4, 1.2));
  }
  // 1U switch
  const sw = unit(U, '#7dffb0');
  for (let i = 0; i < 16; i += 1) {
    b.add('#05060a', W.d(UX + 5 + i * 5.6, sw + 7, 4, 4));
    led(UX + 5.8 + i * 5.6, sw + 3.6, i % 5 === 0 ? '#ffb347' : '#5dff9a', ['slo-led-a', 'slo-led-b', 'slo-led-c'][i % 3]);
  }
  b.add('#0a0c12', W.d(UX + UW - 24, sw + 4, 20, 7));
  b.add('#ffffff', W.d(UX + UW - 22, sw + 5.4, 6, 1.2) + W.d(UX + UW - 22, sw + 8, 12, 1.2));
  // painel de escova
  t = unit(8);
  b.add('#050509', W.d(UX + 4, t + 2, UW - 8, 4));
  for (let i = 0; i < 40; i += 1) b.add('#262a38', W.d(UX + 5 + i * 2.3, t + 2, 0.8, 4));
  // 1U roteador com mini tela
  t = unit(U, '#ff4fd8');
  b.add('#03070d', W.d(UX + 5, t + 3, 40, 8));
  b.add('#36e0ff', W.d(UX + 7, t + 4.6, 20, 1.2) + W.d(UX + 7, t + 7, 30, 1.2) + W.d(UX + 7, t + 9, 14, 1));
  for (let i = 0; i < 5; i += 1) led(UX + 52 + i * 6, t + 5.4, ['#5dff9a', '#5dff9a', '#ffb347', '#5dff9a', '#36e0ff'][i], ['slo-led-b', 'slo-led-a', 'slo-led-c', 'slo-led-a', 'slo-led-b'][i]);
  b.add('#252a3a', W.ell(UX + UW - 12, t + 7, 4.6, 4.6, 10));
  b.add('#36e0ff', W.ell(UX + UW - 12, t + 7, 1.6, 1.6, 8));
  // 2U NAS
  t = unit(U * 2, '#36e0ff');
  for (let i = 0; i < 4; i += 1) {
    b.add('#07080c', W.d(UX + 6 + i * 23, t + 4, 20, 20));
    b.add('#232837', W.d(UX + 7 + i * 23, t + 5, 18, 18));
    for (let k = 0; k < 6; k += 1) b.add('#0d0f16', W.d(UX + 9 + i * 23, t + 7 + k * 2.5, 14, 0.9));
    led(UX + 8.4 + i * 23, t + 19.8, '#4aa8ff', ['slo-led-a', 'slo-led-c', 'slo-led-b', 'slo-led-a'][i]);
    b.add('#3d4458', W.d(UX + 18 + i * 23, t + 19.4, 5, 2));
  }
  // 2U servidor com ventoinhas e LCD
  t = unit(U * 2, '#ffd23f');
  for (let i = 0; i < 2; i += 1) {
    const cx = UX + 20 + i * 36;
    b.add('#05060a', W.ell(cx, t + 14, 12, 11, 16));
    b.add('#252a3a', W.ell(cx, t + 14, 3.4, 3.2, 8));
    for (let k = 0; k < 7; k += 1) {
      const a = (k / 7) * Math.PI * 2;
      b.add('#2f3548', W.pl([[cx, t + 14], [cx + Math.cos(a) * 10, t + 14 + Math.sin(a) * 9], [cx + Math.cos(a + 0.5) * 9, t + 14 + Math.sin(a + 0.5) * 8]]));
    }
  }
  b.add('#03120a', W.d(UX + 78, t + 5, 30, 11));
  b.add('#5dff9a', W.d(UX + 80, t + 7, 18, 1.4) + W.d(UX + 80, t + 10, 24, 1.4) + W.d(UX + 80, t + 13, 10, 1.2));
  led(UX + 80, t + 20, '#5dff9a', 'slo-led-a');
  led(UX + 86, t + 20, '#ffb347', 'slo-led-c');
  b.add('#2f3548', W.ell(UX + 100, t + 22, 3, 3, 8));
  // 3U console retrô em prateleira
  t = unit(U * 3, '#ff4fd8');
  b.add('#06070b', W.d(UX + 3, t + 4, UW - 6, 33));
  b.add('#1b1e2a', W.d(UX + 3, t + 36, UW - 6, 3));
  b.add('#15171f', W.d(UX + 12, t + 18, 54, 18));
  b.add('#c0262f', W.d(UX + 12, t + 22, 54, 3));
  b.add('#2a2e3c', W.d(UX + 16, t + 14, 20, 4));
  b.add('#8d96b0', W.d(UX + 40, t + 28, 8, 2));
  b.add('#0f1118', W.d(UX + 74, t + 24, 26, 12));
  b.add('#ffd23f', W.d(UX + 78, t + 27, 8, 5));
  b.add('#36e0ff', W.d(UX + 90, t + 27, 5, 5));
  out.push(`<path d="${W.d(UX + 6, t + 6, UW - 12, 1.6)}" fill="url(#slo-rgb)" class="slo-led slo-led-c"/>`);
  // 2U amplificador com VU
  t = unit(U * 2, '#ffb347');
  for (let i = 0; i < 2; i += 1) {
    const vx = UX + 8 + i * 30;
    b.add('#2a1c08', W.d(vx, t + 5, 26, 16));
    b.add('#ffcf70', W.d(vx + 1.2, t + 6.2, 23.6, 13.6));
    b.add('#7a4a10', W.d(vx + 3, t + 16, 20, 0.8));
    out.push(`<path class="slo-needle" style="animation-delay:${i * 0.6}s" d="${W.pl([[vx + 13, t + 19], [vx + 7 + i * 3, t + 8]], false)}" stroke="#1a0f04" stroke-width=".9" fill="none"/>`);
  }
  for (let i = 0; i < 3; i += 1) {
    b.add('#07080c', W.ell(UX + 78 + i * 15, t + 14, 5.4, 5.2, 12));
    b.add('#3a4056', W.ell(UX + 78 + i * 15, t + 14, 4.2, 4, 12));
    b.add('#e8ecff', W.d(UX + 77.6 + i * 15, t + 10.4, 0.9, 3));
  }
  for (let k = 0; k < 6; k += 1) b.add(k < 4 ? '#ffb347' : '#3a2a14', W.d(UX + 60 + k * 2.4, t + 5, 1.6, 3));
  // 3U UPS
  t = unit(U * 3, '#5dff9a');
  b.add('#03120a', W.d(UX + 6, t + 6, 46, 18));
  for (let k = 0; k < 8; k += 1) b.add(k < 6 ? '#5dff9a' : '#13351f', W.d(UX + 9 + k * 5, t + 9, 3.4, 5));
  b.add('#5dff9a', W.d(UX + 9, t + 17, 24, 1.6) + W.d(UX + 9, t + 20, 14, 1.4));
  for (let k = 0; k < 6; k += 1) {
    b.add('#05060a', W.d(UX + 60 + (k % 3) * 14, t + 8 + Math.floor(k / 3) * 14, 11, 9));
    b.add('#2a2f40', W.d(UX + 63 + (k % 3) * 14, t + 11 + Math.floor(k / 3) * 14, 1.2, 3.4) + W.d(UX + 67 + (k % 3) * 14, t + 11 + Math.floor(k / 3) * 14, 1.2, 3.4));
  }
  led(UX + 6, t + 31, '#5dff9a', 'slo-led-a');
  led(UX + 12, t + 31, '#ff4f5f', 'slo-led-c');
  // 3U servidor GPU com janela
  t = unit(U * 3, '#ff4fd8');
  b.add('#04050a', W.d(UX + 5, t + 5, UW - 10, 32));
  out.push(`<path d="${W.d(UX + 7, t + 7, UW - 14, 28)}" fill="#0b0d18"/>`);
  out.push(`<path d="${W.d(UX + 9, t + 11, UW - 18, 6)}" fill="#171a2a"/><path d="${W.d(UX + 9, t + 11, UW - 18, 1.4)}" fill="url(#slo-rgb)" class="slo-led slo-led-c"/>`);
  for (let i = 0; i < 3; i += 1) {
    const cx = UX + 24 + i * 30;
    b.add('#05060a', W.ell(cx, t + 26, 10, 8, 14));
    b.add('#ff4fd8', W.ell(cx, t + 26, 7, 5.6, 14));
    b.add('#05060a', W.ell(cx, t + 26, 3, 2.4, 8));
  }
  out.push(`<path d="${W.d(UX + 7, t + 7, UW - 14, 28)}" fill="url(#slo-gloss)"/>`);
  // 1U régua de energia com chave acesa
  t = unit(U, '#ffb347');
  for (let i = 0; i < 8; i += 1) {
    b.add('#05060a', W.d(UX + 6 + i * 11, t + 4, 8, 7));
    b.add('#2a2f40', W.d(UX + 8.4 + i * 11, t + 6, 1, 3) + W.d(UX + 11.6 + i * 11, t + 6, 1, 3));
  }
  out.push(`<path d="${W.d(UX + UW - 14, t + 3, 9, 8)}" fill="#ff8a1f" class="slo-led slo-led-b"/>`);
  // painel cego com ventilação
  const rest = 36 + 322 - 6 - y;
  t = unit(rest);
  for (let i = 0; i < 14; i += 1) b.add('#04050a', W.d(UX + 6 + i * 7, t + 3, 3, rest - 6));
  void r;

  // fios: patch -> switch (laço colorido do lado direito) e descida para o chão
  const cab = (a: Pt, c: Pt, e: Pt, color: string, wdt = 1.5): string => `<path d="${W.q(a, c, e)}" stroke="${color}" stroke-width="${wdt}" fill="none" stroke-linecap="round"/>`;
  const patchY = 44 + U + 5;
  const cabs = [
    cab([UX + 14, patchY + 8], [UX + 2, patchY + 14], [UX + 14, patchY + 22], '#36e0ff'),
    cab([UX + 36, patchY + 8], [UX + 22, patchY + 14], [UX + 36, patchY + 22], '#ff4fd8'),
    cab([UX + 60, patchY + 8], [UX + 46, patchY + 14], [UX + 60, patchY + 22], '#ffd23f'),
    cab([UX + 84, patchY + 8], [UX + 70, patchY + 14], [UX + 84, patchY + 22], '#7dffb0'),
  ].join('');
  const down = [
    cab([UX + UW + 6, 70], [UX + UW + 14, 200], [UX + UW + 8, 352], '#0a0b10', 3),
    cab([UX + UW + 3, 90], [UX + UW + 9, 210], [UX + UW + 3, 352], '#1b1f2c', 2),
    cab([UX + UW + 9, 130], [UX + UW + 16, 240], [UX + UW + 12, 352], '#c0262f', 1.4),
  ].join('');
  const ties: string[] = [];
  for (const yy of [110, 170, 230, 290]) ties.push(W.d(UX + UW + 3, yy, 10, 1.4));
  b.add('#7dffb0', ties.join(''));

  // cartaz do patrimônio: antena Wi‑Fi no topo
  out.push(`<path d="${W.ell(RX + RW / 2, 28, 12, 3.2, 14)}" fill="#161924"/><path d="${W.ell(RX + RW / 2, 26, 4, 2, 10)}" fill="#4aa8ff" class="slo-led slo-led-b"/>`);

  return out.join('') + b.out() + cabs + down;
}

/** Mesa, prateleira, poster e acessórios. */
function desk(W: Wall): string {
  const b = new Batch();
  const out: string[] = [];
  // faixas de LED
  out.push(`<path d="${W.d(14, 22, 424, 3)}" fill="url(#slo-led)" opacity=".95"/>`);
  out.push(`<path d="${W.d(14, 22, 424, 3)}" fill="url(#slo-led)" opacity=".6" filter="url(#slo-glow-s)"/>`);
  // trilho de suporte dos monitores de cima
  out.push(`<path d="${W.d(30, 58, 366, 5)}" fill="#12141c"/><path d="${W.d(30, 58, 366, 1)}" fill="#3a4056"/>`);
  // prateleira com itens
  out.push(`<path d="${W.d(14, 156, 300, 4)}" fill="url(#slo-deskwood)"/>`);
  const bookCols = ['#7a1f3a', '#1f3a7a', '#2f6a4a', '#8a6a1f', '#4a2a7a', '#7a3a1f'];
  let bx = 20;
  for (let i = 0; i < 9; i += 1) {
    const w = 4 + (i % 3) * 1.6;
    const h = 11 + ((i * 5) % 6);
    b.add(bookCols[i % bookCols.length], W.d(bx, 156 - h, w, h));
    b.add('#e8d9a8', W.d(bx + 0.8, 156 - h + 2, w - 1.6, 0.8));
    bx += w + 0.8;
  }
  b.add('#1c2038', W.d(bx + 4, 144, 14, 12));
  out.push(`<path d="${W.d(bx + 5, 145, 12, 10)}" fill="#ffe3a0" opacity=".9" class="slo-led slo-led-b"/>`);
  out.push(`<path d="${W.ell(bx + 11, 144, 12, 8, 12)}" fill="#ffd27a" opacity=".35" filter="url(#slo-glow-s)"/>`);
  // vaso com planta
  b.add('#2a2f40', W.d(bx + 30, 148, 10, 8));
  b.add('#2f8a5a', W.pl([[bx + 35, 148], [bx + 28, 134], [bx + 33, 140], [bx + 35, 128], [bx + 38, 140], [bx + 44, 132]]));
  // troféu
  b.add('#e0b250', W.pl([[bx + 52, 156], [bx + 52, 152], [bx + 49, 150], [bx + 49, 144], [bx + 59, 144], [bx + 59, 150], [bx + 56, 152], [bx + 56, 156]]));

  // poster da constelação
  out.push(`<path d="${W.d(392, 74, 40, 80)}" fill="#05060a" stroke="#2c3042" stroke-width="1"/><path d="${W.d(395, 77, 34, 74)}" fill="#0e1636"/>`);
  const cs: Pt[] = [[402, 96], [414, 90], [422, 104], [410, 118], [404, 132], [418, 138]];
  out.push(`<path d="${W.pl(cs, false)}" stroke="#f3c75a" stroke-width=".8" stroke-dasharray="1 2" fill="none"/>`);
  for (const [x, y] of cs) b.add('#ffe08a', W.ell(x, y, 1.8, 1.8, 6));
  b.add('#ffe08a', W.d(397, 143, 30, 1.2) + W.d(397, 146, 20, 1.2));

  // mesa
  out.push(`<path d="${W.d(10, DESK_Y, 424, 8)}" fill="url(#slo-deskwood)"/><path d="${W.d(10, DESK_Y, 424, 1.2)}" fill="#a0693f" opacity=".7"/>`);
  out.push(`<path d="${W.d(18, DESK_Y + 8, 7, 90)}" fill="#12141c"/><path d="${W.d(419, DESK_Y + 8, 7, 90)}" fill="#12141c"/>`);
  out.push(`<path d="${W.d(26, DESK_Y + 14, 392, 30)}" fill="#0a0b11"/>`);
  out.push(`<path d="${W.d(26, DESK_Y + 9, 392, 3)}" fill="url(#slo-led)"/><path d="${W.d(26, DESK_Y + 9, 392, 3)}" fill="url(#slo-led)" opacity=".6" filter="url(#slo-glow-s)"/>`);
  // torre do PC com vidro e ventoinhas RGB
  out.push(`<path d="${W.d(300, 288, 54, 72)}" fill="#0a0c12" stroke="#2a2f40" stroke-width=".8"/><path d="${W.d(303, 291, 48, 66)}" fill="#0a0e1c"/>`);
  for (let i = 0; i < 3; i += 1) {
    out.push(`<path d="${W.ell(318, 302 + i * 20, 8, 8, 14)}" fill="#05060a" stroke="${['#36e0ff', '#ff4fd8', '#a78bff'][i]}" stroke-width="1.4"/>`);
    out.push(`<path d="${W.ell(318, 302 + i * 20, 8, 8, 14)}" fill="none" stroke="${['#36e0ff', '#ff4fd8', '#a78bff'][i]}" stroke-width="3" opacity=".5" filter="url(#slo-glow-s)"/>`);
  }
  b.add('#ff4fd8', W.d(335, 296, 2, 56));
  // caixa de som
  out.push(`<path d="${W.d(60, 308, 48, 52)}" fill="#0c0e15" stroke="#262b3c" stroke-width=".8"/>`);
  out.push(`<path d="${W.ell(84, 340, 14, 14, 16)}" fill="#05060a" stroke="#2a2f40" stroke-width="1.4"/><path d="${W.ell(84, 340, 5, 5, 10)}" fill="#1c2030"/><path d="${W.ell(84, 322, 5, 5, 10)}" fill="#05060a" stroke="#2a2f40" stroke-width="1"/>`);
  // teclado, mouse, fone de ouvido
  out.push(`<path d="${W.d(116, 255, 118, 6)}" fill="#0b0c12" stroke="#262b3c" stroke-width=".6"/><path d="${W.d(118, 260, 114, 1.2)}" fill="url(#slo-rgb)"/>`);
  out.push(`<path d="${W.d(118, 256, 114, 1.2)}" fill="url(#slo-rgb)" opacity=".7" filter="url(#slo-glow-s)"/>`);
  out.push(`<path d="${W.ell(258, 259, 6, 2.6, 10)}" fill="#0b0c12" stroke="#262b3c" stroke-width=".6"/>`);
  out.push(`<path d="${W.q([396, 250], [396, 222], [420, 250])}" stroke="#14161e" stroke-width="3" fill="none" stroke-linecap="round"/>`);
  out.push(`<path d="${W.d(392, 246, 8, 12)}" fill="#262b3c"/><path d="${W.d(416, 246, 8, 12)}" fill="#262b3c"/>`);
  return out.join('') + b.out();
}

export function wallMarkup(): string {
  const W = new Wall();
  const glows: string[] = [];
  const bodies: string[] = [];
  MONITORS.forEach((m, i) => {
    const [g, bd] = monitor(W, m, i);
    glows.push(g);
    bodies.push(bd);
  });
  return `<g class="slo-wall">
<g filter="url(#slo-glow)" opacity=".9">${glows.join('')}</g>
${desk(W)}
${bodies.join('')}
${rack(W)}
</g>`;
}
