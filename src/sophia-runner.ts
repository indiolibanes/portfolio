/**
 * Sophia correndo, de frente (3/4), para a faixa de curiosidades da home.
 *
 * Os trejeitos vêm do gif de corrida da Frieren (7 quadros, 20 fps): cabeça
 * grande que balança e inclina a cada passo, olhos fechados de alegria, boca
 * aberta, corpo que quica, braços jogados para trás, capa batendo e o rabo de
 * cavalo chicoteando para o alto e para baixo. Aqui o rabo de cavalo vira o rabo
 * da Sophia, a capa vira o sobretudo vermelho do traje lunar, e tudo corre para
 * a direita (o gif corre para a esquerda: está espelhado).
 *
 * A cabeça é a mesma do retrato (sophia-portrait.ts). O movimento vive em
 * sophia-corrida.css (`.srun-*`). O desenho é feito no chão y = RUN_GROUND.
 */
import { type Pt, limb, n1, poly, spline, star4, tufts } from './sophia-draw.ts';
import { headMarkup, portraitDefs } from './sophia-portrait.ts';

export const RUN_X0 = -56;
export const RUN_W = 416;
export const RUN_H = 470;
export const RUN_GROUND = 452;

const TAIL_C: Pt[] = [[150, 346], [112, 358], [70, 348], [34, 312], [20, 264], [38, 224], [74, 206]];
const TAIL_W = [26, 54, 80, 92, 86, 62, 8];

function defs(): string {
  return `${portraitDefs()}
<defs>
<linearGradient id="srun-tail" gradientUnits="userSpaceOnUse" x1="150" y1="350" x2="30" y2="200"><stop offset="0" stop-color="#f3ead6"/><stop offset=".38" stop-color="#fbf4e3"/><stop offset=".52" stop-color="#8b91bf"/><stop offset=".64" stop-color="#2a3886"/><stop offset="1" stop-color="#0d1448"/></linearGradient>
<linearGradient id="srun-tail-back" gradientUnits="userSpaceOnUse" x1="150" y1="350" x2="30" y2="200"><stop offset="0" stop-color="#c9bba0"/><stop offset=".38" stop-color="#d6c9af"/><stop offset=".52" stop-color="#5a639f"/><stop offset=".66" stop-color="#18246a"/><stop offset="1" stop-color="#0a1040"/></linearGradient>
<linearGradient id="srun-skirt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b2672"/><stop offset="1" stop-color="#0d1445"/></linearGradient>
<linearGradient id="srun-lining" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7e6"/><stop offset="1" stop-color="#d9d3ea"/></linearGradient>
<radialGradient id="srun-shadow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#241438" stop-opacity=".55"/><stop offset="1" stop-color="#241438" stop-opacity="0"/></radialGradient>
</defs>`;
}

/** Perna: coxa de pelo marfim sob a saia e meia azul-marinho com patinha e estrela. `x` é o quadril. */
function leg(x: number, cls: string): string {
  return `<g class="srun-leg ${cls}" style="transform-origin:${x}px 350px">
<path d="M${x - 11} 346H${x + 11}L${x + 9} 400H${x - 9}Z" fill="url(#spo-fur)"/>
<g class="srun-shin" style="transform-origin:${x}px 398px">
<path d="M${x - 10} 396H${x + 10}L${x + 8} 440H${x - 8}Z" fill="url(#spo-paw)"/>
<path d="M${x - 9} 430Q${x - 13} 449 ${x + 1} 452Q${x + 24} 453 ${x + 22} 440Q${x + 14} 432 ${x - 9} 430Z" fill="url(#spo-paw)"/>
<path d="M${x - 5} 440Q${x + 8} 434 ${x + 18} 440" fill="none" stroke="#7c8cd6" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>
<path d="${star4(x + 1, 414, 7, 4.6, 0.2)}" fill="url(#spo-gold)"/>
</g>
</g>`;
}

/** Braço: manga larga vermelha forrada de marfim e luva azul-marinho. `x` é o ombro. */
function arm(x: number, cls: string, back: boolean): string {
  const p = back ? '#7a1522' : 'url(#spo-red)';
  return `<g class="srun-arm ${cls}" style="transform-origin:${x}px 262px">
<path d="M${x - 11} 258Q${x - 18} 290 ${x - 16} 312L${x + 16} 312Q${x + 18} 290 ${x + 11} 258Z" fill="${p}"/>
<path d="M${x - 16} 312L${x + 16} 312L${x + 13} 322Q${x} 328 ${x - 13} 322Z" fill="url(#srun-lining)"/>
<path d="M${x - 16} 312H${x + 16}" stroke="url(#spo-gold)" stroke-width="1.6"/>
<ellipse cx="${x}" cy="332" rx="12" ry="11" fill="url(#spo-paw)"/>
<path d="${star4(x, 332, 5, 3.4, 0.2)}" fill="url(#spo-gold)"/>
</g>`;
}

export function runnerMarkup(): string {
  const tailShape = limb(TAIL_C, TAIL_W);
  const fringe = tufts(tailShape, { seed: 311, len: [8, 16], width: [12, 18], gap: 6, bend: 7 });
  const fringe2 = tufts(tailShape, { seed: 312, len: [4, 8], width: [10, 14], gap: 5, bend: 4 });
  const constel: Pt[] = [[40, 262], [26, 292], [46, 322], [34, 236], [58, 214]];
  const skirtHem = spline([[128, 372], [158, 388], [190, 392], [222, 388], [252, 372]], false, 6);

  const tail = `<g class="srun-tail" style="transform-origin:150px 346px">
<path d="${fringe}" fill="url(#srun-tail-back)"/>
<path d="${poly(tailShape)}" fill="url(#srun-tail)"/>
<path d="${fringe2}" fill="url(#srun-tail)"/>
<path d="M${constel.map((c) => `${c[0]} ${c[1]}`).join('L')}" fill="none" stroke="#f3c75a" stroke-width="1.4" stroke-dasharray="1 4" stroke-linecap="round"/>
${constel.map((c, i) => `<path d="${star4(c[0], c[1], i % 2 ? 7 : 11, i % 2 ? 4.6 : 7, 0.2)}" fill="url(#spo-gold)"/>`).join('')}
</g>`;

  const torso = `<g class="srun-torso" style="transform-origin:190px 330px">
<path d="M156 254Q190 242 226 254L220 324Q190 334 160 324Z" fill="url(#spo-coat)"/>
<path d="M170 252Q176 262 182 254Q188 266 194 256Q200 266 206 254Q212 262 216 252L194 290Z" fill="#0c123a" stroke="url(#spo-gold)" stroke-width="1.1" stroke-linejoin="round"/>
<g class="srun-cape srun-cape-l" style="transform-origin:160px 256px"><path d="M162 252Q146 256 140 272L146 296L168 282Z" fill="url(#spo-red)"/><path d="M146 296L168 282" stroke="url(#spo-gold)" stroke-width="1.4" stroke-linecap="round"/></g>
<g class="srun-cape srun-cape-r" style="transform-origin:220px 256px"><path d="M218 252Q234 256 240 272L234 296L212 282Z" fill="url(#spo-red)"/><path d="M234 296L212 282" stroke="url(#spo-gold)" stroke-width="1.4" stroke-linecap="round"/></g>
<path d="M190 288L180 276Q176 288 186 292ZM190 288L200 276Q204 288 194 292Z" fill="url(#spo-red)"/>
<circle cx="190" cy="285" r="3.6" fill="#b11626"/>
<path d="M190 296Q182 304 190 312Q198 304 190 296Z" fill="url(#spo-gem)" stroke="url(#spo-gold)" stroke-width="1.2"/>
<path d="M160 320Q190 330 220 320L218 332Q190 342 162 332Z" fill="url(#spo-red)"/>
<path d="${star4(176, 328, 5, 3.4, 0.2)}" fill="url(#spo-gold)"/><path d="${star4(204, 328, 5, 3.4, 0.2)}" fill="url(#spo-gold)"/>
</g>`;

  const skirt = `<g class="srun-skirt" style="transform-origin:190px 330px">
<path d="M162 328Q190 338 218 328L254 374Q190 396 126 374Z" fill="url(#srun-skirt)"/>
<path d="M184 336L198 336L220 382Q198 390 178 384Z" fill="url(#srun-lining)" opacity=".92"/>
<path d="M${skirtHem.map((q) => `${n1(q[0])} ${n1(q[1])}`).join('L')}" fill="none" stroke="url(#spo-gold)" stroke-width="2.4" stroke-linecap="round"/>
<path transform="translate(150 360) rotate(18)" d="M0 -6A6 6 0 0 0 0 6A8.7 8.7 0 0 1 0 -6Z" fill="url(#spo-gold)"/>
<path transform="translate(236 362) rotate(-12)" d="M0 -5A5 5 0 0 0 0 5A7.3 7.3 0 0 1 0 -5Z" fill="url(#spo-gold)"/>
<path d="M166 340L144 380M214 340L238 380" stroke="#0a1038" stroke-width="1.6" opacity=".35" stroke-linecap="round"/>
</g>`;

  return `<svg class="sophia-art srun" viewBox="${RUN_X0} 0 ${RUN_W} ${RUN_H}" aria-hidden="true" focusable="false">
${defs()}
<ellipse class="srun-shadow" cx="190" cy="${RUN_GROUND + 2}" rx="78" ry="9" fill="url(#srun-shadow)"/>
<g class="srun-lean"><g class="srun-bob">
${tail}
${arm(156, 'srun-arm-b', true)}
${leg(172, 'srun-leg-b')}${leg(208, 'srun-leg-a')}
${torso}
${skirt}
${arm(224, 'srun-arm-a', false)}
<g transform="translate(192 170) scale(.6) translate(-210 -200)">${headMarkup('srun-head')}</g>
</g></g>
</svg>`;
}
