/**
 * Sophia de perfil, sentada no tapete, jogando (parte da sala gamer).
 * Coordenadas locais: (0,0) é o ponto do chão sob o quadril, ela olha para +x.
 * O grupo é posicionado e escalado por sophia-lounge.ts.
 */
import { type Pt, limb, n1, poly, smooth, spline, star4, strands, tufts } from './sophia-draw.ts';

const TORSO: Pt[] = [
  [-54, -6], [-66, -44], [-62, -92], [-46, -140], [-24, -180], [0, -208], [30, -224], [58, -228],
  [78, -206], [76, -170], [80, -130], [72, -90], [62, -50], [48, -18], [10, -2],
];
const THIGH: Pt[] = [[-58, -24], [-50, -68], [-8, -92], [34, -82], [62, -46], [58, -12], [20, 0], [-30, 0]];
const FOOT: Pt[] = [[34, -20], [78, -26], [112, -17], [124, -3], [100, 3], [40, 3]];

const HEAD: Pt[] = [
  [28, -292], [62, -302], [94, -294], [116, -280], [136, -266], [158, -250], [172, -241], [170, -230],
  [154, -222], [130, -210], [100, -200], [66, -196], [36, -205], [14, -224], [8, -248], [14, -272],
];
const EAR_NEAR: Pt[] = [[20, -282], [10, -324], [2, -362], [-2, -408], [34, -386], [64, -352], [86, -318], [82, -284]];
const EAR_NEAR_IN: Pt[] = [[32, -290], [25, -316], [22, -338], [26, -354], [44, -340], [62, -320], [75, -304], [70, -290]];
const EAR_FAR: Pt[] = [[64, -292], [66, -336], [78, -378], [98, -414], [112, -372], [118, -328], [114, -290]];

const TAIL_CENTER: Pt[] = [[-46, -36], [-92, -38], [-140, -30], [-182, -48], [-208, -92], [-210, -140], [-192, -184], [-166, -208]];
const TAIL_W = [26, 44, 58, 64, 66, 60, 40, 6];

const ARM_NEAR_C: Pt[] = [[32, -178], [54, -138], [78, -112], [106, -100]];
const ARM_FAR_C: Pt[] = [[42, -178], [72, -142], [100, -120], [134, -108]];

export function foxDefs(): string {
  return `
<linearGradient id="slo-fur" gradientUnits="userSpaceOnUse" x1="-60" y1="0" x2="150" y2="0"><stop offset="0" stop-color="#9aa0c2"/><stop offset=".45" stop-color="#d9dbeb"/><stop offset="1" stop-color="#f6f6ff"/></linearGradient>
<linearGradient id="slo-fur-dark" gradientUnits="userSpaceOnUse" x1="-60" y1="0" x2="150" y2="0"><stop offset="0" stop-color="#6e7499"/><stop offset="1" stop-color="#b2b7d3"/></linearGradient>
<linearGradient id="slo-fur-far" gradientUnits="userSpaceOnUse" x1="-60" y1="0" x2="150" y2="0"><stop offset="0" stop-color="#737aa0"/><stop offset="1" stop-color="#c0c4de"/></linearGradient>
<linearGradient id="slo-tail" gradientUnits="userSpaceOnUse" x1="-92" y1="-20" x2="-206" y2="-150"><stop offset="0" stop-color="#cfd2e6"/><stop offset=".34" stop-color="#d9dbec"/><stop offset=".52" stop-color="#7f88bd"/><stop offset=".64" stop-color="#263582"/><stop offset="1" stop-color="#121b52"/></linearGradient>
<linearGradient id="slo-tail-back" gradientUnits="userSpaceOnUse" x1="-92" y1="-20" x2="-206" y2="-150"><stop offset="0" stop-color="#9ba1c4"/><stop offset=".4" stop-color="#9ea5cb"/><stop offset=".55" stop-color="#4a5596"/><stop offset=".68" stop-color="#18246a"/><stop offset="1" stop-color="#0c1240"/></linearGradient>
<linearGradient id="slo-ear" gradientUnits="userSpaceOnUse" x1="0" y1="-414" x2="0" y2="-284"><stop offset="0" stop-color="#0e1642"/><stop offset=".5" stop-color="#1d2b7c"/><stop offset=".68" stop-color="#6c76b2"/><stop offset=".84" stop-color="#d4d6e8"/><stop offset="1" stop-color="#f1f1fb"/></linearGradient>
<linearGradient id="slo-ear-far" gradientUnits="userSpaceOnUse" x1="0" y1="-414" x2="0" y2="-284"><stop offset="0" stop-color="#0b1238"/><stop offset=".55" stop-color="#18246a"/><stop offset=".8" stop-color="#4a5596"/><stop offset="1" stop-color="#9aa1c8"/></linearGradient>
<linearGradient id="slo-ear-in" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dcdcee"/><stop offset="1" stop-color="#d7a9b0"/></linearGradient>
<linearGradient id="slo-navy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34459d"/><stop offset="1" stop-color="#121a4c"/></linearGradient>
<linearGradient id="slo-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b0"/><stop offset=".5" stop-color="#f0b73e"/><stop offset="1" stop-color="#b9771d"/></linearGradient>
<radialGradient id="slo-iris" cx="50%" cy="42%" r="62%"><stop offset="0" stop-color="#ffe28a"/><stop offset=".4" stop-color="#f6b33a"/><stop offset=".8" stop-color="#c4701c"/><stop offset="1" stop-color="#6e3510"/></radialGradient>
<linearGradient id="slo-lens-c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ff3ff" stop-opacity=".72"/><stop offset="1" stop-color="#1b9bc4" stop-opacity=".62"/></linearGradient>
<linearGradient id="slo-lens-r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6b6b" stop-opacity=".85"/><stop offset="1" stop-color="#a81d2a" stop-opacity=".8"/></linearGradient>
<linearGradient id="slo-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ee4a55"/><stop offset="1" stop-color="#a31322"/></linearGradient>
<linearGradient id="slo-pad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f4f"/><stop offset=".5" stop-color="#1b1e28"/><stop offset="1" stop-color="#0b0c11"/></linearGradient>
<linearGradient id="slo-rim" gradientUnits="userSpaceOnUse" x1="20" y1="0" x2="170" y2="0"><stop offset="0" stop-color="#bff4ff" stop-opacity="0"/><stop offset="1" stop-color="#bff4ff" stop-opacity=".3"/></linearGradient>
<linearGradient id="slo-rim-warm" gradientUnits="userSpaceOnUse" x1="0" y1="-300" x2="0" y2="0"><stop offset=".6" stop-color="#ff7a59" stop-opacity="0"/><stop offset="1" stop-color="#ff9a79" stop-opacity=".12"/></linearGradient>
<radialGradient id="slo-nose" cx="40%" cy="30%" r="70%"><stop offset="0" stop-color="#5b4a56"/><stop offset="1" stop-color="#150e12"/></radialGradient>
<filter id="slo-fblur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".7"/></filter>
<clipPath id="slo-fox-clip"><path d="${poly(spline(TORSO, true, 5))}"/><path d="${poly(spline(THIGH, true, 5))}"/><path d="${smooth(HEAD)}"/><path d="${smooth(EAR_NEAR)}"/><path d="${smooth(EAR_FAR)}"/><path d="${poly(limb(ARM_NEAR_C, [34, 30, 24, 22]))}"/><path d="${poly(limb(TAIL_CENTER, TAIL_W))}"/></clipPath>`;
}

function furShape(outline: Pt[], fill: string, seed: number, o: { len?: [number, number]; gap?: number; where?: (p: Pt, n: Pt) => boolean; flow?: number; from?: Pt; edge?: boolean } = {}): string {
  // os tufos usam o mesmo preenchimento do corpo: a borda fica felpuda, sem halo
  const fringe = tufts(outline, { seed, len: o.len ?? [7, 15], width: [11, 17], gap: o.gap ?? 6, bend: 6, where: o.where });
  const flow = o.flow ? strands(outline, { seed: seed + 7, count: o.flow, from: o.from ?? [0, -120], len: [8, 18], jitter: 0.3 }) : '';
  return `<path d="${fringe}" fill="${fill}"/>
<path d="${poly(outline)}" fill="${fill}"${o.edge ? ' stroke="#6d7499" stroke-opacity=".5" stroke-width="1.4"' : ''}/>${flow ? `<path d="${flow}" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".3"/>` : ''}`;
}

function controller(): string {
  // gamepad visto de lado/três-quartos, nas patas; centro em (126,-98)
  return `<g class="slo-pad" transform="translate(126 -98) rotate(-7)">
<path d="M-40 -8Q-44 -16 -30 -17H30Q44 -16 40 -8Q46 6 38 14Q30 20 22 12L16 6H-16L-22 12Q-30 20 -38 14Q-46 6 -40 -8Z" fill="url(#slo-pad)" stroke="#05060a" stroke-width="1.2"/>
<path d="M-34 -15Q0 -21 34 -15" fill="none" stroke="#8892a8" stroke-width="1.2" opacity=".55" stroke-linecap="round"/>
<rect x="-6" y="-12" width="12" height="3" rx="1.5" fill="#3fd0ff" class="slo-pad-led"/>
<circle cx="-18" cy="-3" r="6" fill="#0a0b10" stroke="#2b2f3b" stroke-width="1"/><circle cx="-18" cy="-3" r="3.2" fill="#262a36"/>
<circle cx="14" cy="4" r="6" fill="#0a0b10" stroke="#2b2f3b" stroke-width="1"/><circle cx="14" cy="4" r="3.2" fill="#262a36"/>
<g class="slo-btns"><circle cx="24" cy="-9" r="3" fill="#ffd34d"/><circle cx="30" cy="-4" r="3" fill="#ff5f6f"/><circle cx="18" cy="-4" r="3" fill="#59d2ff"/><circle cx="24" cy="1" r="3" fill="#6ee37f"/></g>
<path d="M-31 -3h10M-26 -8v10" stroke="#9aa3b8" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
</g>`;
}

function paw(x: number, y: number, rot: number, scale: number, fill: string): string {
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})">
<path d="M-20 4Q-24 -10 -8 -14Q8 -18 20 -6Q26 4 18 12Q4 18 -12 14Q-20 12 -20 4Z" fill="${fill}"/>
<path d="M-4 -12L-6 -2M6 -12L6 -1M15 -8L13 2" stroke="#0a1038" stroke-width="1.2" opacity=".6" stroke-linecap="round"/>
<path d="M-14 -8Q-2 -15 10 -12" fill="none" stroke="#8fa0ee" stroke-width="1.6" opacity=".45" stroke-linecap="round"/>
</g>`;
}

export function foxMarkup(): string {
  const torso = spline(TORSO, true, 5);
  const thigh = spline(THIGH, true, 5);
  const foot = spline(FOOT, true, 4);
  const head = spline(HEAD, true, 4);
  const earNear = spline(EAR_NEAR, true, 4);
  const earFar = spline(EAR_FAR, true, 4);
  const earIn = spline(EAR_NEAR_IN, true, 4);
  const tailShape = limb(TAIL_CENTER, TAIL_W);
  const armNear = limb(ARM_NEAR_C, [34, 30, 24, 22]);
  const armFar = limb(ARM_FAR_C, [30, 26, 22, 20]);

  const tailTufts = tufts(tailShape, { seed: 71, len: [12, 26], width: [16, 24], gap: 7, bend: 10 });
  const tailTufts2 = tufts(tailShape, { seed: 72, len: [6, 12], width: [12, 18], gap: 5, bend: 6 });
  const tailFlow = strands(tailShape, { seed: 73, count: 150, from: [-46, -36], len: [14, 30], jitter: 0.2 });

  // constelação dourada na ponta da cauda
  const stars: Pt[] = [[-188, -82], [-206, -112], [-198, -150], [-176, -168], [-164, -128], [-182, -112]];
  const lines = `M${stars.map((p) => `${p[0]} ${p[1]}`).join('L')}`;

  const chest = tufts(spline([[58, -228], [78, -206], [76, -170], [80, -130], [72, -90]], false, 4), { seed: 82, len: [14, 28], width: [14, 22], gap: 7, bend: 10, lean: -0.15 });

  const headBack = tufts(head, { seed: 91, len: [8, 16], width: [12, 18], gap: 5, bend: 6, where: (p) => p[0] < 116 });
  const muzzleHair = tufts(head, { seed: 92, len: [3, 6], width: [6, 9], gap: 6, bend: 2, where: (p) => p[0] >= 116 });
  const cheek = tufts(spline([[14, -272], [8, -248], [14, -224], [36, -205], [66, -196]], false, 4), { seed: 93, len: [14, 30], width: [14, 22], gap: 6, bend: 10, lean: 0.2 });
  const headFlow = strands(head, { seed: 94, count: 90, from: [120, -250], len: [8, 16], jitter: 0.22 });
  const chin = tufts(spline([[150, -224], [128, -211], [100, -200], [66, -196], [36, -205]], false, 4), { seed: 96, len: [14, 28], width: [14, 22], gap: 6, bend: 10, lean: 0.25 });
  const crest = tufts(spline([[44, -296], [70, -304], [96, -298]], false, 4), { seed: 95, len: [8, 15], width: [8, 12], gap: 5, bend: 5, lean: 0.1 });

  const eye = (cx: number, cy: number) => `
<g clip-path="url(#slo-eye-clip)">
<rect x="${cx - 24}" y="${cy - 20}" width="48" height="40" fill="#2a1608"/>
<g class="slo-eye-open"><circle cx="${cx + 3}" cy="${cy + 1}" r="12" fill="url(#slo-iris)"/><circle cx="${cx + 4}" cy="${cy + 1}" r="6" fill="#150b06"/><circle cx="${cx + 8}" cy="${cy - 4}" r="3" fill="#fff"/><circle cx="${cx - 2}" cy="${cy + 6}" r="1.4" fill="#fff" opacity=".8"/></g>
<rect x="${cx - 24}" y="${cy - 22}" width="48" height="16" fill="#2a1608" opacity=".4"/>
<rect class="slo-lid" x="${cx - 26}" y="${cy - 62}" width="52" height="40" fill="url(#slo-fur)"/>
</g>
<path d="M${cx - 18} ${cy + 1}Q${cx - 4} ${cy - 20} ${cx + 18} ${cy - 6}" fill="none" stroke="#1b1210" stroke-width="3" stroke-linecap="round"/>
<path d="M${cx - 18} ${cy + 1}L${cx - 30} ${cy - 6}L${cx - 14} ${cy - 4}Z" fill="#1b1210"/>`;
  const EYE_C: Pt = [104, -262];
  const eyeClip = `<clipPath id="slo-eye-clip"><path d="M${EYE_C[0] - 18} ${EYE_C[1] + 1}Q${EYE_C[0] - 4} ${EYE_C[1] - 22} ${EYE_C[0] + 20} ${EYE_C[1] - 6}Q${EYE_C[0] + 6} ${EYE_C[1] + 18} ${EYE_C[0] - 18} ${EYE_C[1] + 1}Z"/></clipPath>`;

  const shadowUnder = `<ellipse cx="20" cy="2" rx="150" ry="14" fill="#000" opacity=".5" filter="url(#slo-soft)"/>`;

  return `<defs>${eyeClip}</defs>
${shadowUnder}
<g class="slo-tail">
<path d="${tailTufts}" fill="url(#slo-tail)"/>
<path d="${poly(tailShape)}" fill="url(#slo-tail)"/>
<path d="${tailFlow}" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".22"/>
<path d="${tailTufts2}" fill="url(#slo-tail)"/>
<path d="${lines}" fill="none" stroke="#f3c75a" stroke-width="1.4" stroke-dasharray="1 4" stroke-linecap="round" opacity=".9"/>
<g class="slo-twinkle">${stars.map((s, i) => `<path d="${star4(s[0], s[1], i % 2 ? 7 : 10, i % 2 ? 5 : 7, 0.18)}" fill="url(#slo-gold)" style="animation-delay:${i * 0.7}s"/>`).join('')}</g>
</g>
${furShape(earFar, 'url(#slo-ear-far)', 61, { len: [3, 6], gap: 7 })}
${furShape(torso, 'url(#slo-fur)', 51, { edge: false, len: [10, 22], gap: 7, where: (p, n) => (p[0] > 60 && p[1] < -90) || (n[0] < -0.2 && p[1] < -60), flow: 90, from: [0, -120] })}
<path d="${chest}" fill="url(#slo-fur)"/>
<path d="${poly(thigh)}" fill="#050818" opacity=".28" transform="translate(-4 3)" filter="url(#slo-fblur)"/>
${furShape(thigh, 'url(#slo-fur)', 52, { len: [7, 14], gap: 6, flow: 60, from: [-30, -60], edge: false })}
<g class="slo-foot"><path d="${poly(foot)}" fill="url(#slo-navy)"/><path d="M86 -22L90 -4M102 -20L106 -4M70 -22L72 -4" stroke="#0a1038" stroke-width="1.4" opacity=".6"/><path d="M44 -14Q80 -22 112 -12" fill="none" stroke="#8fa0ee" stroke-width="1.6" opacity=".4" stroke-linecap="round"/></g>
<path d="${poly(armFar)}" fill="url(#slo-fur-far)"/>
${paw(138, -106, -10, 0.95, '#1a2566')}
${controller()}
<g class="slo-arm">
${furShape(armNear, 'url(#slo-fur)', 101, { len: [5, 10], gap: 6, edge: false, where: (_p, n) => n[1] < 0.3 })}
${paw(112, -96, -8, 1.15, 'url(#slo-navy)')}
<g class="slo-thumb">${paw(128, -108, -12, 0.55, '#3a4aa6')}</g>
</g>
<g transform="translate(60 -206) scale(1.16) translate(-60 206)"><g class="slo-head">
${furShape(earNear, 'url(#slo-ear)', 62, { len: [3, 6], gap: 7 })}
<path d="${poly(earIn)}" fill="url(#slo-ear-in)"/>
<path d="${tufts(earIn, { seed: 63, len: [7, 14], width: [7, 11], gap: 5, bend: 4, lean: 0.4, where: (p) => p[1] > -340 })}" fill="#f4f3fc"/>
<g class="slo-tassel"><circle cx="30" cy="-276" r="6" fill="none" stroke="url(#slo-gold)" stroke-width="2.6"/><path d="M30 -270V-254" stroke="url(#slo-gold)" stroke-width="2.2"/><path d="M26 -254h8l2 5h-12z" fill="url(#slo-gold)"/><path d="M24 -249Q21 -234 22 -222L27 -224L30 -220L33 -224L37 -222Q38 -236 36 -249Z" fill="url(#slo-red)"/></g>
<path d="${headBack}${cheek}${muzzleHair}" fill="url(#slo-fur)"/>
<path d="${poly(head)}" fill="url(#slo-fur)"/>
<path d="${chin}" fill="url(#slo-fur)"/>
<path d="${headFlow}" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".3"/>
<path d="${crest}" fill="url(#slo-fur)"/>
<path d="${star4(76, -291, 12, 6.5, 0.16)}" fill="url(#slo-gold)" stroke="#fff3c0" stroke-width=".6"/>
<path d="M62 -283Q70 -288 82 -285" fill="none" stroke="#e1a02e" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>
${eye(EYE_C[0], EYE_C[1])}
<path d="M128 -271L144 -274L148 -250L133 -246Z" fill="url(#slo-lens-r)" stroke="#0b0b10" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M169 -240Q174 -237 170 -230Q165 -227 158 -230L157 -238Z" fill="url(#slo-nose)"/>
<path d="M163 -239Q167 -240 168 -237" fill="none" stroke="#9fe8ff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>
<path d="M160 -229Q150 -219 134 -222" fill="none" stroke="#3a2420" stroke-width="1.8" stroke-linecap="round"/>
<path d="M166 -236Q188 -246 208 -242M164 -232Q190 -234 210 -226M160 -228Q182 -220 200 -208" fill="none" stroke="#e8f4ff" stroke-width=".9" stroke-linecap="round" opacity=".7"/>
<g class="slo-glasses">
<path d="M78 -270L34 -272Q26 -272 22 -262" fill="none" stroke="#0b0b10" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="80" y="-284" width="56" height="44" rx="11" fill="url(#slo-lens-c)" transform="rotate(-4 108 -262)"/>
<rect x="80" y="-284" width="56" height="44" rx="11" fill="none" stroke="#0b0b10" stroke-width="5.2" transform="rotate(-4 108 -262)"/>
<rect x="84" y="-280" width="48" height="36" rx="8" fill="none" stroke="#cfffff" stroke-width="1" opacity=".5" transform="rotate(-4 108 -262)"/>
<path d="M88 -274Q102 -280 118 -278" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".85"/>
<path d="M90 -262Q91 -268 93 -271" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".6"/>
<path d="M126 -250Q130 -246 128 -240" fill="none" stroke="#e8ffff" stroke-width="2" stroke-linecap="round" opacity=".5"/>
</g>
</g></g>
<g clip-path="url(#slo-fox-clip)" pointer-events="none">
<ellipse cx="92" cy="-200" rx="44" ry="13" fill="#232a63" opacity=".42" filter="url(#slo-soft)"/>
<ellipse cx="56" cy="-126" rx="30" ry="12" fill="#232a63" opacity=".36" filter="url(#slo-soft)" transform="rotate(32 56 -126)"/>
<ellipse cx="-4" cy="-98" rx="56" ry="9" fill="#232a63" opacity=".3" filter="url(#slo-soft)"/>
<ellipse cx="24" cy="-12" rx="80" ry="16" fill="#1c2254" opacity=".42" filter="url(#slo-soft)"/>
<ellipse cx="-50" cy="-48" rx="22" ry="34" fill="#1c2254" opacity=".4" filter="url(#slo-soft)"/>
<ellipse cx="-30" cy="-170" rx="30" ry="60" fill="#1c2254" opacity=".22" filter="url(#slo-soft)"/>
<ellipse cx="96" cy="-300" rx="36" ry="14" fill="#fff" opacity=".4" filter="url(#slo-soft)"/>
<ellipse cx="74" cy="-168" rx="12" ry="40" fill="#fff" opacity=".35" filter="url(#slo-soft)"/>
</g>
<g clip-path="url(#slo-fox-clip)"><rect x="-260" y="-400" width="460" height="410" fill="url(#slo-rim)"/><rect x="-260" y="-400" width="460" height="410" fill="url(#slo-rim-warm)"/></g>`;
}
