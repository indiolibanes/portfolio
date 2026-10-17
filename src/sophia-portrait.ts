/**
 * Retrato da Sophia para o topo do jogo: ilustração vetorial (não pixel art).
 *
 * Fiel à Sophia original: raposa de pelagem marfim, orelhas enormes com as
 * pontas azul-marinho e o miolo felpudo, olhos âmbar grandes com delineador
 * alado, sobrancelhas douradas, estrela dourada na testa, focinho pequeno,
 * fitas vermelhas presas por enfeites dourados nas orelhas e laço vermelho com
 * broche no pescoço. Sem óculos. A animação é de "marionete": uma cabeça só, e
 * o CSS (sophia-illustration.css) inclina, baixa o olhar, fecha as pálpebras e
 * troca a boca. Ver `.spo-*` lá.
 */
import { type LockSpec, type Pt, locks, mirrorLocks, n1, poly, smooth, spline, star4, strands } from './sophia-draw.ts';

export const PORTRAIT_W = 420;
export const PORTRAIT_H = 440;
const Y0 = -80; // folga em cima: as orelhas são altas e a inclinação as leva para fora do quadro

const CX = PORTRAIT_W / 2;
const mx = (p: Pt): Pt => [PORTRAIT_W - p[0], p[1]];
const mirrorList = (pts: Pt[]): Pt[] => pts.map(mx);

/** Metade direita do contorno da cabeça, do topo ao queixo (chibi: cabeça larga, queixo pequeno). */
const HEAD_R: Pt[] = [
  [210, 82], [256, 84], [296, 98], [326, 124], [342, 156], [348, 190], [342, 226], [322, 262], [288, 292], [248, 310],
];
const HEAD: Pt[] = [...HEAD_R, [210, 314], ...mirrorList(HEAD_R).slice(1).reverse()];

const RUFF: Pt[] = [
  [86, 362], [96, 326], [128, 300], [176, 292], [244, 292], [292, 300], [324, 326], [334, 362],
];

/** Orelha esquerda: casca (azul → creme) e miolo felpudo. A direita é o espelho. */
const EAR_L_D =
  'M122 154C100 124 80 70 68 16C62-8 60-28 60-50C106-34 148 0 176 44C198 80 210 110 210 142C194 158 152 162 122 154Z';
const EAR_L_IN_D =
  'M126 142C112 120 104 100 100 78C98 66 100 58 104 52C132 66 154 80 170 98C184 114 192 126 194 142C176 150 148 152 126 140Z';
/** Espelha um caminho só com comandos absolutos (M, C, Z). */
function mirrorPath(d: string): string {
  const tokens = d.match(/[MCZ]|-?\d+(?:\.\d+)?/g) ?? [];
  const out: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[MCZ]/.test(t)) {
      out.push(t);
      i += 1;
    } else {
      out.push(`${n1(PORTRAIT_W - Number(t))} ${tokens[i + 1]}`);
      i += 2;
    }
  }
  return out.join(' ');
}

/** Plumas de pelo do miolo da orelha esquerda (apontam para a ponta). */
const EAR_PLUMES: LockSpec[] = [
  [186, 134, -110, 30, 16, 0.1], [176, 114, -114, 32, 16, 0.1], [162, 98, -118, 32, 15, 0.08], [146, 82, -120, 30, 14, 0.06], [128, 66, -122, 28, 12, 0.05],
  [104, 122, -104, 26, 14, -0.1], [100, 100, -100, 28, 14, -0.08], [100, 80, -98, 26, 12, -0.05], [104, 62, -96, 22, 10, 0],
  [140, 118, -112, 36, 16, 0.1], [122, 96, -108, 34, 14, 0.08],
];

/** Mechas das bochechas (lado esquerdo; o direito é espelhado). */
const CHEEK_L: LockSpec[] = [
  [104, 146, 200, 30, 20, -0.12], [96, 166, 188, 36, 22, -0.1], [90, 188, 176, 40, 24, -0.1], [88, 210, 162, 40, 24, -0.1],
  [94, 232, 148, 38, 24, -0.1], [106, 252, 134, 36, 22, -0.1], [126, 272, 120, 30, 20, -0.1],
  [112, 178, 182, 28, 16, -0.1], [108, 222, 150, 28, 16, -0.1],
];
/** Topete entre as orelhas. */
const CREST: LockSpec[] = [
  [176, 100, -140, 30, 16, 0.2], [194, 92, -115, 34, 16, 0.15], [212, 88, -95, 34, 17, 0.05], [230, 92, -70, 32, 16, -0.1],
  [246, 100, -48, 28, 16, -0.2], [204, 96, -105, 26, 12, 0.1],
];
/** Pelagem do peito/pescoço. */
const CHEST: LockSpec[] = [
  [128, 312, 215, 32, 16, -0.1],
];

const EYES = [
  { cx: 154, dir: -1 },
  { cx: 266, dir: 1 },
] as const;
const EYE_Y = 198;

/** Olho amendoado: `ox` cresce para fora (para a orelha), `oy` para baixo. Canto externo mais alto. */
function eyePath(cx: number, dir: number): string {
  const P = (ox: number, oy: number) => `${n1(cx + dir * ox)} ${n1(EYE_Y + oy)}`;
  return `M${P(-30, 6)}C${P(-22, -22)} ${P(14, -38)} ${P(34, -8)}C${P(22, 18)} ${P(-14, 30)} ${P(-30, 6)}Z`;
}

function defs(): string {
  return `<defs>
<radialGradient id="spo-glow" cx="50%" cy="46%" r="52%"><stop offset="0" stop-color="#6f86ff" stop-opacity=".30"/><stop offset=".55" stop-color="#2c3c9a" stop-opacity=".14"/><stop offset="1" stop-color="#101845" stop-opacity="0"/></radialGradient>
<radialGradient id="spo-fur" cx="50%" cy="38%" r="72%"><stop offset="0" stop-color="#fffefb"/><stop offset=".6" stop-color="#fcf4e4"/><stop offset="1" stop-color="#eddcbb"/></radialGradient>
<linearGradient id="spo-fur-back" gradientUnits="userSpaceOnUse" x1="0" y1="80" x2="0" y2="320"><stop offset="0" stop-color="#f3e7cd"/><stop offset="1" stop-color="#dcc9a4"/></linearGradient>
<linearGradient id="spo-ear" gradientUnits="userSpaceOnUse" x1="0" y1="-50" x2="0" y2="160"><stop offset="0" stop-color="#0a1038"/><stop offset=".3" stop-color="#18246c"/><stop offset=".44" stop-color="#2d3b8c"/><stop offset=".56" stop-color="#9aa0c8"/><stop offset=".66" stop-color="#f3ebdb"/><stop offset=".78" stop-color="#fffaf0"/><stop offset="1" stop-color="#fffdf8"/></linearGradient>
<linearGradient id="spo-ear-in" gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="150"><stop offset="0" stop-color="#f6e6d8"/><stop offset=".5" stop-color="#fff5e8"/><stop offset="1" stop-color="#fdeadb"/></linearGradient>
<linearGradient id="spo-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b0"/><stop offset=".5" stop-color="#f0b73e"/><stop offset="1" stop-color="#b9771d"/></linearGradient>
<radialGradient id="spo-iris" cx="50%" cy="40%" r="64%"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".4" stop-color="#f7b83c"/><stop offset=".8" stop-color="#c9741a"/><stop offset="1" stop-color="#7a3c10"/></radialGradient>
<linearGradient id="spo-lidshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1608" stop-opacity=".6"/><stop offset=".55" stop-color="#2a1608" stop-opacity="0"/></linearGradient>
<linearGradient id="spo-paw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d3d8f"/><stop offset="1" stop-color="#121a4a"/></linearGradient>
<linearGradient id="spo-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0505a"/><stop offset="1" stop-color="#b11626"/></linearGradient>
<linearGradient id="spo-coat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3a92"/><stop offset="1" stop-color="#0f1647"/></linearGradient>
<radialGradient id="spo-nose" cx="40%" cy="30%" r="70%"><stop offset="0" stop-color="#5b4650"/><stop offset="1" stop-color="#1c1216"/></radialGradient>
<radialGradient id="spo-muzzle" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fffefa"/><stop offset=".65" stop-color="#fffefa" stop-opacity=".9"/><stop offset="1" stop-color="#fffefa" stop-opacity="0"/></radialGradient>
<radialGradient id="spo-gem" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffd0e0"/><stop offset="1" stop-color="#d23a72"/></radialGradient>
<filter id="spo-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="spo-blur2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2"/></filter>
<clipPath id="spo-head-clip"><path d="${smooth(HEAD)}"/></clipPath>
${EYES.map((e, i) => `<clipPath id="spo-eye-clip-${i}"><path d="${eyePath(e.cx, e.dir)}"/></clipPath>`).join('')}
</defs>`;
}

function ear(side: 'l' | 'r'): string {
  const l = side === 'l';
  const shell = l ? EAR_L_D : mirrorPath(EAR_L_D);
  const cavity = l ? EAR_L_IN_D : mirrorPath(EAR_L_IN_D);
  const plumes = l ? EAR_PLUMES : mirrorLocks(EAR_PLUMES, CX);
  const spots: Pt[] = [[72, 4], [80, 40], [88, 70]];
  const sparkle = (l ? spots : mirrorList(spots)).map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r=".9" fill="#aab4ee"/>`).join('');
  return `<g class="spo-ear spo-ear-${side}">
<path d="${shell}" fill="url(#spo-ear)"/>
${sparkle}
<path d="${cavity}" fill="url(#spo-ear-in)"/>
<path d="${locks(plumes, 4)}" fill="#efe2cb"/>
<path d="${locks(plumes)}" fill="#fffbf3"/>
</g>`;
}

/** Enfeite dourado na base da orelha com o grampo vermelho e as fitas que balançam. */
function ornament(side: 'l' | 'r'): string {
  const l = side === 'l';
  const ax = l ? 110 : PORTRAIT_W - 110;
  const s = l ? 1 : -1;
  const X = (dx: number) => n1(ax + s * dx);
  return `<g class="spo-tassel">
<path d="M${X(-4)} 154C${X(-8)} 196 ${X(-14)} 222 ${X(-22)} 252L${X(-12)} 243L${X(-10)} 258C${X(-2)} 222 ${X(2)} 192 ${X(4)} 154Z" fill="url(#spo-red)"/>
<path d="M${X(2)} 154C${X(6)} 178 ${X(6)} 198 ${X(2)} 220L${X(8)} 213L${X(12)} 224C${X(14)} 200 ${X(14)} 176 ${X(10)} 154Z" fill="url(#spo-red)" opacity=".92"/>
<path d="M${X(-1)} 156C${X(-4)} 190 ${X(-8)} 214 ${X(-14)} 238" fill="none" stroke="#7d0e1a" stroke-width=".8" opacity=".4"/>
<path d="M${X(-12)} 130C${X(-18)} 122 ${X(-8)} 112 ${X(-2)} 118C${X(2)} 122 ${X(0)} 128 ${X(-4)} 128" fill="none" stroke="url(#spo-gold)" stroke-width="2.4" stroke-linecap="round"/>
<path d="M${X(-14)} 146C${X(-8)} 156 ${X(4)} 156 ${X(10)} 146" fill="none" stroke="url(#spo-gold)" stroke-width="2" stroke-linecap="round"/>
<circle cx="${X(-2)}" cy="144" r="8" fill="url(#spo-gold)"/>
<circle cx="${X(-2)}" cy="144" r="4.6" fill="#d1263a"/>
<circle cx="${X(-3.4)}" cy="142.4" r="1.4" fill="#ffb0b8"/>
</g>`;
}

function eye(i: number, cx: number, dir: number): string {
  const y = EYE_Y;
  const X = (ox: number) => n1(cx + dir * ox);
  const upper = `M${X(-30)} ${y + 6}C${X(-22)} ${y - 22} ${X(14)} ${y - 38} ${X(34)} ${y - 8}`;
  const wing = `M${X(18)} ${y - 24}Q${X(44)} ${y - 22} ${X(62)} ${y - 36}Q${X(54)} ${y - 14} ${X(38)} ${y - 3}L${X(30)} ${y - 8}Z`;
  return `<g class="spo-eye" transform="translate(${cx} ${y}) scale(1.16) translate(${-cx} ${-y})">
<g class="spo-open">
<g clip-path="url(#spo-eye-clip-${i})">
<rect x="${cx - 46}" y="${y - 46}" width="92" height="84" fill="#fff4dc"/>
<g class="spo-gaze">
<circle cx="${n1(cx + dir * -1)}" cy="${y - 1}" r="22" fill="url(#spo-iris)"/>
<circle cx="${n1(cx + dir * -1)}" cy="${y - 1}" r="22" fill="none" stroke="#6e3510" stroke-width="2" opacity=".7"/>
<circle cx="${n1(cx + dir * -1)}" cy="${y - 1}" r="10.5" fill="#150b06"/>
<circle cx="${n1(cx + dir * 6)}" cy="${y - 8}" r="5.2" fill="#fff"/>
<circle cx="${n1(cx + dir * -8)}" cy="${y + 9}" r="2.4" fill="#fff" opacity=".85"/>
<circle cx="${n1(cx + dir * 12)}" cy="${y + 8}" r="1.1" fill="#fff6c8"/>
<circle cx="${n1(cx + dir * -14)}" cy="${y - 6}" r="1" fill="#fff6c8"/>
<circle cx="${n1(cx + dir * 4)}" cy="${y + 15}" r="1" fill="#fff6c8"/>
</g>
<rect x="${cx - 46}" y="${y - 46}" width="92" height="42" fill="url(#spo-lidshade)"/>
<g class="spo-lid"><rect x="${cx - 48}" y="${y - 122}" width="96" height="84" fill="url(#spo-fur)"/><path d="M${cx - 48} ${y - 38}H${cx + 48}" stroke="#1b1210" stroke-width="3.4"/></g>
</g>
<path d="${upper}" fill="none" stroke="#1b1210" stroke-width="5.4" stroke-linecap="round"/>
<path d="${wing}" fill="#1b1210"/>
<path d="M${X(-30)} ${y + 6}C${X(-14)} ${y + 30} ${X(10)} ${y + 24} ${X(24)} ${y + 8}" fill="none" stroke="#3b2a22" stroke-width="1.5" stroke-linecap="round" opacity=".8"/>
<path d="M${X(-30)} ${y + 6}L${X(-38)} ${y + 12}" stroke="#1b1210" stroke-width="2" stroke-linecap="round"/>
</g>
<path class="spo-happy" d="M${X(30)} ${y + 6}Q${X(2)} ${y - 30} ${X(-28)} ${y + 8}M${X(30)} ${y + 6}L${X(50)} ${y - 8}" fill="none" stroke="#1b1210" stroke-width="5.4" stroke-linecap="round"/>
</g>
<path d="M${X(-22)} ${y - 50}Q${X(-2)} ${y - 62} ${X(26)} ${y - 56}" fill="none" stroke="#e1a02e" stroke-width="3.4" stroke-linecap="round"/>`;
}

function face(): string {
  return `
<ellipse cx="${CX}" cy="252" rx="58" ry="44" fill="url(#spo-muzzle)"/>
<path d="M${CX - 8} 240Q${CX} 235 ${CX + 8} 240Q${CX + 7} 249 ${CX} 253Q${CX - 7} 249 ${CX - 8} 240Z" fill="url(#spo-nose)"/>
<ellipse cx="${CX - 2.4}" cy="239.6" rx="2.6" ry="1.1" fill="#fff" opacity=".55"/>
<path d="M${CX} 253V259" stroke="#3a2420" stroke-width="1.8" stroke-linecap="round"/>
<g class="spo-mouth spo-mouth-calm" fill="none" stroke="#3a2420" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M${CX} 259Q${CX - 5} 266 ${CX - 14} 261"/><path d="M${CX} 259Q${CX + 5} 266 ${CX + 14} 261"/></g>
<g class="spo-mouth spo-mouth-grin">
<path d="M${CX - 28} 257Q${CX} 264 ${CX + 28} 257Q${CX + 25} 292 ${CX} 294Q${CX - 25} 292 ${CX - 28} 257Z" fill="#4a1620"/>
<clipPath id="spo-mouth-clip"><path d="M${CX - 28} 257Q${CX} 264 ${CX + 28} 257Q${CX + 25} 292 ${CX} 294Q${CX - 25} 292 ${CX - 28} 257Z"/></clipPath>
<g clip-path="url(#spo-mouth-clip)"><ellipse cx="${CX}" cy="294" rx="20" ry="14" fill="#e8798b"/><path d="M${CX} 282V294" stroke="#c4566a" stroke-width="1.4"/></g>
<path d="M${CX - 18} 260L${CX - 14} 270L${CX - 9} 262Z M${CX + 18} 260L${CX + 14} 270L${CX + 9} 262Z" fill="#fff"/>
<path d="M${CX - 28} 257Q${CX} 264 ${CX + 28} 257" fill="none" stroke="#2a0f14" stroke-width="2.2" stroke-linecap="round"/>
</g>
<ellipse class="spo-blush" cx="${CX - 78}" cy="248" rx="20" ry="10" fill="#ff9aa8"/>
<ellipse class="spo-blush" cx="${CX + 78}" cy="248" rx="20" ry="10" fill="#ff9aa8"/>`;
}

/** Corpo: gola felpuda, jaleco branco com friso dourado, laço vermelho com broche e luvas azul-marinho. */
function body(): string {
  const ruffOutline = spline(RUFF, true, 5);
    const chest = [...CHEST, ...mirrorLocks(CHEST, CX)];
  const paw = (x: number) => `<g class="spo-paw">
<path d="M${x - 28} 360V346Q${x - 28} 322 ${x} 322Q${x + 28} 322 ${x + 28} 346V360Z" fill="url(#spo-paw)"/>
<path d="M${x - 9} 342V360M${x + 9} 342V360" stroke="#0c1236" stroke-width="1.5" opacity=".55"/>
<path d="M${x - 20} 334Q${x - 8} 326 ${x + 4} 328" fill="none" stroke="#7c8cd6" stroke-width="2" stroke-linecap="round" opacity=".45"/>
<path d="${star4(x, 340, 6, 4, 0.2)}" fill="url(#spo-gold)"/>
</g>`;
  return `<g class="spo-body">
<path transform="translate(1 3)" d="${locks(chest, 2)}" fill="#e6d6b6"/>
<path d="${poly(ruffOutline)}" fill="url(#spo-fur)"/>
<path d="${locks(chest)}" fill="#fffaf0"/>
<path d="M132 360L138 322Q160 306 188 304L210 338L232 304Q260 306 282 322L288 360Z" fill="url(#spo-coat)"/>
<path d="M132 360L136 326Q142 316 156 312L176 306L168 332L162 360ZM288 360L284 326Q278 316 264 312L244 306L252 332L258 360Z" fill="url(#spo-red)"/>
<path d="M136 326Q142 316 156 312L176 306L168 332M284 326Q278 316 264 312L244 306L252 332" fill="none" stroke="url(#spo-gold)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M186 306Q192 316 198 308Q204 320 210 310Q216 320 222 308Q228 316 234 306L210 338Z" fill="#0c123a" stroke="url(#spo-gold)" stroke-width="1.4" stroke-linejoin="round"/>
<path d="${star4(176, 346, 6, 4, 0.2)}" fill="url(#spo-gold)"/><path d="${star4(244, 346, 6, 4, 0.2)}" fill="url(#spo-gold)"/><path d="${star4(210, 354, 5, 3.4, 0.2)}" fill="url(#spo-gold)"/>
<path d="M210 326L192 318Q186 330 198 336ZM210 326L228 318Q234 330 222 336Z" fill="url(#spo-red)"/>
<path d="M205 332L196 360L204 354L208 362L212 336ZM215 332L224 360L216 354L212 362L208 336Z" fill="url(#spo-red)"/>
<circle cx="210" cy="327" r="4.4" fill="#b11626"/>
<path transform="translate(207 343) rotate(8)" d="M0 -9A9 9 0 0 0 0 9A13 13 0 0 1 0 -9Z" fill="url(#spo-gold)"/>
<circle cx="212" cy="343" r="3.6" fill="url(#spo-gem)"/>
${paw(112)}${paw(308)}
</g>`;
}

export function portraitMarkup(): string {
  const headOutline = spline(HEAD, true, 5);
  const cheek = [...CHEEK_L, ...mirrorLocks(CHEEK_L, CX)];
  const flowDark = strands(headOutline, { seed: 31, count: 70, from: [CX, 230], len: [9, 18], jitter: 0.22 });
  const flowLight = strands(headOutline, { seed: 32, count: 50, from: [CX, 220], len: [8, 14], jitter: 0.22 });

  return `<svg class="sophia-art sophia-art--portrait" viewBox="0 ${Y0} ${PORTRAIT_W} ${PORTRAIT_H}" aria-hidden="true" focusable="false">
${defs()}
<ellipse cx="${CX}" cy="150" rx="210" ry="200" fill="url(#spo-glow)"/>
${body()}
<g class="spo-head">
${ear('l')}${ear('r')}
<path transform="translate(1.5 4)" d="${locks(cheek, 2)}${locks(CREST, 2)}" fill="url(#spo-fur-back)"/>
<path d="${smooth(HEAD)}" fill="url(#spo-fur)"/>
<g clip-path="url(#spo-head-clip)">
<ellipse cx="${CX}" cy="312" rx="120" ry="40" fill="#a98e72" opacity=".26" filter="url(#spo-soft)"/>
<ellipse cx="${CX}" cy="92" rx="70" ry="22" fill="#fff" opacity=".7" filter="url(#spo-soft)"/>
<ellipse cx="84" cy="220" rx="30" ry="50" fill="#b9a68d" opacity=".24" filter="url(#spo-soft)"/>
<ellipse cx="336" cy="220" rx="30" ry="50" fill="#b9a68d" opacity=".24" filter="url(#spo-soft)"/>
<ellipse cx="${EYES[0].cx}" cy="${EYE_Y + 16}" rx="40" ry="20" fill="#f0b45a" opacity=".2" filter="url(#spo-soft)"/>
<ellipse cx="${EYES[1].cx}" cy="${EYE_Y + 16}" rx="40" ry="20" fill="#f0b45a" opacity=".2" filter="url(#spo-soft)"/>
<path d="${flowDark}" fill="none" stroke="#c9b79e" stroke-width=".9" stroke-linecap="round" opacity=".45"/>
<path d="${flowLight}" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity=".85"/>
</g>
<path d="${locks(cheek)}${locks(CREST)}" fill="#fffbf1"/>
<path d="${star4(CX, 124, 30, 17, 0.16)}" fill="url(#spo-gold)" stroke="#fff3c0" stroke-width=".8"/>
<path d="${star4(CX, 124, 36, 23, 0.14)}" fill="#ffd36a" opacity=".3" filter="url(#spo-blur2)"/>
<path d="${star4(CX + 5, 84, 10, 6, 0.2)}" fill="url(#spo-gold)"/>
<path d="${star4(CX - 2, 160, 9, 5.4, 0.2)}" fill="url(#spo-gold)"/>
${face()}
${EYES.map((e, i) => eye(i, e.cx, e.dir)).join('')}
${ornament('l')}${ornament('r')}
</g>
</svg>`;
}
