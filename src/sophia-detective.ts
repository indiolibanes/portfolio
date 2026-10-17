/**
 * Sophia detetive: chapéu de caçador (deerstalker), lupa e vestido lunar,
 * andando de lá pra cá atrás de vestígios. Desenho em perfil, virado para a
 * direita; a ida e a volta são o mesmo desenho espelhado por CSS.
 *
 * O chão fica em y = GROUND; a personagem é desenhada com os pés em y = 0 e
 * escalada por SCALE. As animações vivem em sophia-illustration.css (.sdt-*).
 */
import { star4 } from './sophia-draw.ts';

export const DET_W = 520;
export const DET_H = 160;
export const GROUND = 148;
const SCALE = 0.85;

function defs(): string {
  return `<defs>
<linearGradient id="sdt-fur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="#e9dcc0"/></linearGradient>
<linearGradient id="sdt-ear" gradientUnits="userSpaceOnUse" x1="0" y1="-136" x2="0" y2="-90"><stop offset="0" stop-color="#0a1038"/><stop offset=".45" stop-color="#26348a"/><stop offset=".75" stop-color="#a7a9c6"/><stop offset="1" stop-color="#fffaf0"/></linearGradient>
<linearGradient id="sdt-tail" gradientUnits="userSpaceOnUse" x1="-60" y1="-90" x2="-10" y2="-30"><stop offset="0" stop-color="#0c1240"/><stop offset=".5" stop-color="#2a3a92"/><stop offset=".8" stop-color="#b9b6c8"/><stop offset="1" stop-color="#fffaf0"/></linearGradient>
<linearGradient id="sdt-navy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f3f9c"/><stop offset="1" stop-color="#10184a"/></linearGradient>
<linearGradient id="sdt-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0505a"/><stop offset="1" stop-color="#a31322"/></linearGradient>
<linearGradient id="sdt-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b0"/><stop offset=".5" stop-color="#f0b73e"/><stop offset="1" stop-color="#b9771d"/></linearGradient>
<linearGradient id="sdt-tweed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a98557"/><stop offset="1" stop-color="#6f5230"/></linearGradient>
<radialGradient id="sdt-glass" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#e8fbff" stop-opacity=".85"/><stop offset="1" stop-color="#7cc8e8" stop-opacity=".35"/></radialGradient>
<radialGradient id="sdt-iris" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffd46a"/><stop offset="1" stop-color="#b56a14"/></radialGradient>
<clipPath id="sdt-hat-clip"><path d="M-20 -92Q-18 -118 4 -120Q26 -118 26 -94Q4 -100 -20 -92Z"/></clipPath>
<filter id="sdt-blur" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="2.4"/></filter>
</defs>`;
}

const leg = (x: number): string =>
  `<rect x="${x - 4}" y="-26" width="8" height="20" rx="4" fill="url(#sdt-fur)"/>` +
  `<path d="M${x - 5} -8h11q4 0 4 4v4h-15z" fill="url(#sdt-navy)"/>`;

/** Pistas no chão: papel "404", pegadas e uma pasta. */
function clues(): string {
  const paw = (x: number, y: number, r: number) =>
    `<g transform="translate(${x} ${y}) rotate(${r})" fill="#9aa4d8" opacity=".8"><ellipse cx="0" cy="0" rx="4.2" ry="3.4"/><circle cx="-4.6" cy="-4.6" r="1.7"/><circle cx="-1.6" cy="-6.6" r="1.7"/><circle cx="1.8" cy="-6.6" r="1.7"/><circle cx="4.8" cy="-4.6" r="1.7"/></g>`;
  const glint = (x: number, y: number, cls: string) =>
    `<g class="sdt-glint ${cls}"><path d="${star4(x, y, 9, 9, 0.18)}" fill="url(#sdt-gold)"/></g>`;
  return `<g>
<g transform="translate(${210} ${GROUND - 1}) rotate(-6)"><path d="M-13 0V-15L-5 -19L13 -17V0Z" fill="#efe7d3"/><path d="M-13 -15L-5 -19L-5 -14Z" fill="#cfc4aa"/><text x="0" y="-5" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-weight="700" font-size="8.5" fill="#9a2330">404</text></g>
${glint(210, GROUND - 24, 'sdt-c1')}
${paw(282, GROUND - 3, 70)}${paw(296, GROUND - 6, 60)}${paw(310, GROUND - 3, 75)}
${glint(296, GROUND - 22, 'sdt-c3')}
<g transform="translate(${380} ${GROUND - 1})"><path d="M-14 0V-14Q-14 -17 -11 -17H-4L-1 -20H10Q13 -20 13 -17V0Z" fill="#e0b64a"/><path d="M-14 -11H13V0H-14Z" fill="#f4cf6a"/><text x="0" y="-3" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-weight="700" font-size="8" fill="#7a5410">?</text></g>
${glint(380, GROUND - 28, 'sdt-c2')}
</g>`;
}

function sophia(): string {
  const bow = `<path d="M10 -62L1 -67Q-2 -61 5 -58ZM10 -62L19 -67Q22 -61 15 -58Z" fill="url(#sdt-red)"/><circle cx="10" cy="-62" r="2.4" fill="#b11626"/>`;
  return `<g class="sdt-flip"><g transform="scale(${SCALE})"><g class="sdt-bob">
<g class="sdt-tail"><path d="M-14 -30C-40 -26 -62 -40 -60 -66C-58 -84 -42 -90 -36 -78C-44 -72 -44 -58 -34 -50C-28 -44 -18 -44 -12 -40Z" fill="url(#sdt-tail)"/><path d="M-56 -78Q-50 -70 -44 -74" fill="none" stroke="#f0b73e" stroke-width="1.2" stroke-linecap="round" opacity=".9"/></g>
<g class="sdt-legs-stand">${leg(-6)}${leg(8)}</g>
<g class="sdt-legs-walk"><g class="sdt-leg-a">${leg(-6)}</g><g class="sdt-leg-b">${leg(8)}</g></g>
<g class="sdt-lean">
<g class="sdt-cape"><path d="M-12 -58Q-32 -50 -34 -22Q-24 -28 -17 -36Z" fill="url(#sdt-red)"/><path d="M-30 -30Q-28 -42 -18 -50" fill="none" stroke="#ff9aa2" stroke-width="1.2" opacity=".6"/></g>
<path d="M-22 -20Q-26 -36 -14 -58L15 -58Q27 -36 22 -20Q0 -14 -22 -20Z" fill="url(#sdt-navy)"/>
<path d="M-22 -20Q0 -14 22 -20" fill="none" stroke="url(#sdt-gold)" stroke-width="1.8" stroke-linecap="round"/>
<path d="M-12 -34Q-6 -30 -12 -24Q-2 -28 -12 -34Z" fill="url(#sdt-gold)"/>
<path transform="translate(8 -32) rotate(18)" d="M0 -5A5 5 0 0 0 0 5A7.4 7.4 0 0 1 0 -5Z" fill="url(#sdt-gold)"/>
<path d="${star4(-2, -44, 3.4, 3.4, 0.2)}" fill="url(#sdt-gold)"/><path d="${star4(14, -26, 3, 3, 0.2)}" fill="url(#sdt-gold)"/>
<path d="M-12 -58Q0 -52 14 -58" fill="none" stroke="url(#sdt-gold)" stroke-width="1.6" stroke-linecap="round"/>
${bow}
<g class="sdt-arm">
<path d="M2 -56Q16 -54 22 -44L16 -38Q8 -44 0 -46Z" fill="url(#sdt-red)"/>
<path d="M18 -46L24 -40L17 -37Z" fill="#fff3dc"/>
<g class="sdt-lens"><path d="M24 -42L40 -52" stroke="url(#sdt-gold)" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="-42" r="5" fill="url(#sdt-navy)"/><circle cx="50" cy="-58" r="12" fill="url(#sdt-glass)"/><circle cx="50" cy="-58" r="12" fill="none" stroke="url(#sdt-gold)" stroke-width="3"/><path d="M42 -62Q46 -68 53 -68" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".9"/></g>
</g>
<g class="sdt-head">
<path d="M-14 -90Q-30 -116 -22 -134Q-4 -118 4 -94Z" fill="url(#sdt-ear)"/>
<path d="M6 -94Q10 -118 26 -132Q34 -112 24 -90Z" fill="url(#sdt-ear)"/>
<path d="M-10 -94Q-20 -112 -18 -124" fill="none" stroke="#f7d9cc" stroke-width="2.2" stroke-linecap="round" opacity=".8"/>
<path d="M-18 -78L-33 -74L-22 -69L-30 -62L-17 -61Z" fill="#f1e6cc"/>
<ellipse cx="4" cy="-80" rx="24" ry="21" fill="url(#sdt-fur)"/>
<ellipse cx="25" cy="-76" rx="8" ry="6" fill="#fffaf0"/>
<ellipse cx="14" cy="-69" rx="6" ry="3.2" fill="#ff8fa6" opacity=".45" filter="url(#sdt-blur)"/>
<g class="sdt-eye"><ellipse cx="14" cy="-82" rx="8" ry="7.6" fill="#fff4dc"/><circle cx="16" cy="-82" r="6" fill="url(#sdt-iris)"/><circle cx="16.6" cy="-82" r="3" fill="#150b06"/><circle cx="19" cy="-85" r="1.8" fill="#fff"/><path d="M6 -84Q10 -91 20 -88" fill="none" stroke="#1b1210" stroke-width="2" stroke-linecap="round"/><path d="M7 -85L-3 -92" stroke="#1b1210" stroke-width="2" stroke-linecap="round"/></g>
<ellipse cx="31" cy="-78" rx="2.8" ry="2.2" fill="#2a1d22"/>
<path d="M30 -73Q26 -68 20 -70" fill="none" stroke="#c4566a" stroke-width="1.3" stroke-linecap="round"/>
<path d="M-8 -96Q-14 -92 -9 -88" fill="none" stroke="url(#sdt-gold)" stroke-width="1.6" stroke-linecap="round"/>
<g>
<path d="M-20 -94Q-34 -94 -41 -88Q-30 -87 -20 -90Z" fill="#5d4326"/>
<path d="M22 -97Q40 -98 47 -92Q38 -88 22 -91Z" fill="#5d4326"/>
<path d="M-20 -92Q-18 -118 4 -120Q26 -118 26 -94Q4 -100 -20 -92Z" fill="url(#sdt-tweed)"/>
<g clip-path="url(#sdt-hat-clip)" stroke="#4a3320" stroke-width=".9" opacity=".7" fill="none"><path d="M-12 -124L-26 -90M-2 -124L-16 -90M8 -124L-6 -90M18 -124L4 -90M28 -124L14 -90"/><path d="M-22 -110H30M-22 -102H30"/></g>
<path d="M-19 -95Q4 -101 26 -97" fill="none" stroke="#3b2a18" stroke-width="2.4" stroke-linecap="round"/>
<path d="M-4 -120Q4 -128 12 -120Q4 -116 -4 -120Z" fill="#5d4326"/><circle cx="4" cy="-120" r="2.4" fill="#3b2a18"/>
</g>
</g>
</g>
</g></g></g>`;
}

/** Marcas de surpresa; ficam fora do grupo espelhado para nunca virarem de ponta-cabeça. */
function pops(): string {
  const t = (cls: string, ch: string) =>
    `<text class="sdt-pop ${cls}" x="26" y="-124" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-weight="800" font-size="20" fill="#f0b73e" stroke="#2b1c05" stroke-width=".8" paint-order="stroke">${ch}</text>`;
  return t('sdt-p1', '?') + t('sdt-p2', '!') + t('sdt-p3', '?');
}

export function detectiveMarkup(): string {
  return `<svg class="sophia-art sophia-art--detective" viewBox="0 0 ${DET_W} ${DET_H}" aria-hidden="true" focusable="false">
${defs()}
<path d="M8 ${GROUND + 1}H${DET_W - 8}" stroke="#3a3f66" stroke-width="1.4" stroke-dasharray="2 6" stroke-linecap="round"/>
${clues()}
<g class="sdt-walker" transform="translate(260 ${GROUND})">
<ellipse cx="0" cy="1" rx="26" ry="3.4" fill="#000" opacity=".5"/>
${sophia()}
${pops()}
</g>
</svg>`;
}
