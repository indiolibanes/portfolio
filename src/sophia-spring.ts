/**
 * Primavera na Alemanha medieval, com a Sophia correndo de braços para trás,
 * no estilo "chibi correndo" da Frieren: olhos fechados de alegria, boca aberta,
 * orelhas e fitas voando. Ilustração vetorial gerada no build; as animações
 * vivem em curiosidades.css (.spr-*). Desenhada em 1200×300; o castelo fica no
 * centro para sobreviver ao corte em telas estreitas.
 */
import { n1, rng, star4 } from './sophia-draw.ts';

export const SPR_W = 1200;
export const SPR_H = 300;
const INK = '#2b2536';

/** Linha de colina: y em função de x (a mesma regra desenha o contorno e posiciona o que fica em cima). */
const hill = (base: number, amp: number, wave: number, phase: number) => (x: number): number =>
  base + amp * Math.sin(x / wave + phase) + amp * 0.5 * Math.sin(x / (wave * 0.43) + phase * 2);

function hillPath(fy: (x: number) => number, fill: string): string {
  let d = `M0 ${n1(fy(0))}`;
  for (let x = 24; x <= SPR_W + 24; x += 24) d += `L${x} ${n1(fy(x))}`;
  return `<path d="${d}L${SPR_W + 24} ${SPR_H}L0 ${SPR_H}Z" fill="${fill}"/>`;
}

function defs(): string {
  return `<defs>
<linearGradient id="spr-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ccbee"/><stop offset=".6" stop-color="#cfeaf4"/><stop offset="1" stop-color="#fff0cf"/></linearGradient>
<linearGradient id="spr-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0cf" stop-opacity="0"/><stop offset="1" stop-color="#fff0cf" stop-opacity=".7"/></linearGradient>
<radialGradient id="spr-sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fffbe0"/><stop offset=".35" stop-color="#fff2b0" stop-opacity=".8"/><stop offset="1" stop-color="#fff2b0" stop-opacity="0"/></radialGradient>
<linearGradient id="spr-tail" gradientUnits="userSpaceOnUse" x1="-8" y1="-36" x2="-72" y2="-100"><stop offset="0" stop-color="#fffaf0"/><stop offset=".45" stop-color="#f1e7d2"/><stop offset=".62" stop-color="#34459d"/><stop offset="1" stop-color="#121a4c"/></linearGradient>
<linearGradient id="spr-ear" gradientUnits="userSpaceOnUse" x1="0" y1="-90" x2="-56" y2="-132"><stop offset="0" stop-color="#fffaf0"/><stop offset=".45" stop-color="#e6dfe8"/><stop offset=".7" stop-color="#34459d"/><stop offset="1" stop-color="#121a4c"/></linearGradient>
<linearGradient id="spr-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b0"/><stop offset=".5" stop-color="#f0b73e"/><stop offset="1" stop-color="#b9771d"/></linearGradient>
</defs>`;
}

function sky(): string {
  const cloud = (x: number, y: number, k: number, cls: string) =>
    `<g class="spr-cloud ${cls}" opacity=".92"><g transform="translate(${x} ${y}) scale(${k})" fill="#fff"><ellipse cx="0" cy="0" rx="46" ry="14"/><ellipse cx="-22" cy="-10" rx="22" ry="14"/><ellipse cx="10" cy="-16" rx="26" ry="17"/><ellipse cx="34" cy="-6" rx="18" ry="11"/></g></g>`;
  return `<rect width="${SPR_W}" height="${SPR_H}" fill="url(#spr-sky)"/>
<circle cx="190" cy="74" r="70" fill="url(#spr-sun)"/><circle cx="190" cy="74" r="22" fill="#fff8cc"/>
${cloud(330, 62, 1, 'spr-cloud-a')}${cloud(820, 46, 1.25, 'spr-cloud-b')}${cloud(1050, 92, 0.8, 'spr-cloud-a')}${cloud(60, 110, 0.7, 'spr-cloud-b')}`;
}

function alps(): string {
  const peaks: [number, number][] = [[0, 168], [70, 112], [120, 140], [210, 84], [290, 150], [370, 118], [450, 164], [520, 150], [690, 150], [760, 160], [840, 96], [920, 150], [1000, 116], [1080, 150], [1140, 100], [1200, 150]];
  const mount = peaks.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');
  const snow = [[70, 112], [210, 84], [370, 118], [840, 96], [1000, 116], [1140, 100]]
    .map(([x, y]) => `<path d="M${x} ${y}L${x - 20} ${y + 26}L${x - 8} ${y + 20}L${x} ${y + 30}L${x + 9} ${y + 20}L${x + 21} ${y + 26}Z" fill="#fff"/>`)
    .join('');
  return `<path d="${mount}L1200 220L0 220Z" fill="#a9bfd9"/>${snow}<rect y="130" width="${SPR_W}" height="100" fill="url(#spr-haze)"/>`;
}

function conifer(x: number, y: number, h: number, fill: string): string {
  const w = h * 0.42;
  return `<path d="M${n1(x)} ${n1(y - h)}L${n1(x + w)} ${n1(y - h * 0.3)}L${n1(x + w * 0.5)} ${n1(y - h * 0.3)}L${n1(x + w * 1.1)} ${n1(y)}L${n1(x - w * 1.1)} ${n1(y)}L${n1(x - w * 0.5)} ${n1(y - h * 0.3)}L${n1(x - w)} ${n1(y - h * 0.3)}Z" fill="${fill}"/>`;
}

function castle(): string {
  const roof = '#4f6f9c';
  const wall = '#f3ecda';
  const shade = '#d9cfb8';
  const tower = (x: number, w: number, top: number, bottom: number, rh: number) =>
    `<rect x="${x}" y="${top}" width="${w}" height="${bottom - top}" fill="${wall}"/><rect x="${x + w * 0.62}" y="${top}" width="${w * 0.38}" height="${bottom - top}" fill="${shade}"/>` +
    `<path d="M${x - 3} ${top}L${x + w / 2} ${top - rh}L${x + w + 3} ${top}Z" fill="${roof}"/><path d="M${x + w / 2} ${top - rh}L${x + w + 3} ${top}L${x + w / 2 + 2} ${top}Z" fill="#3b5680"/>` +
    `<rect x="${x + w * 0.3}" y="${top + 10}" width="${w * 0.18}" height="${Math.min(14, w * 0.5)}" rx="${w * 0.09}" fill="#3b4a6a"/>`;
  return `<g transform="translate(0 36)">
<path d="M520 214L560 150L600 138L690 136L730 152L770 214Z" fill="#8c7a63"/>
<path d="M520 214L560 150L582 146L560 214Z" fill="#a69580"/>
<path d="M548 176Q640 154 748 178L770 214L520 214Z" fill="#6aa65a"/>
<rect x="572" y="118" width="156" height="30" fill="${wall}"/><rect x="572" y="118" width="156" height="5" fill="${shade}"/>
${tower(574, 26, 82, 148, 30)}${tower(700, 28, 76, 148, 34)}
${tower(616, 40, 40, 148, 44)}${tower(664, 24, 62, 148, 26)}
<g fill="#3b4a6a">${[596, 628, 688].map((x) => `<rect x="${x}" y="126" width="6" height="12" rx="3"/>`).join('')}</g>
<path d="M636 -4V-16" stroke="#5a3a28" stroke-width="1.6"/><g class="spr-flag"><path d="M636 -16L654 -11L636 -6Z" fill="#c52c3b"/></g>
<path d="M713 42V30" stroke="#5a3a28" stroke-width="1.4"/><g class="spr-flag"><path d="M713 30L728 34L713 38Z" fill="#fff" stroke="#c52c3b" stroke-width=".8"/></g>
</g>`;
}

export function springBackground(): string {
  const r = rng(404);
  const far = hill(212, 9, 120, 0.4);
  const mid = hill(232, 11, 95, 1.7);
  const near = hill(256, 6, 130, 3.1);
  const trees: string[] = [];
  for (let x = 14; x < SPR_W; x += 15 + r() * 14) {
    if (x > 500 && x < 790) continue;
    trees.push(conifer(x, far(x) + 4, 18 + r() * 14, r() > 0.5 ? '#3f7f4a' : '#357043'));
  }
  const houses: string[] = [];
  const house = (x: number, w: number, h: number) => {
    const y = mid(x + w / 2) + 6;
    const rh = h * 0.7;
    return `<g><rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="#f4e6c8"/><path d="M${x} ${y - h}L${x + w} ${y}M${x + w} ${y - h}L${x} ${y}M${x + w / 2} ${y - h}V${y}" stroke="#5a3a28" stroke-width="1.3" opacity=".8"/><rect x="${x}" y="${y - h}" width="${w}" height="${h}" fill="none" stroke="#5a3a28" stroke-width="1.6"/><path d="M${x - 4} ${y - h}L${x + w / 2} ${y - h - rh}L${x + w + 4} ${y - h}Z" fill="#a8452f"/><path d="M${x + w / 2} ${y - h - rh}L${x + w + 4} ${y - h}L${x + w / 2 + 3} ${y - h}Z" fill="#8a3624"/><rect x="${x + w * 0.4}" y="${y - h * 0.5}" width="${w * 0.2}" height="${h * 0.5}" fill="#5a3a28"/></g>`;
  };
  [[90, 36, 28], [140, 44, 34], [196, 34, 26], [352, 40, 30], [420, 34, 24], [828, 40, 30], [884, 34, 26], [1010, 44, 32], [1072, 36, 26], [1130, 40, 30]].forEach(([x, w, h]) => houses.push(house(x, w, h)));
  const my = mid(262) + 6;
  const church = `<g><rect x="250" y="${my - 40}" width="26" height="40" fill="#f4e6c8" stroke="#5a3a28" stroke-width="1.4"/><path d="M247 ${my - 40}L263 ${my - 78}L279 ${my - 40}Z" fill="#4f6f9c"/><rect x="258" y="${my - 30}" width="10" height="14" rx="5" fill="#3b4a6a"/><path d="M263 ${my - 78}V${my - 90}M259 ${my - 85}H267" stroke="#b9771d" stroke-width="1.6"/><rect x="276" y="${my - 24}" width="34" height="24" fill="#f4e6c8" stroke="#5a3a28" stroke-width="1.4"/><path d="M272 ${my - 24}L293 ${my - 38}L314 ${my - 24}Z" fill="#a8452f"/></g>`;
  let river = 'M-10 244';
  for (let x = 20; x <= SPR_W + 20; x += 20) river += `L${x} ${n1(246 + 5 * Math.sin(x / 70))}`;
  const bridge = `<g><path d="M900 252Q930 226 960 252" fill="none" stroke="#8c8678" stroke-width="7" stroke-linecap="round"/><path d="M890 246H970" stroke="#a69f90" stroke-width="5" stroke-linecap="round"/><path d="M906 252Q930 232 954 252" fill="#7fc0e0" opacity=".9"/></g>`;
  const blossoms: string[] = [];
  const tree = (x: number, y: number, k: number, seed: number) => {
    const rr = rng(seed);
    const puffs: string[] = [];
    const cols = ['#f8bfd2', '#fbd5e0', '#f4a9c3', '#fff1f5'];
    for (let i = 0; i < 18; i += 1) puffs.push(`<circle cx="${n1((rr() - 0.5) * 70)}" cy="${n1(-70 - rr() * 44)}" r="${n1(12 + rr() * 11)}" fill="${cols[Math.floor(rr() * cols.length)]}"/>`);
    return `<g transform="translate(${x} ${y}) scale(${k})"><path d="M-7 0L-4 -48L-18 -78M-4 -48L8 -80M2 -60L22 -88M-7 0H9L5 -48Z" fill="none" stroke="#5a3a28" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>${puffs.join('')}</g>`;
  };
  blossoms.push(tree(34, 262, 1.05, 11), tree(1166, 262, 1.0, 21), tree(470, 236, 0.5, 31), tree(822, 238, 0.5, 41), tree(180, 238, 0.55, 51), tree(1000, 236, 0.5, 61));
  const flowers: string[] = [];
  const fcol = ['#fff', '#ffd23f', '#ff8fb1', '#b79bff', '#fff'];
  for (let i = 0; i < 90; i += 1) {
    const x = r() * SPR_W;
    const y = 262 + r() * 36;
    flowers.push(`<circle cx="${n1(x)}" cy="${n1(y)}" r="${n1(1.3 + r() * 1.5)}" fill="${fcol[i % fcol.length]}"/>`);
  }
  const blades: string[] = [];
  for (let i = 0; i < 70; i += 1) {
    const x = r() * SPR_W;
    const y = 270 + r() * 30;
    blades.push(`M${n1(x)} ${n1(y)}q1 -5 ${n1(r() * 4 - 2)} -8`);
  }
  const petals: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    petals.push(`<ellipse class="spr-petal" cx="${n1(r() * SPR_W)}" cy="${n1(-10 - r() * 40)}" rx="3.2" ry="2" fill="${i % 2 ? '#f8bfd2' : '#fff'}" style="animation-delay:${n1(-r() * 9)}s;animation-duration:${n1(7 + r() * 5)}s"/>`);
  }
  return `${sky()}
${alps()}
${hillPath(far, '#8fc27a')}
${trees.join('')}
${castle()}
${hillPath(mid, '#6fae5c')}
${houses.join('')}${church}
<path d="${river}" fill="none" stroke="#8fd0ee" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${river}" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="6 18" opacity=".7" transform="translate(0 -2)"/>
${bridge}
${hillPath(near, '#52a04a')}
${blossoms.slice(2).join('')}
<path d="M0 276Q300 262 600 272T1200 268V300H0Z" fill="#d2b27c"/>
<path d="M0 276Q300 262 600 272T1200 268" fill="none" stroke="#b99660" stroke-width="2"/>
<path d="M0 292Q300 280 600 288T1200 284V300H0Z" fill="#3f8a3e"/>
${flowers.join('')}
<path d="${blades.join('')}" fill="none" stroke="#2f7a35" stroke-width="1.4" stroke-linecap="round"/>
${blossoms.slice(0, 2).join('')}
<g class="spr-petals">${petals.join('')}</g>`;
}

/** Sophia correndo (de frente para a direita, braços para trás), pés em y = 0. */
export function sophiaRunner(): string {
  const leg = (x: number, cls: string) =>
    `<g class="${cls}"><path d="M${x - 4.5} -26h9v18q0 3 -3 3h-3q-3 0 -3 -3z" fill="#fffaf0" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/><path d="M${x - 6} -9h14q4 0 4 4v5h-18z" fill="#2a3a92" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/></g>`;
  const arm = (cls: string, op = 1) =>
    `<g class="${cls}" opacity="${op}"><path d="M0 -52L-28 -42" stroke="${INK}" stroke-width="9.6" stroke-linecap="round"/><path d="M0 -52L-28 -42" stroke="#c52c3b" stroke-width="6.4" stroke-linecap="round"/><circle cx="-31" cy="-41" r="5.2" fill="#2a3a92" stroke="${INK}" stroke-width="1.4"/></g>`;
  const tufts = (side: 1 | -1) => {
    const x = 2 + side * 31;
    return `<path d="M${x} -92L${x + side * 9} -86L${x + side * 2} -80L${x + side * 10} -73L${x + side * 1} -68L${x - side * 6} -70Z" fill="#fffdf6" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`;
  };
  return `<g class="spr-bob">
<ellipse cx="0" cy="1" rx="26" ry="3.6" fill="#000" opacity=".25" class="spr-shadow"/>
<g class="spr-speed" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"><path d="M-62 -30h-26M-70 -48h-34M-62 -66h-22"/></g>
<g class="spr-tail"><path d="M-10 -34C-38 -30 -66 -44 -72 -74C-76 -98 -56 -110 -44 -96C-50 -84 -42 -70 -28 -62C-20 -56 -14 -52 -8 -50Z" fill="url(#spr-tail)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/><path d="M-58 -90l6 4M-62 -78l7 3" stroke="#f0b73e" stroke-width="1.5" stroke-linecap="round"/></g>
${leg(-6, 'spr-leg-a')}${leg(8, 'spr-leg-b')}
${arm('spr-arm-b', 0.92)}
<g class="spr-cape"><path d="M-8 -54Q-34 -50 -40 -28Q-22 -36 -10 -32Z" fill="#c52c3b" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/></g>
<path d="M-14 -24Q-16 -42 -10 -56L10 -56Q16 -42 14 -24Q0 -20 -14 -24Z" fill="#1e2a78" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M-14 -24Q0 -20 14 -24" fill="none" stroke="#f0b73e" stroke-width="2" stroke-linecap="round"/>
<path d="${star4(1, -38, 4.4, 4.4, 0.2)}" fill="url(#spr-gold)"/>
<path d="M0 -56L-8 -62Q-11 -56 -5 -53ZM0 -56L8 -62Q11 -56 5 -53Z" fill="#e2394a" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
${arm('spr-arm-a')}
<g class="spr-head">
<g class="spr-ear-b"><path d="M-20 -100C-32 -112 -46 -122 -58 -130C-44 -108 -36 -96 -26 -88Z" fill="url(#spr-ear)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/></g>
<g class="spr-ear-a"><path d="M8 -108C0 -122 -12 -134 -24 -140C-18 -122 -8 -108 0 -100Z" fill="url(#spr-ear)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/></g>
<g class="spr-ribbon"><path d="M-20 -98C-34 -92 -44 -104 -60 -96C-50 -90 -52 -84 -66 -82" fill="none" stroke="${INK}" stroke-width="5.4" stroke-linecap="round"/><path d="M-20 -98C-34 -92 -44 -104 -60 -96C-50 -90 -52 -84 -66 -82" fill="none" stroke="#e2394a" stroke-width="3" stroke-linecap="round"/></g>
${tufts(-1)}${tufts(1)}
<ellipse cx="2" cy="-84" rx="31" ry="27" fill="#fffdf6" stroke="${INK}" stroke-width="1.7"/>
<path d="${star4(2, -104, 6, 6, 0.2)}" fill="url(#spr-gold)" stroke="#b9771d" stroke-width=".6"/>
<ellipse cx="-17" cy="-74" rx="5.4" ry="3.2" fill="#ff8fa6" opacity=".65"/><ellipse cx="22" cy="-74" rx="5.4" ry="3.2" fill="#ff8fa6" opacity=".65"/>
<path d="M-15 -86Q-10 -94 -4 -86M9 -86Q15 -94 21 -86" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
<ellipse cx="3" cy="-79" rx="2.4" ry="1.8" fill="${INK}"/>
<path d="M-4 -75Q3 -63 10 -75Z" fill="#e8577a" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M-1 -71Q3 -66 7 -71" fill="#ff9fb4"/>
</g>
</g>`;
}

export function springMarkup(): string {
  return `<svg class="spring-art" viewBox="0 0 ${SPR_W} ${SPR_H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
${defs()}
${springBackground()}
<g class="spr-runner" transform="translate(560 282) scale(1.15)">${sophiaRunner()}</g>
</svg>`;
}
