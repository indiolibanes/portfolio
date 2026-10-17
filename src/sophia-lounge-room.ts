/**
 * O quarto escuro da sala gamer: paredes em canto, janela com lua, sofá
 * vermelho, tapete e iluminação. A parede da direita (monitores e rack) fica
 * em sophia-lounge-wall.ts. Coordenadas em px do quadro 1200×480.
 */
import { type Pt, homography, n1, rng, star4 } from './sophia-draw.ts';

export const SCENE_W = 1200;
export const SCENE_H = 480;

/** Linha onde a parede dos fundos (esquerda) encontra o chão. */
export const FLOOR_Y = 384;
/** Canto do quarto: a parede da direita se afasta a partir daqui. */
export const CORNER_X = 610;

/** A parede dos monitores, em perspectiva: [topo-esq, topo-dir, base-dir, base-esq]. */
export const WALL_QUAD: [Pt, Pt, Pt, Pt] = [[CORNER_X, 30], [1200, 100], [1200, 356], [CORNER_X, FLOOR_Y]];

const f = (p: Pt): string => `${n1(p[0])} ${n1(p[1])}`;

export function roomDefs(): string {
  return `
<linearGradient id="slo-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0e1a"/><stop offset="1" stop-color="#161a2d"/></linearGradient>
<linearGradient id="slo-wall-r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0d1226"/><stop offset="1" stop-color="#121936"/></linearGradient>
<linearGradient id="slo-ceil" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#0a0d1b"/><stop offset="1" stop-color="#05060d"/></linearGradient>
<linearGradient id="slo-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a130f"/><stop offset="1" stop-color="#0b0807"/></linearGradient>
<linearGradient id="slo-sofa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3202f"/><stop offset=".6" stop-color="#7d1120"/><stop offset="1" stop-color="#520a14"/></linearGradient>
<linearGradient id="slo-sofa-seat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c32a3a"/><stop offset=".25" stop-color="#9b1727"/><stop offset="1" stop-color="#5e0c18"/></linearGradient>
<linearGradient id="slo-sofa-arm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6d0f1c"/><stop offset=".45" stop-color="#b8212f"/><stop offset="1" stop-color="#7c1220"/></linearGradient>
<radialGradient id="slo-moon" cx="38%" cy="36%" r="70%"><stop offset="0" stop-color="#fffbe9"/><stop offset=".7" stop-color="#d9deef"/><stop offset="1" stop-color="#9aa7cf"/></radialGradient>
<linearGradient id="slo-night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b21"/><stop offset="1" stop-color="#1c2a63"/></linearGradient>
<linearGradient id="slo-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe0ff" stop-opacity=".22"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></linearGradient>
<linearGradient id="slo-led" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff3fb4"/><stop offset=".5" stop-color="#8a5bff"/><stop offset="1" stop-color="#36e0ff"/></linearGradient>
<radialGradient id="slo-spill" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#5f7bff" stop-opacity=".30"/><stop offset=".6" stop-color="#7a4dff" stop-opacity=".10"/><stop offset="1" stop-color="#7a4dff" stop-opacity="0"/></radialGradient>
<radialGradient id="slo-vig" cx="50%" cy="48%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></radialGradient>
<linearGradient id="slo-rugfield" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b2766"/><stop offset="1" stop-color="#0e1544"/></linearGradient>
<linearGradient id="slo-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2417"/><stop offset="1" stop-color="#1a0f0a"/></linearGradient>
<filter id="slo-soft" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="slo-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="12"/></filter>
<filter id="slo-glow-s" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.5"/></filter>`;
}

/** Paredes, teto e chão (sem objetos). */
export function roomShell(): string {
  const r = rng(5);
  // tábuas do chão: linhas horizontais e emendas
  const planks: string[] = [];
  for (const y of [396, 410, 427, 446, 468]) planks.push(`M0 ${y}H1200`);
  const seams: string[] = [];
  for (let row = 0; row < 5; row += 1) {
    const y0 = [384, 396, 410, 427, 446][row];
    const y1 = [396, 410, 427, 446, 468][row];
    for (let x = (row * 97) % 150; x < 1200; x += 150 + Math.floor(r() * 90)) seams.push(`M${x} ${y0}V${y1}`);
  }
  const [tl, tr, br, bl] = WALL_QUAD;
  return `
<rect width="${CORNER_X}" height="${FLOOR_Y}" fill="url(#slo-wall)"/>
<path d="M${f(tl)}L${f(tr)}L${f(br)}L${f(bl)}Z" fill="url(#slo-wall-r)"/>
<path d="M${CORNER_X} 0H1200V100L${f(tr)}L${f(tl)}Z" fill="url(#slo-ceil)"/>
<path d="M0 ${FLOOR_Y}H${CORNER_X}L${f(br)}L1200 480H0Z" fill="url(#slo-floor)"/>
<path d="${planks.join('')}" stroke="#000" stroke-opacity=".5" stroke-width="1.4" fill="none"/>
<path d="${seams.join('')}" stroke="#000" stroke-opacity=".4" stroke-width="1" fill="none"/>
<path d="M0 ${FLOOR_Y - 10}H${CORNER_X}V${FLOOR_Y}H0Z" fill="#0a0c16"/>
<path d="M0 ${FLOOR_Y - 10}H${CORNER_X}" stroke="#2a2f4a" stroke-width="1"/>
<path d="M${CORNER_X} 20V${FLOOR_Y}" stroke="#04050a" stroke-width="3"/>
<path d="M0 ${FLOOR_Y - 5}H${CORNER_X}" stroke="url(#slo-led)" stroke-width="3" opacity=".9"/>
<path d="M0 ${FLOOR_Y - 5}H${CORNER_X}" stroke="url(#slo-led)" stroke-width="9" opacity=".55" filter="url(#slo-glow-s)"/>`;
}

/** Janela com lua, estrelas, persiana e o feixe de luar. */
export function moonWindow(): string {
  const r = rng(17);
  const stars: string[] = [];
  for (let i = 0; i < 34; i += 1) {
    const x = 108 + r() * 184;
    const y = 46 + r() * 136;
    if (Math.hypot(x - 226, y - 100) < 34) continue;
    stars.push(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(0.6 + r() * 1.1)}" fill="#fff" opacity="${n1(0.4 + r() * 0.6)}"${i % 5 === 0 ? ` class="slo-star" style="animation-delay:${n1(r() * 4)}s"` : ''}/>`);
  }
  const slats: string[] = [];
  for (let y = 46; y < 118; y += 11) slats.push(`M104 ${y}H296v6H104Z`);
  return `
<path d="M120 200L320 200L690 ${FLOOR_Y + 40}L430 ${FLOOR_Y + 40}Z" fill="url(#slo-beam)"/>
<path d="M100 36H300V204H100Z" fill="#050711"/>
<rect x="106" y="42" width="188" height="156" fill="url(#slo-night)"/>
${stars.join('')}
<circle cx="226" cy="100" r="46" fill="#9cb4ff" opacity=".18" filter="url(#slo-glow)"/>
<circle cx="226" cy="100" r="25" fill="url(#slo-moon)"/>
<circle cx="218" cy="94" r="5" fill="#b9c2de" opacity=".6"/><circle cx="235" cy="108" r="7" fill="#b9c2de" opacity=".5"/><circle cx="231" cy="88" r="3" fill="#b9c2de" opacity=".5"/>
<path d="M106 150Q150 138 190 152T294 146V198H106Z" fill="#070a1c"/>
<path d="${slats.join('')}" fill="#0b0e19" opacity=".92"/>
<path d="M100 36H300V204H100ZM200 36V204M100 120H300" fill="none" stroke="#0a0c14" stroke-width="5"/>
<path d="M92 204H308V214H92Z" fill="#161a2a"/><path d="M92 204H308" stroke="#2d3354" stroke-width="1.2"/>
<g class="slo-motes" fill="#e8f0ff"><circle cx="300" cy="240" r="1.4"/><circle cx="350" cy="290" r="1.1"/><circle cx="410" cy="250" r="1.3"/><circle cx="330" cy="330" r="1"/></g>`;
}

/** Néon com a estrela de quatro pontas e a lua, entre a janela e o canto. */
export function neon(): string {
  const cx = 468;
  const cy = 84;
  const sw = (c: string, w: number) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
  const moon = 'M420 54A34 34 0 1 0 450 122A28 28 0 1 1 420 54Z';
  return `<g class="slo-neon">
<path d="${star4(cx + 42, cy - 4, 36, 22, 0.2)}" ${sw('#ffb457', 10)} opacity=".55" filter="url(#slo-glow-s)"/>
<path d="${moon}" ${sw('#ff5fb1', 10)} opacity=".55" filter="url(#slo-glow-s)" transform="translate(40 4)"/>
<path d="${star4(cx + 42, cy - 4, 36, 22, 0.2)}" ${sw('#ffe3b0', 2.6)}/>
<path d="${moon}" ${sw('#ffc2e4', 2.6)} transform="translate(40 4)"/>
</g>`;
}

/** Sofá vermelho de veludo, capitonê, atrás da Sophia. */
export function sofa(): string {
  const tufts: string[] = [];
  const buttons: string[] = [];
  const rows: [number, number][] = [[212, 0], [262, 36], [312, 0]];
  const pts: Pt[][] = rows.map(([y, off]) => {
    const row: Pt[] = [];
    for (let x = 96 + off; x < 560; x += 72) row.push([x, y]);
    return row;
  });
  pts.forEach((row, ri) => {
    row.forEach(([x, y]) => {
      buttons.push(`<circle cx="${x}" cy="${y}" r="4.2" fill="#3d0710"/><circle cx="${x - 1}" cy="${y - 1.2}" r="1.5" fill="#e05060" opacity=".7"/>`);
      const next = pts[ri + 1];
      if (!next) return;
      for (const [nx, ny] of next) if (Math.abs(nx - x) < 40) tufts.push(`M${x} ${y}L${nx} ${ny}`);
    });
  });
  const folds: string[] = [];
  const r = rng(9);
  for (let i = 0; i < 30; i += 1) {
    const x = 70 + r() * 480;
    const y = 170 + r() * 150;
    folds.push(`M${n1(x)} ${n1(y)}q${n1(8 + r() * 10)} ${n1(-4 + r() * 8)} ${n1(16 + r() * 14)} ${n1(-2 + r() * 6)}`);
  }
  return `<g class="slo-sofa">
<ellipse cx="300" cy="404" rx="320" ry="14" fill="#000" opacity=".55" filter="url(#slo-soft)"/>
<path d="M44 392V318H566V392Z" fill="#33060e"/>
<path d="M30 340V208Q30 150 96 150H504Q570 150 570 208V340Z" fill="url(#slo-sofa)"/>
<path d="M44 160Q300 138 556 160" fill="none" stroke="#f0707c" stroke-width="2" opacity=".35" stroke-linecap="round"/>
<path d="${tufts.join('')}" stroke="#2c050c" stroke-opacity=".6" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<path d="${folds.join('')}" stroke="#e86a76" stroke-opacity=".12" stroke-width="3" fill="none" stroke-linecap="round"/>
${buttons.join('')}
<path d="M34 326H566Q572 326 572 336V380Q572 392 560 392H40Q28 392 28 380V336Q28 326 34 326Z" fill="url(#slo-sofa-seat)"/>
<path d="M34 328H566" stroke="#ff8a96" stroke-opacity=".35" stroke-width="1.6"/>
<path d="M214 330V390M392 330V390" stroke="#2a050b" stroke-opacity=".7" stroke-width="2.4"/>
<path d="M6 226Q6 206 44 206H72Q96 206 96 226V386Q96 396 86 396H16Q6 396 6 386Z" fill="url(#slo-sofa-arm)"/>
<path d="M10 232Q10 214 40 214H70" fill="none" stroke="#ff8a96" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/>
<path d="M524 226Q524 206 552 206H580Q604 206 604 226V386Q604 396 594 396H534Q524 396 524 386Z" fill="url(#slo-sofa-arm)"/>
<path d="M528 232Q528 214 556 214H582" fill="none" stroke="#ff8a96" stroke-opacity=".4" stroke-width="2" stroke-linecap="round"/>
<g fill="url(#slo-wood)"><path d="M24 396H44L40 412H28Z M64 396H84L80 412H68Z M546 396H566L562 412H550Z M586 396H606L602 412H590Z"/></g>
<path d="M530 206Q560 196 580 206" stroke="#38e0ff" stroke-width="2" fill="none" opacity=".35" stroke-linecap="round"/>
</g>`;
}

/** Tapete persa (perspectiva do chão) onde a Sophia se senta. */
export function rug(): string {
  const m = homography([[110, 418], [700, 418], [790, 474], [30, 474]]);
  const q = (u0: number, v0: number, u1: number, v1: number): string => `M${f(m(u0, v0))}L${f(m(u1, v0))}L${f(m(u1, v1))}L${f(m(u0, v1))}Z`;
  const ell = (u: number, v: number, ru: number, rv: number, n = 28): string => {
    const pts: string[] = [];
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2;
      pts.push(f(m(u + Math.cos(a) * ru, v + Math.sin(a) * rv)));
    }
    return `M${pts.join('L')}Z`;
  };
  const diamonds: string[] = [];
  for (let i = 0; i < 9; i += 1) {
    const u = 0.1 + i * 0.1;
    for (const v of [0.26, 0.74]) diamonds.push(`M${f(m(u, v - 0.1))}L${f(m(u + 0.035, v))}L${f(m(u, v + 0.1))}L${f(m(u - 0.035, v))}Z`);
  }
  const fringe: string[] = [];
  for (let i = 0; i <= 14; i += 1) {
    const v = i / 14;
    fringe.push(`M${f(m(0, v))}L${f(m(-0.02, v + 0.01))}M${f(m(1, v))}L${f(m(1.02, v + 0.01))}`);
  }
  return `<g class="slo-rug">
<path d="${q(-0.01, -0.02, 1.01, 1.04)}" fill="#000" opacity=".5" filter="url(#slo-soft)"/>
<path d="${q(0, 0, 1, 1)}" fill="#7d1624"/>
<path d="${q(0.018, 0.07, 0.982, 0.93)}" fill="#d9a441"/>
<path d="${q(0.03, 0.12, 0.97, 0.88)}" fill="url(#slo-rugfield)"/>
<path d="${diamonds.join('')}" fill="#8f1d2c" opacity=".9"/>
<path d="${ell(0.5, 0.5, 0.2, 0.3)}" fill="#a8202f"/>
<path d="${ell(0.5, 0.5, 0.2, 0.3)}" fill="none" stroke="#e0b250" stroke-width="2"/>
<path d="${ell(0.5, 0.5, 0.12, 0.18)}" fill="#13205f"/>
<path d="${ell(0.5, 0.5, 0.12, 0.18)}" fill="none" stroke="#e0b250" stroke-width="1.4"/>
<path d="${q(0.03, 0.12, 0.97, 0.88)}" fill="none" stroke="#e8c35f" stroke-width="1.2" opacity=".8"/>
<path d="${fringe.join('')}" stroke="#d9c79a" stroke-width="1.2" opacity=".8"/>
</g>`;
}

/** Caneca com vapor, no tapete, ao alcance da pata. */
export function mug(x: number, y: number): string {
  return `<g class="slo-mug" transform="translate(${x} ${y})">
<ellipse cx="0" cy="4" rx="22" ry="5" fill="#000" opacity=".5" filter="url(#slo-glow-s)"/>
<path d="M-14 -26H14V-2Q14 4 8 4H-8Q-14 4 -14 -2Z" fill="#e9e6f2"/>
<path d="M-14 -26H14" stroke="#fff" stroke-width="1.2" opacity=".8"/>
<path d="M-14 -22H14V-14H-14Z" fill="#c0262f" opacity=".85"/>
<path d="M14 -22Q26 -22 26 -12Q26 -4 14 -6" fill="none" stroke="#e9e6f2" stroke-width="3.4"/>
<ellipse cx="0" cy="-26" rx="14" ry="3" fill="#3a2418"/>
<g class="slo-steam" fill="none" stroke="#dbe6ff" stroke-width="2" stroke-linecap="round" opacity=".5"><path d="M-5 -30Q-11 -40 -5 -48T-5 -66"/><path d="M4 -30Q10 -42 4 -50T6 -68" style="animation-delay:.9s"/></g>
</g>`;
}

/** Reflexos dos monitores no piso e fios correndo do rack até a mesa. */
export function floorDetails(): string {
  return `<g pointer-events="none">
<ellipse cx="820" cy="418" rx="90" ry="12" fill="#ff4fa8" opacity=".16" filter="url(#slo-soft)"/>
<ellipse cx="930" cy="426" rx="80" ry="11" fill="#6a8bff" opacity=".18" filter="url(#slo-soft)"/>
<ellipse cx="1040" cy="408" rx="64" ry="9" fill="#36e0ff" opacity=".16" filter="url(#slo-soft)"/>
<path d="M1112 372Q1100 408 1040 412T950 404" fill="none" stroke="#06070b" stroke-width="5" stroke-linecap="round"/>
<path d="M1118 372Q1112 420 1050 430T960 424" fill="none" stroke="#1b1f2c" stroke-width="3" stroke-linecap="round"/>
<path d="M1124 372Q1130 430 1080 440T968 440" fill="none" stroke="#c0262f" stroke-width="2" stroke-linecap="round" opacity=".9"/>
</g>`;
}

/** Luz que escorre dos monitores sobre o quarto (por cima de tudo, mistura "screen"). */
export function lightSpill(): string {
  return `<g pointer-events="none">
<ellipse cx="900" cy="250" rx="520" ry="300" fill="url(#slo-spill)"/>
<ellipse cx="760" cy="440" rx="420" ry="60" fill="#5f7bff" opacity=".10" filter="url(#slo-soft)"/>
</g>
<rect width="${SCENE_W}" height="${SCENE_H}" fill="url(#slo-vig)" pointer-events="none"/>`;
}

