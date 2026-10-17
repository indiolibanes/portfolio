/**
 * Sophia de perfil, sentada no tapete, jogando (parte da sala gamer).
 * Coordenadas locais: (0,0) é o ponto do chão sob o quadril, ela olha para +x.
 * O grupo é posicionado e escalado por sophia-lounge.ts.
 *
 * Fiel à Sophia original: proporção "chibi" (cabeça grande, corpo pequeno),
 * focinho curto, orelhas enormes com a ponta azul-marinho e o miolo felpudo,
 * olho âmbar grande com delineador alado (por trás dos óculos 3D), estrela
 * dourada na testa, fitas vermelhas nas orelhas, patas azul-marinho com
 * estrelinhas e uma cauda enorme, creme na base e azul-marinho na ponta, com a
 * constelação dourada. O traje é lunar e lembra o da Hsin: corpete azul-noite
 * de gola escalonada, sobretudo vermelho de mangas largas forradas de marfim,
 * laço vermelho com broche de lua, estrelas douradas e saia longa com
 * crescentes bordados. Cintura marcada e saia aberta deixam a silhueta feminina.
 */
import { type LockSpec, type Pt, limb, locks, n1, poly, smooth, spline, star4, strands, tufts } from './sophia-draw.ts';

const TORSO: Pt[] = [
  [-46, -6], [-52, -50], [-44, -96], [-36, -128], [-30, -160], [-8, -184], [26, -194], [56, -190],
  [74, -166], [76, -140], [66, -112], [60, -90], [52, -50], [40, -20], [10, -2],
];
/** Saia longa: do quadril até o chão, aberta à frente sobre as pernas. */
const SKIRT: Pt[] = [
  [-54, -104], [-2, -100], [50, -100], [66, -94], [88, -82], [106, -58], [112, -30], [108, -3],
  [40, 4], [-40, 5], [-76, 2], [-80, -30], [-68, -72],
];
const FOOT: Pt[] = [[80, -20], [112, -24], [132, -16], [140, -4], [112, 3], [80, 3]];
/** Capa vermelha do sobretudo, atrás das costas. */
const CAPE: Pt[] = [[-22, -186], [-54, -160], [-74, -110], [-86, -50], [-72, -28], [-58, -62], [-44, -112], [-30, -150], [4, -190]];

/** Cabeça de perfil (olha para +x): crânio redondo e focinho curto. */
const HEAD: Pt[] = [
  [8, -300], [40, -334], [84, -342], [120, -326], [140, -296], [148, -272], [152, -254], [150, -242],
  [138, -230], [120, -216], [96, -204], [62, -198], [30, -204], [8, -224], [-6, -256], [-4, -282],
];

/** Orelhas (Bézier, pontas afiadas). */
const EAR_NEAR_D = 'M16 -292C0 -330 -8 -400 -2 -456C40 -426 78 -376 100 -318C104 -304 102 -296 98 -292Z';
const EAR_NEAR_IN_D = 'M30 -296C22 -326 18 -352 20 -384C46 -366 70 -340 84 -308C80 -300 60 -294 30 -296Z';
const EAR_FAR_D = 'M62 -304C58 -352 70 -412 100 -452C116 -412 128 -352 122 -308Z';
const EAR_PLUMES: LockSpec[] = [
  [82, -306, -104, 28, 22, 0.1], [66, -330, -108, 30, 20, 0.1], [50, -352, -110, 28, 17, 0.08],
  [30, -300, -96, 24, 18, -0.1], [26, -330, -94, 24, 16, -0.06],
  [54, -314, -102, 34, 20, 0.08],
];
const CHEEK: LockSpec[] = [
  [6, -240, 168, 30, 20, 0.12], [16, -222, 148, 32, 20, 0.12], [36, -206, 126, 30, 20, 0.1], [64, -199, 106, 26, 18, 0.08],
  [-2, -264, 190, 28, 20, 0.1], [4, -288, 204, 26, 18, 0.1],
];
const CREST: LockSpec[] = [
  [44, -330, -118, 28, 16, 0.15], [64, -338, -96, 30, 16, 0.06], [86, -338, -76, 28, 16, -0.06], [108, -326, -54, 24, 14, -0.12],
];
const CHEST: LockSpec[] = [
  [64, -196, 64, 34, 22, 0.1], [74, -176, 72, 32, 20, 0.08], [56, -206, 40, 26, 16, 0.1], [-6, -170, 190, 26, 18, 0.1],
];

const TAIL_CENTER: Pt[] = [[-46, -36], [-100, -30], [-160, -30], [-212, -62], [-246, -120], [-250, -186], [-222, -246], [-176, -272]];
const TAIL_W = [34, 58, 80, 92, 92, 80, 52, 8];

const ARM_NEAR_C: Pt[] = [[22, -152], [50, -130], [78, -113], [104, -103]];
const ARM_FAR_C: Pt[] = [[40, -168], [72, -140], [100, -122], [134, -110]];

const EYE_C: Pt = [108, -262];

export function foxDefs(): string {
  const eyeClip = `M${EYE_C[0] - 26} ${EYE_C[1] - 4}C${EYE_C[0] - 14} ${EYE_C[1] - 28} ${EYE_C[0] + 14} ${EYE_C[1] - 30} ${EYE_C[0] + 24} ${EYE_C[1] + 6}C${EYE_C[0] + 12} ${EYE_C[1] + 22} ${EYE_C[0] - 12} ${EYE_C[1] + 20} ${EYE_C[0] - 26} ${EYE_C[1] - 4}Z`;
  return `
<linearGradient id="slo-fur" gradientUnits="userSpaceOnUse" x1="-60" y1="0" x2="150" y2="0"><stop offset="0" stop-color="#cdbfa6"/><stop offset=".45" stop-color="#efe5d0"/><stop offset="1" stop-color="#fffaee"/></linearGradient>
<linearGradient id="slo-fur-far" gradientUnits="userSpaceOnUse" x1="-60" y1="0" x2="150" y2="0"><stop offset="0" stop-color="#8a7f6e"/><stop offset="1" stop-color="#c4b8a2"/></linearGradient>
<linearGradient id="slo-fur-back" gradientUnits="userSpaceOnUse" x1="-60" y1="0" x2="150" y2="0"><stop offset="0" stop-color="#a99b84"/><stop offset="1" stop-color="#dfd2b8"/></linearGradient>
<linearGradient id="slo-coat" gradientUnits="userSpaceOnUse" x1="-60" y1="0" x2="100" y2="0"><stop offset="0" stop-color="#a9afc6"/><stop offset=".5" stop-color="#e9e8ee"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
<linearGradient id="slo-tail" gradientUnits="userSpaceOnUse" x1="-70" y1="-20" x2="-262" y2="-200"><stop offset="0" stop-color="#d8cdb6"/><stop offset=".3" stop-color="#e6dcc6"/><stop offset=".5" stop-color="#8a90bd"/><stop offset=".62" stop-color="#2a3886"/><stop offset="1" stop-color="#111a50"/></linearGradient>
<linearGradient id="slo-tail-back" gradientUnits="userSpaceOnUse" x1="-70" y1="-20" x2="-262" y2="-200"><stop offset="0" stop-color="#a99d86"/><stop offset=".3" stop-color="#b3a78f"/><stop offset=".5" stop-color="#555e9c"/><stop offset=".64" stop-color="#18246a"/><stop offset="1" stop-color="#0b1140"/></linearGradient>
<linearGradient id="slo-ear" gradientUnits="userSpaceOnUse" x1="0" y1="-456" x2="0" y2="-290"><stop offset="0" stop-color="#0c1340"/><stop offset=".34" stop-color="#1c2a7c"/><stop offset=".5" stop-color="#4a58a4"/><stop offset=".62" stop-color="#c9c8d6"/><stop offset=".76" stop-color="#efe6d4"/><stop offset="1" stop-color="#fffaf0"/></linearGradient>
<linearGradient id="slo-ear-far" gradientUnits="userSpaceOnUse" x1="0" y1="-456" x2="0" y2="-290"><stop offset="0" stop-color="#0a1038"/><stop offset=".5" stop-color="#18246a"/><stop offset=".76" stop-color="#4a5596"/><stop offset="1" stop-color="#8a8fa8"/></linearGradient>
<linearGradient id="slo-ear-in" gradientUnits="userSpaceOnUse" x1="0" y1="-384" x2="0" y2="-296"><stop offset="0" stop-color="#e9ddd0"/><stop offset="1" stop-color="#f4dccf"/></linearGradient>
<linearGradient id="slo-dress" gradientUnits="userSpaceOnUse" x1="-80" y1="0" x2="120" y2="0"><stop offset="0" stop-color="#0e1544"/><stop offset=".55" stop-color="#1e2a78"/><stop offset="1" stop-color="#3a4cb0"/></linearGradient>
<linearGradient id="slo-cape" gradientUnits="userSpaceOnUse" x1="-90" y1="0" x2="60" y2="0"><stop offset="0" stop-color="#6e0f1c"/><stop offset="1" stop-color="#b8212f"/></linearGradient>
<linearGradient id="slo-lining" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7e6"/><stop offset="1" stop-color="#d9d3ea"/></linearGradient>
<radialGradient id="slo-gem" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#c8f4ff"/><stop offset=".55" stop-color="#3fb0ff"/><stop offset="1" stop-color="#1a3fa8"/></radialGradient>
<linearGradient id="slo-navy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34459d"/><stop offset="1" stop-color="#121a4c"/></linearGradient>
<linearGradient id="slo-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b0"/><stop offset=".5" stop-color="#f0b73e"/><stop offset="1" stop-color="#b9771d"/></linearGradient>
<radialGradient id="slo-iris" cx="50%" cy="40%" r="64%"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".4" stop-color="#f7b83c"/><stop offset=".8" stop-color="#c9741a"/><stop offset="1" stop-color="#7a3c10"/></radialGradient>
<linearGradient id="slo-lens-c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ff3ff" stop-opacity=".4"/><stop offset="1" stop-color="#1b9bc4" stop-opacity=".34"/></linearGradient>
<linearGradient id="slo-lens-r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6b6b" stop-opacity=".85"/><stop offset="1" stop-color="#a81d2a" stop-opacity=".8"/></linearGradient>
<linearGradient id="slo-red" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0505a"/><stop offset="1" stop-color="#a31322"/></linearGradient>
<linearGradient id="slo-pad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3f4f"/><stop offset=".5" stop-color="#1b1e28"/><stop offset="1" stop-color="#0b0c11"/></linearGradient>
<linearGradient id="slo-rim" gradientUnits="userSpaceOnUse" x1="20" y1="0" x2="170" y2="0"><stop offset="0" stop-color="#bff4ff" stop-opacity="0"/><stop offset="1" stop-color="#bff4ff" stop-opacity=".3"/></linearGradient>
<linearGradient id="slo-rim-warm" gradientUnits="userSpaceOnUse" x1="0" y1="-300" x2="0" y2="0"><stop offset=".6" stop-color="#ff7a59" stop-opacity="0"/><stop offset="1" stop-color="#ff9a79" stop-opacity=".12"/></linearGradient>
<radialGradient id="slo-nose" cx="40%" cy="30%" r="70%"><stop offset="0" stop-color="#5b4a56"/><stop offset="1" stop-color="#150e12"/></radialGradient>
<filter id="slo-fblur" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".7"/></filter>
<clipPath id="slo-eye-clip"><path d="${eyeClip}"/></clipPath>
<clipPath id="slo-fox-clip"><path d="${poly(spline(TORSO, true, 5))}"/><path d="${poly(spline(CAPE, true, 5))}"/><path d="${poly(limb(ARM_NEAR_C, [28, 32, 38, 40]))}"/></clipPath>
<clipPath id="slo-head-clip"><path d="${smooth(HEAD)}"/><path d="${EAR_NEAR_D}"/><path d="${EAR_FAR_D}"/></clipPath>
<clipPath id="slo-skirt-clip"><path d="${poly(spline(SKIRT, true, 5))}"/></clipPath>`;
}

/** Contorno felpudo: tufos com o mesmo preenchimento do corpo (sem halo). */
function furShape(outline: Pt[], fill: string, seed: number, o: { len?: [number, number]; gap?: number; where?: (p: Pt, n: Pt) => boolean; flow?: number; from?: Pt } = {}): string {
  const fringe = tufts(outline, { seed, len: o.len ?? [7, 15], width: [11, 17], gap: o.gap ?? 6, bend: 6, where: o.where });
  const flow = o.flow ? strands(outline, { seed: seed + 7, count: o.flow, from: o.from ?? [0, -120], len: [8, 18], jitter: 0.3 }) : '';
  return `<path d="${fringe}" fill="${fill}"/>
<path d="${poly(outline)}" fill="${fill}"/>${flow ? `<path d="${flow}" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".28"/>` : ''}`;
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

/** Olho âmbar grande (a lente 3D fica por cima). O canto de trás, à esquerda, leva o traço alado. */
function eye(cx: number, cy: number): string {
  return `
<g clip-path="url(#slo-eye-clip)">
<rect x="${cx - 30}" y="${cy - 30}" width="60" height="56" fill="#fff4dc"/>
<g class="slo-eye-open"><circle cx="${cx + 4}" cy="${cy}" r="15" fill="url(#slo-iris)"/><circle cx="${cx + 4}" cy="${cy}" r="15" fill="none" stroke="#6e3510" stroke-width="1.4" opacity=".7"/><circle cx="${cx + 5}" cy="${cy}" r="7.4" fill="#150b06"/><circle cx="${cx + 10}" cy="${cy - 6}" r="3.6" fill="#fff"/><circle cx="${cx - 1}" cy="${cy + 7}" r="1.7" fill="#fff" opacity=".85"/><circle cx="${cx + 13}" cy="${cy + 6}" r=".9" fill="#fff6c8"/></g>
<rect x="${cx - 30}" y="${cy - 30}" width="60" height="28" fill="#2a1608" opacity=".32"/>
<rect class="slo-lid" x="${cx - 32}" y="${cy - 64}" width="64" height="40" fill="url(#slo-fur)"/>
</g>
<path d="M${cx - 26} ${cy - 4}C${cx - 14} ${cy - 28} ${cx + 14} ${cy - 30} ${cx + 24} ${cy + 6}" fill="none" stroke="#1b1210" stroke-width="4" stroke-linecap="round"/>
<path d="M${cx - 20} ${cy - 17}Q${cx - 38} ${cy - 20} ${cx - 52} ${cy - 34}Q${cx - 46} ${cy - 14} ${cx - 30} ${cy - 2}Z" fill="#1b1210"/>
<path d="M${cx + 24} ${cy + 6}C${cx + 12} ${cy + 22} ${cx - 8} ${cy + 22} ${cx - 22} ${cy + 6}" fill="none" stroke="#3b2a22" stroke-width="1.2" opacity=".7"/>
<path d="M${cx - 24} ${cy - 6}L${cx - 36} ${cy - 3}M${cx - 18} ${cy - 15}L${cx - 28} ${cy - 14}M${cx + 6} ${cy - 25}L${cx + 9} ${cy - 31}M${cx + 16} ${cy - 21}L${cx + 21} ${cy - 26}" fill="none" stroke="#1b1210" stroke-width="2" stroke-linecap="round"/>`;
}

/** Lua crescente (abre para a direita), centro em (cx,cy), raio r, girada em `rot` graus. */
function crescent(cx: number, cy: number, r: number, rot = 0): string {
  return `<path transform="translate(${cx} ${cy}) rotate(${rot})" d="M0 ${-r}A${r} ${r} 0 0 0 0 ${r}A${n1(r * 1.45)} ${n1(r * 1.45)} 0 0 1 0 ${-r}Z" fill="url(#slo-gold)"/>`;
}

export function foxMarkup(): string {
  const torso = spline(TORSO, true, 5);
  const skirt = spline(SKIRT, true, 5);
  const cape = spline(CAPE, true, 5);
  const foot = spline(FOOT, true, 4);
  const head = spline(HEAD, true, 4);
  const tailShape = limb(TAIL_CENTER, TAIL_W);

  const tailTufts = tufts(tailShape, { seed: 71, len: [10, 22], width: [16, 24], gap: 7, bend: 9 });
  const tailTufts2 = tufts(tailShape, { seed: 72, len: [5, 10], width: [12, 18], gap: 5, bend: 5 });
  const tailFlow = strands(tailShape, { seed: 73, count: 170, from: [-46, -36], len: [14, 30], jitter: 0.2 });

  // constelação dourada na parte azul da cauda
  const stars: Pt[] = [[-196, -78], [-232, -104], [-236, -150], [-214, -196], [-182, -214], [-198, -138]];
  const lines = `M${stars.map((p) => `${p[0]} ${p[1]}`).join('L')}`;
  // a ponta da cauda se enrola em espiral
  const curl = 'M-176 -272C-206 -270 -228 -250 -226 -226C-224 -206 -202 -198 -190 -210C-180 -220 -186 -234 -198 -232';

  const headFlow = strands(head, { seed: 94, count: 70, from: [110, -262], len: [8, 16], jitter: 0.22 });
  const chest = [...CHEST];

  const shadowUnder = `<ellipse cx="20" cy="2" rx="160" ry="14" fill="#000" opacity=".5" filter="url(#slo-soft)"/>`;

  // fitas vermelhas presas ao enfeite dourado da orelha
  const ribbons = `<g class="slo-tassel">
<path d="M22 -282C20 -258 14 -234 4 -204L14 -212L18 -198C28 -228 34 -256 34 -282Z" fill="url(#slo-red)"/>
<path d="M30 -282C34 -262 34 -246 30 -226L36 -232L40 -222C44 -244 44 -262 40 -282Z" fill="url(#slo-red)" opacity=".92"/>
<path d="M14 -306C8 -314 18 -322 24 -316C28 -312 26 -306 22 -306" fill="none" stroke="url(#slo-gold)" stroke-width="2.4" stroke-linecap="round"/>
<circle cx="28" cy="-290" r="8" fill="url(#slo-gold)"/><circle cx="28" cy="-290" r="4.6" fill="#d1263a"/><circle cx="26.6" cy="-291.6" r="1.4" fill="#ffb0b8"/>
</g>`;

  // escalonado da gola do corpete
  const scallops = (() => {
    const A: Pt = [-24, -178];
    const B: Pt = [62, -194];
    const n = 8;
    let d = `M${A[0]} ${A[1]}`;
    for (let i = 0; i < n; i += 1) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const x1 = A[0] + (B[0] - A[0]) * t1;
      const y1 = A[1] + (B[1] - A[1]) * t1;
      const cx = A[0] + (B[0] - A[0]) * ((t0 + t1) / 2);
      const cy = A[1] + (B[1] - A[1]) * ((t0 + t1) / 2) - 8;
      d += `Q${n1(cx)} ${n1(cy)} ${n1(x1)} ${n1(y1)}`;
    }
    return d + `L${B[0]} ${B[1] + 14}L${A[0]} ${A[1] + 14}Z`;
  })();

  // laço de fita vermelha com broche de lua no peito
  const bow = `<g class="slo-tassel">
<path d="M62 -170L54 -132L60 -138L64 -126L68 -168Z" fill="url(#slo-red)"/>
<path d="M66 -170L76 -136L70 -141L68 -128L64 -168Z" fill="url(#slo-red)" opacity=".92"/>
</g>
<path d="M64 -172L46 -184Q40 -172 52 -166ZM64 -172L82 -184Q88 -172 76 -166Z" fill="url(#slo-red)"/>
<circle cx="64" cy="-172" r="4.6" fill="#b11626"/>
${crescent(62, -156, 9, 8)}
<circle cx="66" cy="-156" r="4.4" fill="url(#slo-gem)"/>`;

  const sleeveNear = limb(ARM_NEAR_C, [28, 32, 38, 40]);
  const sleeveFar = limb(ARM_FAR_C, [22, 24, 28, 30]);

  return `${shadowUnder}
<g class="slo-tail">
<path d="${tailTufts}" fill="url(#slo-tail-back)"/>
<path d="${poly(tailShape)}" fill="url(#slo-tail)"/>
<path d="${tailFlow}" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".2"/>
<path d="${tailTufts2}" fill="url(#slo-tail)"/>
<path d="${curl}" fill="none" stroke="#5b6bc0" stroke-width="3" stroke-linecap="round" opacity=".5"/>
<path d="${lines}" fill="none" stroke="#f3c75a" stroke-width="1.6" stroke-dasharray="1 4.5" stroke-linecap="round" opacity=".95"/>
<g class="slo-twinkle">${stars.map((s, i) => `<path d="${star4(s[0], s[1], i % 2 ? 9 : 14, i % 2 ? 6 : 9, 0.18)}" fill="url(#slo-gold)" style="animation-delay:${i * 0.7}s"/>`).join('')}</g>
</g>
<g class="slo-foot"><path d="${poly(foot)}" fill="url(#slo-navy)"/><path d="M112 -22L116 -4M126 -18L130 -4" stroke="#0a1038" stroke-width="1.4" opacity=".6"/><path d="M90 -14Q112 -22 132 -12" fill="none" stroke="#8fa0ee" stroke-width="1.6" opacity=".4" stroke-linecap="round"/><path d="${star4(112, -12, 7, 4.6, 0.2)}" fill="url(#slo-gold)"/></g>
<g class="slo-upper">
<g class="slo-cape"><path d="${poly(cape)}" fill="url(#slo-cape)"/><path d="M-30 -150Q-48 -110 -58 -62" fill="none" stroke="#fff7e6" stroke-width="2" opacity=".55" stroke-linecap="round"/><path d="${star4(-62, -92, 8, 5, 0.2)}" fill="url(#slo-gold)"/></g>
<path d="${poly(sleeveFar)}" fill="#7a1522"/>
${paw(138, -108, -10, 0.95, '#1a2566')}
<path d="${poly(torso)}" fill="url(#slo-dress)"/>
<path d="${scallops}" fill="#0c123a" stroke="url(#slo-gold)" stroke-width="1.2" stroke-linejoin="round"/>
<path d="M-40 -150Q-22 -128 -30 -104M52 -150Q64 -128 56 -104" fill="none" stroke="#3a4cb0" stroke-width="1.6" opacity=".6" stroke-linecap="round"/>
<path d="M-44 -108Q8 -96 62 -106" fill="none" stroke="url(#slo-red)" stroke-width="6" stroke-linecap="round"/>
${[14, 32, 50].map((x) => `<path d="${star4(x, -104, 7, 5, 0.2)}" fill="url(#slo-gold)"/>`).join('')}
<path d="${locks(chest, 3)}" fill="url(#slo-fur-back)"/>
<path d="${locks(chest)}" fill="url(#slo-fur)"/>
${bow}
<g clip-path="url(#slo-fox-clip)" pointer-events="none">
<ellipse cx="-30" cy="-110" rx="30" ry="70" fill="#070a24" opacity=".3" filter="url(#slo-soft)"/>
<ellipse cx="60" cy="-120" rx="14" ry="46" fill="#9fb4ff" opacity=".22" filter="url(#slo-soft)"/>
<rect x="-120" y="-200" width="260" height="200" fill="url(#slo-rim)"/>
</g>
<g class="slo-padwrap">${controller()}</g>
<g class="slo-arm">
<path d="M84 -126L110 -116L116 -84L100 -80L84 -88Z" fill="#9b1727"/>
<path d="M88 -118L108 -110L111 -90L100 -88L90 -94Z" fill="url(#slo-lining)"/>
<path d="${poly(sleeveNear)}" fill="#1c2254" opacity=".3" transform="translate(-3 6)" filter="url(#slo-fblur)"/>
<path d="${poly(sleeveNear)}" fill="url(#slo-red)"/>
<path d="M36 -154Q64 -130 92 -114" fill="none" stroke="#ff8a93" stroke-width="2" stroke-linecap="round" opacity=".45"/>
<path d="M92 -124Q104 -108 96 -92" fill="none" stroke="url(#slo-lining)" stroke-width="6" stroke-linecap="round"/>
<path d="M95 -125Q107 -108 99 -91" fill="none" stroke="url(#slo-gold)" stroke-width="1.2" stroke-linecap="round"/>
${paw(112, -96, -8, 1.15, 'url(#slo-navy)')}
<path d="${star4(112, -96, 5, 3.4, 0.2)}" fill="url(#slo-gold)"/>
<g class="slo-thumb">${paw(128, -108, -12, 0.55, '#3a4aa6')}</g>
</g>
<g transform="translate(60 -200) scale(1.14) translate(-60 200)"><g class="slo-head">
<g class="slo-ear-f"><path d="${EAR_FAR_D}" fill="url(#slo-ear-far)"/></g>
<g class="slo-ear-n">
<path d="${EAR_NEAR_D}" fill="url(#slo-ear)"/>
<path d="${EAR_NEAR_IN_D}" fill="url(#slo-ear-in)"/>
<path d="${locks(EAR_PLUMES, 3)}" fill="#efe2cb"/>
<path d="${locks(EAR_PLUMES)}" fill="#fffbf3"/>
</g>
<path transform="translate(1.5 4)" d="${locks(CHEEK, 2)}${locks(CREST, 2)}" fill="url(#slo-fur-back)"/>
<path d="${poly(head)}" fill="url(#slo-fur)"/>
<path d="${headFlow}" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".3"/>
<path d="${locks(CHEEK)}${locks(CREST)}" fill="url(#slo-fur)"/>
<g clip-path="url(#slo-head-clip)" pointer-events="none">
<ellipse cx="96" cy="-336" rx="36" ry="14" fill="#fff" opacity=".35" filter="url(#slo-soft)"/>
<ellipse cx="60" cy="-204" rx="60" ry="12" fill="#232a63" opacity=".32" filter="url(#slo-soft)"/>
<ellipse cx="0" cy="-250" rx="14" ry="40" fill="#1c2254" opacity=".24" filter="url(#slo-soft)"/>
<rect x="-30" y="-470" width="220" height="280" fill="url(#slo-rim)"/>
<rect x="-30" y="-470" width="220" height="280" fill="url(#slo-rim-warm)"/>
</g>
<path d="${star4(88, -312, 24, 13, 0.16)}" fill="url(#slo-gold)" stroke="#fff3c0" stroke-width=".7"/>
<path d="${star4(98, -344, 8, 5, 0.2)}" fill="url(#slo-gold)"/>
${crescent(34, -328, 11, -28)}
<path d="${star4(52, -336, 6, 4, 0.2)}" fill="url(#slo-gold)"/>
<path d="M70 -296Q92 -306 124 -298" fill="none" stroke="#e1a02e" stroke-width="3" stroke-linecap="round" opacity=".9"/>
<ellipse cx="116" cy="-231" rx="15" ry="7" fill="#ff8fa6" opacity=".42" filter="url(#slo-fblur)"/>
${eye(EYE_C[0], EYE_C[1])}
<path d="M126 -271L140 -273L144 -251L130 -247Z" fill="url(#slo-lens-r)" stroke="#0b0b10" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M148 -254Q157 -251 155 -243Q151 -237 144 -240L142 -249Z" fill="url(#slo-nose)"/>
<path d="M147 -252Q152 -253 154 -249" fill="none" stroke="#9fe8ff" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>
<path d="M146 -238Q138 -228 126 -230" fill="none" stroke="#c4566a" stroke-width="2" stroke-linecap="round"/>
${ribbons}
<g class="slo-glasses">
<path d="M78 -270L38 -272Q30 -272 26 -262" fill="none" stroke="#0b0b10" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="80" y="-284" width="56" height="44" rx="11" fill="url(#slo-lens-c)" transform="rotate(-4 108 -262)"/>
<rect x="80" y="-284" width="56" height="44" rx="11" fill="none" stroke="#0b0b10" stroke-width="5.2" transform="rotate(-4 108 -262)"/>
<rect x="84" y="-280" width="48" height="36" rx="8" fill="none" stroke="#cfffff" stroke-width="1" opacity=".5" transform="rotate(-4 108 -262)"/>
<path d="M88 -274Q102 -280 118 -278" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" opacity=".85"/>
<path d="M90 -262Q91 -268 93 -271" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".6"/>
<path d="M126 -250Q130 -246 128 -240" fill="none" stroke="#e8ffff" stroke-width="2" stroke-linecap="round" opacity=".5"/>
</g>
</g></g>
</g>
<path d="${poly(skirt)}" fill="url(#slo-dress)"/>
<path d="M44 -98L62 -96L84 -62L88 -4L52 3L34 -44Z" fill="url(#slo-lining)" opacity=".92"/>
<path d="M-30 -100Q-46 -50 -58 2M-8 -98Q-20 -50 -24 4M20 -98Q12 -50 14 4" fill="none" stroke="#0a1038" stroke-width="2" opacity=".35" stroke-linecap="round"/>
<path d="M44 -98L62 -96L84 -62L88 -4M34 -44L52 3" fill="none" stroke="url(#slo-gold)" stroke-width="1.4" stroke-linecap="round" opacity=".9"/>
<path d="M-76 -4Q-20 8 40 4Q80 3 108 -3" fill="none" stroke="url(#slo-gold)" stroke-width="2.4" stroke-linecap="round"/>
${crescent(-40, -52, 9, 20)}${crescent(-10, -30, 7, -10)}${crescent(70, -34, 7, 10)}
<path d="${star4(-24, -70, 6, 4, 0.2)}" fill="url(#slo-gold)"/><path d="${star4(8, -62, 5, 3.4, 0.2)}" fill="url(#slo-gold)"/>
<g class="slo-tassel"><path d="M56 -100L48 -98L40 -50L47 -56L51 -44L58 -98Z" fill="url(#slo-red)"/><path d="M60 -100L68 -90L72 -48L65 -54L61 -42L56 -96Z" fill="url(#slo-red)" opacity=".92"/></g>
<g clip-path="url(#slo-skirt-clip)" pointer-events="none">
<ellipse cx="24" cy="-6" rx="100" ry="14" fill="#070a24" opacity=".4" filter="url(#slo-soft)"/>
<ellipse cx="-56" cy="-50" rx="22" ry="50" fill="#070a24" opacity=".35" filter="url(#slo-soft)"/>
<rect x="-90" y="-110" width="220" height="120" fill="url(#slo-rim)"/>
</g>`;
}
