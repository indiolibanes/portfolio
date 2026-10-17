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

export const HEAD_W = 33;
export const HEAD_H = 27;

/** Olho esquerdo; o direito é o espelho. Colunas 8..11. */
const EYE_ROWS = {
  fwd: ['.KK.', 'KwKK', 'KKKK', '.KK.'],
  down: ['.KK.', 'KKKK', 'KwKK', '.KK.'],
  happy: ['....', '.KK.', 'K..K', '....'],
  shut: ['....', '....', 'KKKK', '....'],
} as const;

export type Eyes = keyof typeof EYE_ROWS;
export type Mouth = 'calm' | 'smile' | 'grin';

/** Silhueta de pelagem (orelhas, rosto), sem estrela. */
export function furFor(tilt: number): Pixels {
  const px = fromRows(mirror(HEAD_HALF));
  // sombras suaves: parte interna das orelhas
  for (const y of [6, 7]) for (const x of [5, 6]) {
    px.set(x, y, TONE.g);
    px.set(HEAD_W - 1 - x, y, TONE.g);
  }
  const shaded = shadeUnderside(px);
  // Inclinação: só orelhas e testa deslizam para o lado, em faixas. Olhos e
  // boca ficam no lugar, então nada se parte nem fica torto.
  return tilt ? shaded.shearRows((y) => (y <= 8 ? 2 * tilt : y <= 12 ? tilt : 0)) : shaded;
}

/** Olhos grandes com um traço alado no canto de fora (a Sophia original não usa óculos). */
function drawEyes(px: Pixels, eyes: Eyes): void {
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
    if (eyes !== 'shut') px.set(flip ? x0 + 4 : x0 - 1, top, TONE.K);
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
  drawEyes(px, eyes);
  snout(px, mouth);
  return px;
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
