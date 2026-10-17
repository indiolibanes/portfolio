/**
 * Retrato da Sophia para o topo do jogo: ilustração vetorial (não pixel art).
 *
 * Traços fiéis à Sophia do site: raposa branca, pontas das orelhas azul-marinho,
 * olhos âmbar, estrela dourada na testa, tassels vermelhos e óculos redondos
 * com reflexos brancos. A animação é de "marionete": uma cabeça só, e o CSS
 * (sophia-illustration.css) inclina, baixa o olhar, fecha as pálpebras e troca
 * a boca. Ver `.spo-*` lá.
 */
import { type Pt, n1, poly, smooth, spline, star4, strands, tufts } from './sophia-draw.ts';

export const PORTRAIT_W = 420;
export const PORTRAIT_H = 392;
const Y0 = -36; // folga em cima: a inclinação leva as pontas das orelhas para fora do quadro

const CX = PORTRAIT_W / 2;
const mx = (p: Pt): Pt => [PORTRAIT_W - p[0], p[1]];
const mirrorList = (pts: Pt[]): Pt[] => pts.map(mx);

/** Metade direita do contorno da cabeça, do topo ao queixo. */
const HEAD_R: Pt[] = [
  [210, 92], [246, 95], [278, 108], [300, 130], [318, 152], [340, 170], [337, 184], [322, 192],
  [342, 207], [331, 223], [313, 233], [298, 256], [268, 282], [236, 296],
];
const HEAD: Pt[] = [...HEAD_R, [210, 300], ...mirrorList(HEAD_R).slice(1).reverse()];

/** Orelha esquerda (ponta em cima) e a região interna clara. */
const EAR_L: Pt[] = [
  [110, 150], [92, 112], [74, 62], [62, 6], [66, -26], [104, -2], [142, 34], [172, 74], [190, 118], [172, 152], [130, 158],
];
const EAR_L_INNER: Pt[] = [[108, 132], [95, 102], [89, 72], [92, 46], [116, 52], [142, 70], [162, 96], [173, 124], [140, 144]];
const EAR_R = mirrorList(EAR_L);
const EAR_R_INNER = mirrorList(EAR_L_INNER);

const RUFF: Pt[] = [
  [96, 356], [108, 320], [140, 290], [180, 280], [240, 280], [280, 290], [312, 320], [324, 356],
];

const EYES = [
  { cx: 150, dir: -1 },
  { cx: 270, dir: 1 },
] as const;
const EYE_Y = 180;

function eyeOutline(cx: number, dir: number): string {
  const X = (ox: number) => n1(cx + dir * ox);
  const y = EYE_Y;
  return `M${X(31)} ${y + 3}Q${X(6)} ${y - 36} ${X(-32)} ${y - 5}Q${X(-4)} ${y + 31} ${X(31)} ${y + 3}Z`;
}

function defs(): string {
  return `<defs>
<radialGradient id="spo-glow" cx="50%" cy="46%" r="52%"><stop offset="0" stop-color="#6f86ff" stop-opacity=".34"/><stop offset=".55" stop-color="#2c3c9a" stop-opacity=".16"/><stop offset="1" stop-color="#101845" stop-opacity="0"/></radialGradient>
<radialGradient id="spo-fur" cx="50%" cy="34%" r="74%"><stop offset="0" stop-color="#fffefb"/><stop offset=".55" stop-color="#f7f0e4"/><stop offset="1" stop-color="#dccfba"/></radialGradient>
<linearGradient id="spo-fur-back" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efe6d6"/><stop offset="1" stop-color="#cdbfa8"/></linearGradient>
<linearGradient id="spo-ear" gradientUnits="userSpaceOnUse" x1="0" y1="-26" x2="0" y2="150"><stop offset="0" stop-color="#0e1642"/><stop offset=".34" stop-color="#1c2a78"/><stop offset=".5" stop-color="#3f4f9c"/><stop offset=".62" stop-color="#c3c7de"/><stop offset=".74" stop-color="#f7f2e8"/><stop offset="1" stop-color="#fffdf8"/></linearGradient>
<linearGradient id="spo-ear-in" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset=".55" stop-color="#f8e6da"/><stop offset="1" stop-color="#e9bfb0"/></linearGradient>
<linearGradient id="spo-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b0"/><stop offset=".5" stop-color="#f0b73e"/><stop offset="1" stop-color="#b9771d"/></linearGradient>
<radialGradient id="spo-iris" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="#ffe28a"/><stop offset=".38" stop-color="#f6b33a"/><stop offset=".78" stop-color="#c4701c"/><stop offset="1" stop-color="#6e3510"/></radialGradient>
<linearGradient id="spo-lidshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1608" stop-opacity=".62"/><stop offset=".5" stop-color="#2a1608" stop-opacity="0"/></linearGradient>
<radialGradient id="spo-lens" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ffffff" stop-opacity=".22"/><stop offset="1" stop-color="#9fb4ff" stop-opacity=".07"/></radialGradient>
<linearGradient id="spo-paw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d3d8f"/><stop offset="1" stop-color="#121a4a"/></linearGradient>
<linearGradient id="spo-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ee4a55"/><stop offset="1" stop-color="#a31322"/></linearGradient>
<radialGradient id="spo-nose" cx="40%" cy="30%" r="70%"><stop offset="0" stop-color="#5b4650"/><stop offset="1" stop-color="#1c1216"/></radialGradient>
<filter id="spo-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="spo-blur1" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".7"/></filter>
<filter id="spo-blur2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
<clipPath id="spo-ruff-clip"><path d="${poly(RUFF)}"/></clipPath>
<clipPath id="spo-head-clip"><path d="${smooth(HEAD)}"/></clipPath>
${EYES.map((e, i) => `<clipPath id="spo-eye-clip-${i}"><path d="${eyeOutline(e.cx, e.dir)}"/></clipPath>`).join('')}
</defs>`;
}

function ear(pts: Pt[], inner: Pt[], seed: number, side: 'l' | 'r'): string {
  const outline = spline(pts, true, 5);
  const innerOutline = spline(inner, true, 5);
  const back = tufts(outline, { seed, len: [6, 13], width: [8, 13], gap: 6, bend: 5, where: (_p, n) => (side === 'l' ? n[0] < 0.55 : n[0] > -0.55) });
  const fluff = tufts(innerOutline, { seed: seed + 1, len: [7, 15], width: [6, 10], gap: 5, bend: 4, lean: side === 'l' ? 0.35 : -0.35 });
  const flow = strands(spline(inner, true, 5), { seed: seed + 2, count: 26, from: side === 'l' ? [150, 156] : [270, 156], len: [8, 16], jitter: 0.25 });
  return `<g class="spo-ear spo-ear-${side}">
<path d="${back}" fill="url(#spo-ear)"/>
<path d="${smooth(pts)}" fill="url(#spo-ear)"/>
<path d="${smooth(inner)}" fill="url(#spo-ear-in)"/>
<path d="${flow}" fill="none" stroke="#e8c9b9" stroke-width=".9" stroke-linecap="round" opacity=".7"/>
<path d="${fluff}" fill="#fffbf2"/>
</g>`;
}

function tassel(x: number, y: number, flip: 1 | -1): string {
  const X = (dx: number) => n1(x + flip * dx);
  return `<g class="spo-tassel">
<circle cx="${n1(x)}" cy="${n1(y)}" r="7.5" fill="none" stroke="url(#spo-gold)" stroke-width="3"/>
<path d="M${X(-1)} ${y + 7}L${X(-1)} ${y + 22}" stroke="url(#spo-gold)" stroke-width="2.4" stroke-linecap="round"/>
<path d="M${X(-5)} ${y + 22}h10l2 6h-14z" fill="url(#spo-gold)"/>
<path d="M${X(-6)} ${y + 28}Q${X(-9)} ${y + 46} ${X(-8)} ${y + 58}L${X(-3)} ${y + 56}L${X(-1)} ${y + 60}L${X(2)} ${y + 56}L${X(6)} ${y + 59}Q${X(8)} ${y + 44} ${X(6)} ${y + 28}Z" fill="url(#spo-red)"/>
<path d="M${X(-2)} ${y + 31}L${X(-3)} ${y + 54}M${X(2)} ${y + 31}L${X(2)} ${y + 55}" stroke="#7d0e1a" stroke-width=".8" opacity=".5"/>
</g>`;
}

function eye(i: number, cx: number, dir: number): string {
  const y = EYE_Y;
  const X = (ox: number) => n1(cx + dir * ox);
  return `<g class="spo-eye">
<g class="spo-open">
<g clip-path="url(#spo-eye-clip-${i})">
<rect x="${cx - 42}" y="${y - 42}" width="84" height="84" fill="#2a1608"/>
<g class="spo-gaze">
<circle cx="${n1(cx + dir * -1)}" cy="${y + 1}" r="20" fill="url(#spo-iris)"/>
<circle cx="${n1(cx + dir * -1)}" cy="${y + 1}" r="9.5" fill="#150b06"/>
<path d="M${n1(cx + dir * -1)} ${y - 19}a20 20 0 0 1 0 40" fill="none" stroke="#7a3b0e" stroke-width="1.4" opacity=".55"/>
<circle cx="${n1(cx + dir * 5)}" cy="${y - 6}" r="4.6" fill="#fff"/>
<circle cx="${n1(cx + dir * -7)}" cy="${y + 8}" r="2.2" fill="#fff" opacity=".85"/>
</g>
<rect x="${cx - 42}" y="${y - 42}" width="84" height="40" fill="url(#spo-lidshade)"/>
<g class="spo-lid"><rect x="${cx - 44}" y="${y - 112}" width="88" height="72" fill="url(#spo-fur)"/><path d="M${cx - 44} ${y - 40}H${cx + 44}" stroke="#1b1210" stroke-width="3.4"/></g>
</g>
<path d="M${X(31)} ${y + 3}Q${X(6)} ${y - 36} ${X(-32)} ${y - 5}" fill="none" stroke="#1b1210" stroke-width="4" stroke-linecap="round"/>
<path d="M${X(31)} ${y + 3}L${X(45)} ${y - 9}L${X(27)} ${y - 6}Z" fill="#1b1210"/>
<path d="M${X(-32)} ${y - 5}Q${X(-4)} ${y + 31} ${X(31)} ${y + 3}" fill="none" stroke="#3b2a22" stroke-width="1.6" opacity=".7"/>
</g>
<path class="spo-happy" d="M${X(27)} ${y + 8}Q${X(0)} ${y - 26} ${X(-27)} ${y + 8}" fill="none" stroke="#1b1210" stroke-width="5.4" stroke-linecap="round"/>
</g>`;
}

function glasses(): string {
  const lens = EYES.map((e) => {
    const cx = e.cx;
    const cy = EYE_Y + 2;
    const flip = e.dir;
    const gx = (dx: number) => n1(cx + flip * dx);
    return `<g class="spo-lens">
<circle cx="${cx}" cy="${cy}" r="40" fill="url(#spo-lens)"/>
<circle cx="${cx}" cy="${cy}" r="40" fill="none" stroke="#1b1a24" stroke-width="4.4"/>
<circle cx="${cx}" cy="${cy}" r="37.2" fill="none" stroke="#d9ac4a" stroke-width="1" opacity=".85"/>
<path d="M${gx(-26)} ${cy - 18}Q${gx(-12)} ${cy - 32} ${gx(4)} ${cy - 35}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".78"/>
<path d="M${gx(-31)} ${cy - 6}Q${gx(-30)} ${cy - 12} ${gx(-28)} ${cy - 15}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>
<path d="M${gx(20)} ${cy + 27}Q${gx(28)} ${cy + 20} ${gx(32)} ${cy + 10}" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".35"/>
<path d="M${gx(40)} ${cy - 6}L${gx(70)} ${cy - 12}" stroke="#1b1a24" stroke-width="3.6" stroke-linecap="round"/>
</g>`;
  }).join('');
  return `${lens}<path d="M188 176Q210 160 232 176" fill="none" stroke="#1b1a24" stroke-width="4.4" stroke-linecap="round"/>`;
}

function face(): string {
  return `
<ellipse cx="${CX}" cy="238" rx="50" ry="38" fill="#fffdf7" opacity=".9"/>
<path d="M${CX - 14} 214Q${CX} 208 ${CX + 14} 214Q${CX + 13} 226 ${CX} 234Q${CX - 13} 226 ${CX - 14} 214Z" fill="url(#spo-nose)"/>
<ellipse cx="${CX - 4}" cy="215" rx="5" ry="2" fill="#fff" opacity=".55"/>
<path d="M${CX} 234V246" stroke="#3a2420" stroke-width="2.4" stroke-linecap="round"/>
<g class="spo-mouth spo-mouth-calm" fill="none" stroke="#3a2420" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M${CX} 246Q${CX - 8} 258 ${CX - 22} 250"/><path d="M${CX} 246Q${CX + 8} 258 ${CX + 22} 250"/></g>
<g class="spo-mouth spo-mouth-grin">
<path d="M${CX - 34} 244Q${CX} 252 ${CX + 34} 244Q${CX + 30} 288 ${CX} 290Q${CX - 30} 288 ${CX - 34} 244Z" fill="#4a1620"/>
<clipPath id="spo-mouth-clip"><path d="M${CX - 34} 244Q${CX} 252 ${CX + 34} 244Q${CX + 30} 288 ${CX} 290Q${CX - 30} 288 ${CX - 34} 244Z"/></clipPath>
<g clip-path="url(#spo-mouth-clip)"><ellipse cx="${CX}" cy="290" rx="24" ry="17" fill="#e8798b"/><path d="M${CX} 276V290" stroke="#c4566a" stroke-width="1.6"/></g>
<path d="M${CX - 22} 247L${CX - 17} 259L${CX - 11} 249Z M${CX + 22} 247L${CX + 17} 259L${CX + 11} 249Z" fill="#fff"/>
<path d="M${CX - 34} 244Q${CX} 252 ${CX + 34} 244" fill="none" stroke="#2a0f14" stroke-width="2.6" stroke-linecap="round"/>
</g>
<g class="spo-whiskers" stroke="#fffdf7" stroke-width="1.2" stroke-linecap="round" opacity=".8" fill="none">
<path d="M${CX - 40} 236Q${CX - 78} 226 ${CX - 108} 232M${CX - 40} 242Q${CX - 80} 242 ${CX - 110} 252M${CX + 40} 236Q${CX + 78} 226 ${CX + 108} 232M${CX + 40} 242Q${CX + 80} 242 ${CX + 110} 252"/>
</g>
<ellipse class="spo-blush" cx="${CX - 82}" cy="236" rx="20" ry="10" fill="#ff9aa8"/>
<ellipse class="spo-blush" cx="${CX + 82}" cy="236" rx="20" ry="10" fill="#ff9aa8"/>`;
}

export function portraitMarkup(): string {
  const headOutline = spline(HEAD, true, 5);
  const ruffOutline = spline(RUFF, true, 5);

  const cheekRuff = tufts(headOutline, {
    seed: 21, len: [12, 26], width: [14, 22], gap: 6, bend: 8,
    where: (p) => p[1] > 150 && p[1] < 240 && (p[0] < 128 || p[0] > 292),
  });
  const headBack = tufts(headOutline, { seed: 22, len: [8, 16], width: [12, 18], gap: 5, bend: 6 });
  const headFront = tufts(headOutline, { seed: 23, len: [5, 9], width: [10, 15], gap: 5, bend: 4, lean: 0.1 });
  const ruffTufts = tufts(ruffOutline, { seed: 24, len: [12, 26], width: [12, 20], gap: 8, bend: 8, where: (p) => p[1] < 340 });
  const flowDark = strands(headOutline, { seed: 31, count: 170, from: [CX, 215], len: [9, 20], jitter: 0.22 });
  const flowLight = strands(headOutline, { seed: 32, count: 120, from: [CX, 205], len: [8, 16], jitter: 0.22 });
  const ruffFlow = strands(ruffOutline, { seed: 33, count: 90, from: [CX, 250], len: [10, 22], jitter: 0.3 });
  const crest = tufts(
    spline([[186, 100], [198, 84], [210, 78], [222, 84], [234, 100]], false, 4).concat([[222, 112], [198, 112]]),
    { seed: 25, len: [8, 15], width: [7, 11], gap: 5, bend: 5, lean: 0 },
  );
  // pequenos "pelinhos" no focinho, para não ficar liso
  const muzzleFlow = strands(spline([[168, 214], [210, 206], [252, 214], [262, 246], [210, 274], [158, 246]], true, 5), {
    seed: 34, count: 40, from: [CX, 224], len: [5, 10], jitter: 0.3,
  });

  const paw = (x: number) => `<g class="spo-paw">
<path d="M${x - 30} 356V346Q${x - 30} 322 ${x} 322Q${x + 30} 322 ${x + 30} 346V356Z" fill="url(#spo-paw)"/>
<path d="M${x - 10} 340V356M${x + 10} 340V356" stroke="#0c1236" stroke-width="1.6" opacity=".55"/>
<path d="M${x - 22} 332Q${x - 8} 324 ${x + 4} 326" fill="none" stroke="#7c8cd6" stroke-width="2" stroke-linecap="round" opacity=".45"/>
</g>`;

  return `<svg class="sophia-art sophia-art--portrait" viewBox="0 ${Y0} ${PORTRAIT_W} ${PORTRAIT_H}" aria-hidden="true" focusable="false">
${defs()}
<ellipse cx="${CX}" cy="176" rx="200" ry="176" fill="url(#spo-glow)"/>
<g class="spo-body">
<path d="${ruffTufts}" fill="#e6dac6"/>
<path d="${poly(ruffOutline)}" fill="url(#spo-fur)"/>
<g clip-path="url(#spo-ruff-clip)"><path d="${ruffFlow}" fill="none" stroke="#cdbea6" stroke-width="1" stroke-linecap="round" opacity=".5"/></g>
${paw(118)}${paw(302)}
</g>
<g class="spo-head">
${ear(EAR_L, EAR_L_INNER, 41, 'l')}${ear(EAR_R, EAR_R_INNER, 51, 'r')}
${tassel(104, 146, 1)}${tassel(316, 146, -1)}
<path d="${cheekRuff}${headBack}" fill="url(#spo-fur-back)" filter="url(#spo-blur1)"/>
<path d="${smooth(HEAD)}" fill="url(#spo-fur)"/>
<g clip-path="url(#spo-head-clip)">
<ellipse cx="${CX}" cy="304" rx="120" ry="44" fill="#a98e72" opacity=".26" filter="url(#spo-soft)"/>
<ellipse cx="${CX}" cy="104" rx="70" ry="22" fill="#fff" opacity=".6" filter="url(#spo-soft)"/>
<ellipse cx="86" cy="206" rx="30" ry="46" fill="#b9a68d" opacity=".25" filter="url(#spo-soft)"/>
<ellipse cx="334" cy="206" rx="30" ry="46" fill="#b9a68d" opacity=".25" filter="url(#spo-soft)"/>
<path d="${flowDark}" fill="none" stroke="#c9b79e" stroke-width=".9" stroke-linecap="round" opacity=".5"/>
<path d="${flowLight}" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity=".85"/>
</g>
<path d="${headFront}" fill="url(#spo-fur)"/>
<path d="${crest}" fill="#fffdf8"/>
<path d="${star4(CX, 128, 24, 15, 0.16)}" fill="url(#spo-gold)" stroke="#fff3c0" stroke-width=".8"/>
<path d="${star4(CX, 128, 30, 20, 0.14)}" fill="#ffd36a" opacity=".35" filter="url(#spo-blur2)"/>
<path d="M138 132Q148 126 164 128M282 132Q272 126 256 128" fill="none" stroke="#e1a02e" stroke-width="3.2" stroke-linecap="round" opacity=".9"/>
<path d="${muzzleFlow}" fill="none" stroke="#e4d8c4" stroke-width=".8" stroke-linecap="round" opacity=".6"/>
${face()}
${EYES.map((e, i) => eye(i, e.cx, e.dir)).join('')}
${glasses()}
</g>
</svg>`;
}
