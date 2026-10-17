/**
 * Desenhos da Sophia (ver sophia-pixel.ts para a legenda das letras).
 * A cabeça é desenhada pela metade esquerda; a última coluna é o eixo.
 */
import { Pixels, TONE, fromRows, mirror, shadeUnderside } from './sophia-pixel.ts';

// ---------------------------------------------------------------- cabeça --

const HEAD_HALF = [
  '.....m...........', //  0  ponta da orelha
  '.....mm..........',
  '....mmm..........',
  '....mmmm.........',
  '...mmmmm.........',
  '...mmmmmm........',
  '...mWWWWm........', //  6  interior claro da orelha
  '..mWWWWWWm.......',
  '..mWWWWWWWm.WWWWW', //  8  topo da cabeça
  '..mWWWWWWWWWWWWWW', //  9
  '..WWWWWWWWWWWWWWW', // 10
  '..WWWWWWWWWWWWWWW',
  '.WWWWWWWWWWWWWWWW',
  '.WWWWWWWWWWWWWWWW', // 13
  'WWWWWWWWWWWWWWWWW', // 14  primeiro tufo da bochecha
  'WWWWWWWWWWWWWWWWW',
  '.WWWWWWWWWWWWWWWW', // 16
  '.WWWWWWWWWWWWWWWW',
  'WWWWWWWWWWWWWWWWW', // 18  segundo tufo
  'WWWWWWWWWWWWWWWWW',
  '..WWWWWWWWWWWWWWW', // 20
  '...WWWWWWWWWWWWWW',
  '.....WWWWWWWWWWWW',
  '........WWWWWWWWW',
  '...........WWWWWW', // 24
  '.............WWWWW',
  '...............WWW', // 26  queixo
];

/** Estrela de quatro pontas na testa (centrada no eixo, coluna 16). */
export const STAR = [
  '.......K.......',
  '......KKK......',
  '....KKKKKKK....',
  '......KKK......',
  '.......K.......',
];

/** Aro redondo do óculos, 8×8; o interior (6×6) é preenchido com a lente. */
const RING = [
  '..KKKK..',
  '.K....K.',
  'K......K',
  'K......K',
  'K......K',
  'K......K',
  '.K....K.',
  '..KKKK..',
];

export const HEAD_W = 33;
export const HEAD_H = 27;

/** Olhos dentro da lente esquerda; a direita é o espelho. Colunas 8..11. */
const EYE_ROWS = {
  fwd: ['.KK.', 'KwKK', 'KKKK', '.KK.'],
  down: ['.KK.', 'KKKK', 'KwKK', '.KK.'],
  happy: ['....', '.KK.', 'K..K', '....'],
  shut: ['....', '....', 'KKKK', '....'],
} as const;

export type Eyes = keyof typeof EYE_ROWS;
export type Mouth = 'calm' | 'smile' | 'grin';

/** Silhueta de pelagem (orelhas, rosto), sem estrela nem óculos. */
export function furFor(tilt: number): Pixels {
  const px = fromRows(mirror(HEAD_HALF));
  // sombras suaves: parte interna das orelhas
  for (const y of [6, 7]) for (const x of [5, 6]) {
    px.set(x, y, TONE.g);
    px.set(HEAD_W - 1 - x, y, TONE.g);
  }
  const shaded = shadeUnderside(px);
  // Inclinação: só orelhas e testa deslizam para o lado, em faixas. Óculos e
  // boca ficam no lugar, então nada se parte nem fica torto.
  return tilt ? shaded.shearRows((y) => (y <= 8 ? 2 * tilt : y <= 12 ? tilt : 0)) : shaded;
}

function glasses(px: Pixels, eyes: Eyes): void {
  const ring = fromRows(RING);
  for (const left of [6, 19]) {
    px.rect(left + 1, 14, 6, 6, TONE.g); // lente
    px.set(left, 14, null).set(left + 7, 14, null);
    px.stamp(ring, left, 13);
    // reflexo branco na lente
    px.set(left + 2, 14, TONE.w).set(left + 1, 15, TONE.w);
  }
  px.rect(14, 15, 5, 1, TONE.K); // ponte
  px.rect(3, 15, 3, 1, TONE.K).rect(27, 15, 3, 1, TONE.K); // hastes

  const rows = EYE_ROWS[eyes];
  const top = eyes === 'down' ? 16 : 15;
  for (const [x0, flip] of [[8, false], [21, true]] as const) {
    rows.forEach((row, j) => {
      [...row].forEach((ch, i) => {
        const fill = ch === '.' ? null : (TONE as Record<string, string>)[ch];
        if (!fill) return;
        const xi = flip ? 3 - i : i;
        px.set(x0 + xi, top + j, fill);
      });
    });
  }
}

function snout(px: Pixels, mouth: Mouth): void {
  px.rect(15, 19, 3, 1, TONE.K).set(16, 20, TONE.K); // nariz
  if (mouth === 'calm') {
    px.set(14, 21, TONE.K).set(16, 21, TONE.K).set(18, 21, TONE.K);
    px.set(15, 22, TONE.K).set(17, 22, TONE.K);
  } else if (mouth === 'smile') {
    px.set(13, 21, TONE.K).set(19, 21, TONE.K).rect(14, 22, 5, 1, TONE.K);
  } else {
    // sorrisão: boca aberta com dentes e língua
    px.rect(10, 21, 13, 1, TONE.K);
    px.rect(12, 22, 9, 1, TONE.w).set(11, 22, TONE.K).set(21, 22, TONE.K);
    px.rect(13, 23, 7, 1, TONE.m).set(12, 23, TONE.K).set(20, 23, TONE.K);
    px.rect(13, 24, 7, 1, TONE.K);
  }
}

/** tilt: 0 = reta, 1 = inclinada para a direita (pose inicial da observadora). */
export function head(eyes: Eyes = 'fwd', mouth: Mouth = 'calm', tilt = 0): Pixels {
  const px = furFor(tilt);
  px.stamp(fromRows(STAR), 9 + tilt, 9);
  glasses(px, eyes);
  snout(px, mouth);
  return px;
}

// ----------------------------------------------------------------- patas --

/** Patas apoiadas na borda (o observador espia por cima do tabuleiro). */
const PAW = [
  '..gggg..',
  '.gggggg.',
  'ggmggmgg',
];

export function paws(): Pixels {
  const px = new Pixels(HEAD_W, 3);
  px.stamp(fromRows(PAW), 4, 0);
  px.stamp(fromRows(PAW), 21, 0);
  return px;
}

// ----------------------------------------------------------- observadora --

export type ObserverPose = 'rest' | 'blink' | 'down' | 'grin';

export const OBSERVER_W = HEAD_W + 2;
export const OBSERVER_H = HEAD_H + 3;

/**
 * Observadora: cabeça inclinada (pose inicial) → olha para baixo, cabeça
 * baixa → volta à inclinação → sorrisão → olha de novo.
 */
export function observer(pose: ObserverPose): Pixels {
  const out = new Pixels(OBSERVER_W, OBSERVER_H);
  if (pose === 'down') out.stamp(head('down', 'calm', 0), 1, 2);
  else if (pose === 'grin') out.stamp(head('happy', 'grin', 1), 1, 0);
  else if (pose === 'blink') out.stamp(head('shut', 'calm', 1), 1, 0);
  else out.stamp(head('fwd', 'calm', 1), 1, 0);
  out.stamp(paws(), 1, HEAD_H);
  return out;
}

// --------------------------------------------------------------- mascote --

export type Mood = 'calm' | 'play' | 'cheer' | 'sleep';

/** Avatar ao lado da mensagem: o humor acompanha o jogo. */
export function mascot(mood: Mood): Pixels {
  if (mood === 'play') return head('down', 'calm');
  if (mood === 'cheer') return head('happy', 'grin');
  if (mood === 'sleep') return head('shut', 'smile');
  return head('fwd', 'calm');
}
