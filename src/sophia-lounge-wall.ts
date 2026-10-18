/**
 * A parede do outro lado da sala: faixa de LED, prateleira, poster e um rack
 * cheio de equipamentos (a TV de tubo fica na frente, em sophia-lounge-tv.ts).
 * Tudo é desenhado num plano local de 600×360 e projetado em perspectiva
 * (homografia) sobre a parede da direita.
 */
import { type Pt, homography, n1, rng } from './sophia-draw.ts';
import { WALL_QUAD } from './sophia-lounge-room.ts';

const LW = 600;
const LH = 360;
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
<linearGradient id="slo-gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="slo-unit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2e3b"/><stop offset=".15" stop-color="#1b1e28"/><stop offset="1" stop-color="#0f1118"/></linearGradient>
<linearGradient id="slo-deskwood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a4328"/><stop offset="1" stop-color="#2e1b10"/></linearGradient>
<linearGradient id="slo-rgb" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff3fb4"/><stop offset=".33" stop-color="#ffd23f"/><stop offset=".66" stop-color="#36e0ff"/><stop offset="1" stop-color="#8a5bff"/></linearGradient>`;
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

/** Faixa de LED, prateleira com itens e poster. */
function decor(W: Wall): string {
  const b = new Batch();
  const out: string[] = [];
  // faixas de LED
  out.push(`<path d="${W.d(14, 22, 424, 3)}" fill="url(#slo-led)" opacity=".95"/>`);
  out.push(`<path d="${W.d(14, 22, 424, 3)}" fill="url(#slo-led)" opacity=".6" filter="url(#slo-glow-s)"/>`);
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

  return out.join('') + b.out();
}

export function wallMarkup(): string {
  const W = new Wall();
  return `<g class="slo-wall">
${decor(W)}
${rack(W)}
</g>`;
}
