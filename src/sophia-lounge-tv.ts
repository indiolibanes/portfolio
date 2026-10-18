/**
 * A TV de tubo gigante e o videogame da sala. A TV está virada para a Sophia
 * (para a esquerda), então a vemos só pela lateral: o gabinete afunilado do
 * tubo, a moldura de perfil e a borda curva do vidro, de onde escorre o brilho
 * catódico (cores que piscam) sobre o chão e a Sophia. A tela em si não aparece.
 * Desenhado direto em coordenadas da cena (SCENE_W × SCENE_H).
 */
import { n1 as n, star4 } from './sophia-draw.ts';

/** Face do vidro e chão. */
const GX = 770;
const FLOOR = 428;
const TOP = 196;
const BASE = 398;

export function tvDefs(): string {
  const cone = (id: string, color: string, o: number, cy: number, ry: number) =>
    `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${GX - 2}" cy="${cy}" r="380" gradientTransform="translate(${GX - 2} ${cy}) scale(1 ${n(ry / 380)}) translate(${-(GX - 2)} ${-cy})"><stop offset="0" stop-color="${color}" stop-opacity="${o}"/><stop offset=".4" stop-color="${color}" stop-opacity="${o * 0.45}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
  return `
<linearGradient id="slo-tv-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4d5c"/><stop offset=".12" stop-color="#2e303c"/><stop offset=".6" stop-color="#1b1c25"/><stop offset="1" stop-color="#0d0e14"/></linearGradient>
<linearGradient id="slo-tv-bezel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8b6ae"/><stop offset=".25" stop-color="#8e8d89"/><stop offset="1" stop-color="#4b4a4c"/></linearGradient>
<linearGradient id="slo-tv-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8fdff"/><stop offset=".5" stop-color="#8fe9ff"/><stop offset="1" stop-color="#c8a4ff"/></linearGradient>
<linearGradient id="slo-cone-fade" gradientUnits="userSpaceOnUse" x1="${GX - 2}" y1="0" x2="${GX - 120}" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#fff"/></linearGradient>
<mask id="slo-cone-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="480"><rect width="1200" height="480" fill="url(#slo-cone-fade)"/></mask>
<linearGradient id="slo-tv-cab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b2a22"/><stop offset="1" stop-color="#150e0b"/></linearGradient>
${cone('slo-cone-c', '#7fe8ff', 0.75, 300, 210)}${cone('slo-cone-m', '#ff6fc8', 0.7, 350, 150)}${cone('slo-cone-a', '#ffc46b', 0.6, 250, 120)}`;
}

/** A TV (de lado), com gabinete, antena e a borda do vidro brilhando. */
export function tvMarkup(): string {
  const slots: string[] = [];
  for (let i = 0; i < 9; i += 1) {
    const x = 846 + i * 13;
    const y = 214 + (x - 846) * 0.34;
    slots.push(`M${x} ${y}l9 3.2`);
  }
  const grille: string[] = [];
  for (let i = 0; i < 7; i += 1) grille.push(`M${828} ${316 + i * 7}h34`);
  return `<g class="slo-tv">
<ellipse cx="880" cy="${FLOOR + 3}" rx="168" ry="10" fill="#000" opacity=".55" filter="url(#slo-soft)"/>
<g>
<path d="M756 ${BASE}H1004V${FLOOR - 2}Q1004 ${FLOOR} 1000 ${FLOOR}H760Q756 ${FLOOR} 756 ${FLOOR - 2}Z" fill="url(#slo-tv-cab)"/>
<path d="M756 ${BASE}H1004" stroke="#6b4a38" stroke-width="1.4"/>
<path d="M766 ${BASE + 9}H994V${FLOOR - 7}H766Z" fill="none" stroke="#050404" stroke-width="1.2" opacity=".7"/>
<path d="M770 ${FLOOR - 4}H990" stroke="url(#slo-led)" stroke-width="2" opacity=".95"/>
<path d="M770 ${FLOOR - 4}H990" stroke="url(#slo-led)" stroke-width="5" opacity=".5" filter="url(#slo-glow-s)"/>
</g>
<g stroke="#9aa0b4" stroke-width="2.2" stroke-linecap="round" fill="none"><path d="M880 ${TOP + 10}L846 118"/><path d="M880 ${TOP + 10}L936 126"/></g>
<circle cx="846" cy="118" r="3.6" fill="url(#slo-gold)"/><circle cx="936" cy="126" r="3.6" fill="url(#slo-gold)"/>
<path d="M866 ${TOP + 14}Q880 ${TOP - 2} 894 ${TOP + 14}Z" fill="#2a2c36" stroke="#4b4f60" stroke-width="1"/>
<path d="M814 ${TOP + 8}C870 ${TOP + 8} 940 ${TOP + 30} 996 ${TOP + 66}Q1012 ${TOP + 104} 996 ${TOP + 142}C940 ${TOP + 176} 870 ${BASE - 4} 814 ${BASE - 4}Z" fill="url(#slo-tv-body)"/>
<path d="M814 ${TOP + 9}C870 ${TOP + 9} 940 ${TOP + 31} 996 ${TOP + 67}" fill="none" stroke="#ff9ad8" stroke-width="1.4" opacity=".4" stroke-linecap="round"/>
<path d="${slots.join('')}" stroke="#050609" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>
<path d="M990 ${TOP + 78}Q1004 ${TOP + 104} 990 ${TOP + 128}" fill="none" stroke="#3a3d4c" stroke-width="3" stroke-linecap="round"/>
<path d="M822 ${TOP + 100}H986V${TOP + 144}H822Z" fill="#0f1017" opacity=".6"/>
<path d="${grille.join('')}" stroke="#05060a" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>
<path d="${star4(930, TOP + 118, 11, 11, 0.2)}" fill="url(#slo-gold)"/>
<path d="M880 ${TOP + 168}h100" stroke="#e8d9a8" stroke-width="1.2" opacity=".5"/><path d="M880 ${TOP + 174}h64" stroke="#e8d9a8" stroke-width="1.2" opacity=".35"/>
<rect x="${GX + 2}" y="${TOP + 2}" width="44" height="${BASE - TOP - 4}" rx="9" fill="url(#slo-tv-bezel)" stroke="#2a2a2e" stroke-width="1.2"/>
<path d="M${GX + 8} ${TOP + 8}V${BASE - 10}" stroke="#fff" stroke-width="1.6" opacity=".35" stroke-linecap="round"/>
<circle cx="${GX + 34}" cy="${BASE - 22}" r="2.4" fill="#ff3b3b" class="slo-led slo-led-b"/>
<path d="M${GX + 22} ${BASE - 22}h6M${GX + 22} ${BASE - 28}h6" stroke="#1c1d22" stroke-width="2" stroke-linecap="round"/>
</g>`;
}

/** O vidro em perfil e o brilho que escorre dele (camadas que piscam em ritmos diferentes). */
export function tvGlow(): string {
  const cone = (cls: string, id: string, pts: string) => `<g class="${cls}"><path d="${pts}" fill="url(#${id})"/></g>`;
  return `<g class="slo-tv-glow" pointer-events="none">
<g mask="url(#slo-cone-mask)">${cone('slo-crt-a', 'slo-cone-c', `M${GX - 2} 90A380 210 0 0 0 ${GX - 2} 510Z`)}
${cone('slo-crt-b', 'slo-cone-m', `M${GX - 2} 200A380 150 0 0 0 ${GX - 2} 500Z`)}
${cone('slo-crt-c', 'slo-cone-a', `M${GX - 2} 130A380 120 0 0 0 ${GX - 2} 370Z`)}</g>
<g class="slo-crt-a"><ellipse cx="${GX - 120}" cy="${FLOOR + 6}" rx="190" ry="20" fill="#7fe8ff" opacity=".28" filter="url(#slo-soft)"/></g>
<g class="slo-crt-b"><ellipse cx="${GX - 90}" cy="${FLOOR + 10}" rx="140" ry="14" fill="#ff6fc8" opacity=".25" filter="url(#slo-soft)"/></g>
<g class="slo-crt-a"><path d="M${GX + 3} ${TOP + 6}Q${GX - 10} ${(TOP + BASE) / 2} ${GX + 3} ${BASE - 6}" fill="none" stroke="#9fefff" stroke-width="10" opacity=".7" filter="url(#slo-glow-s)"/></g>
<path d="M${GX + 3} ${TOP + 6}Q${GX - 7} ${(TOP + BASE) / 2} ${GX + 3} ${BASE - 6}" fill="none" stroke="url(#slo-tv-glass)" stroke-width="4.4" stroke-linecap="round"/>
<path d="M${GX - 1} ${TOP + 40}Q${GX - 6} ${(TOP + BASE) / 2} ${GX - 1} ${BASE - 50}" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>
</g>`;
}

/** Console com cartucho, no chão entre a Sophia e a TV, e os cabos até a TV e o controle dela. */
export function consoleMarkup(): string {
  return `<g class="slo-console">
<path d="M648 468Q560 478 504 430T456 384" fill="none" stroke="#06070b" stroke-width="5" stroke-linecap="round"/>
<path d="M648 468Q560 478 504 430T456 384" fill="none" stroke="#c0262f" stroke-width="2.4" stroke-linecap="round" opacity=".95"/>
<path d="M738 458Q756 450 762 424" fill="none" stroke="#06070b" stroke-width="4" stroke-linecap="round"/>
<ellipse cx="694" cy="462" rx="56" ry="5" fill="#000" opacity=".5" filter="url(#slo-soft)"/>
<path d="M642 436H744Q748 436 748 441V458Q748 462 744 462H642Q638 462 638 458V441Q638 436 642 436Z" fill="#171923" stroke="#2c3042" stroke-width="1.2"/>
<path d="M642 437H744" stroke="#6b7392" stroke-width="1.2" opacity=".6"/>
<path d="M654 428H690V436H654Z" fill="#2b2f3f" stroke="#454b66" stroke-width="1"/>
<path d="M658 431h28" stroke="#ffd34d" stroke-width="2" stroke-linecap="round"/>
<path d="${star4(672, 432, 4, 4, 0.2)}" fill="#ff5f9a"/>
<path d="M702 446h30M702 451h22" stroke="#05060a" stroke-width="2" stroke-linecap="round" opacity=".8"/>
<circle cx="646" cy="449" r="2.6" fill="#ff8a1f" class="slo-led slo-led-b"/>
<circle cx="740" cy="442" r="2" fill="#59d2ff" class="slo-led slo-led-c"/>
</g>`;
}

/** Luz catódica por cima da Sophia (leve, para colorir o pelo de frente). */
export function tvSpill(): string {
  return `<g pointer-events="none" opacity=".5">
<g class="slo-crt-a"><path d="M${GX - 2} 110A380 190 0 0 0 ${GX - 2} 490Z" fill="url(#slo-cone-c)" opacity=".5"/></g>
<g class="slo-crt-b"><path d="M${GX - 2} 200A380 150 0 0 0 ${GX - 2} 500Z" fill="url(#slo-cone-m)" opacity=".45"/></g>
</g>`;
}
