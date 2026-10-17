/**
 * Cena do quarto escuro: Sophia jogando, de óculos 3D, com o controle nas patas
 * e vários monitores. Tudo é pixel art em texto/código (ver sophia-pixel.ts).
 *
 * A cena tem uma camada fixa e camadas animadas. Cada camada animada é uma lista
 * de quadros (Pixels do tamanho da cena, quase vazios); o componente os empilha
 * e o CSS alterna a visibilidade. `under` desenha atrás da parte fixa.
 */
import { Pixels, TONE, fromRows, mirror, shadeUnderside } from './sophia-pixel.ts';
import { STAR, furFor, type Mouth } from './sophia-art.ts';

export const SCENE_W = 144;
export const SCENE_H = 56;

const ROOM = {
  wall: '#131312',
  glow1: '#191918',
  glow2: '#151514',
  floor: '#121211',
  floorLine: '#242422',
  chair: '#1f1f1d',
  chairStripe: '#2f2f2c',
  desk: '#34342f',
  deskEdge: '#5a5a53',
  deskFront: '#1a1a18',
  bezel: '#3d3d38',
  bezelLight: '#5a5a53',
  screenDark: '#0a0a0a',
  cable: '#2b2b28',
  lensLight: '#dcdcd6',
  lensDark: '#3a3a36',
} as const;

const SCREENS = {
  l1: { x: 5, y: 14, w: 37, h: 25 },
  l2: { x: 11, y: 2, w: 23, h: 9 },
  r1: { x: 102, y: 14, w: 37, h: 25 },
  r2: { x: 110, y: 2, w: 23, h: 9 },
  l3: { x: 45, y: 33, w: 11, h: 11 },
} as const;

type ScreenId = keyof typeof SCREENS;

/** Área útil da tela (dentro do bisel de 2 px; 1 px nas pequenas). */
function inner(id: ScreenId) {
  const s = SCREENS[id];
  const b = s.w < 15 ? 1 : 2;
  return { x: s.x + b, y: s.y + b, w: s.w - 2 * b, h: s.h - 2 * b };
}

const lcg = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};

// --------------------------------------------------------------- cabeça 3D --

const FRAME_3D = [
  '.KKKKKKKKK.',
  'K.........K',
  'K.........K',
  'K.........K',
  'K.........K',
  'K.........K',
  'K.........K',
  '.KKKKKKKKK.',
];

type Gaze = 'fwd' | 'shut';

/** Cabeça de frente com óculos 3D: lente esquerda clara, direita escura. */
export function head3d(gaze: Gaze, mouth: Mouth): Pixels {
  const px = furFor(0);
  px.stamp(fromRows(STAR), 9, 9);
  const frame = fromRows(FRAME_3D);
  const lenses: [number, string][] = [[4, ROOM.lensLight], [18, ROOM.lensDark]];
  lenses.forEach(([x, fill], n) => {
    px.rect(x + 1, 14, 9, 6, fill);
    px.stamp(frame, x, 13);
    // reflexo diagonal
    const hi = n === 0 ? TONE.w : TONE.g;
    px.set(x + 2, 15, hi).set(x + 3, 14, hi).set(x + 1, 16, hi);
    const eye = n === 0 ? TONE.K : TONE.g;
    if (gaze === 'shut') px.rect(x + 3, 17, 5, 1, eye);
    else {
      px.rect(x + 4, 15, 3, 4, eye).rect(x + 3, 16, 5, 2, eye);
      px.set(x + 4, 16, TONE.w);
    }
  });
  px.rect(15, 14, 3, 2, TONE.K); // ponte
  px.rect(1, 14, 3, 1, TONE.K).rect(29, 14, 3, 1, TONE.K); // hastes
  px.rect(15, 19, 3, 1, TONE.K).set(16, 20, TONE.K); // nariz
  if (mouth === 'grin') {
    px.rect(10, 21, 13, 1, TONE.K);
    px.rect(12, 22, 9, 1, TONE.w).set(11, 22, TONE.K).set(21, 22, TONE.K);
    px.rect(13, 23, 7, 1, TONE.m).set(12, 23, TONE.K).set(20, 23, TONE.K);
    px.rect(13, 24, 7, 1, TONE.K);
  } else {
    px.set(13, 21, TONE.K).set(19, 21, TONE.K).rect(14, 22, 5, 1, TONE.K);
  }
  return px;
}

// ---------------------------------------------------------------- controle --

/** Controle visto de cima, com as patas nas empunhaduras. `press` acende botões. */
export function controller(press: 0 | 1 | 2): Pixels {
  const px = new Pixels(29, 11);
  const body = '#a9a9a3';
  const shade = '#77776f';
  px.rect(3, 1, 23, 7, body).rect(1, 3, 27, 6, body).rect(0, 5, 29, 5, body);
  px.rect(0, 5, 29, 1, shade).rect(1, 9, 27, 1, shade);
  // D-pad
  px.rect(7, 3, 1, 5, TONE.K).rect(5, 5, 5, 1, TONE.K);
  // botões em losango
  const lit = (n: number) => (press === n ? TONE.w : TONE.K);
  px.set(21, 3, lit(1)).set(19, 5, TONE.K).set(23, 5, lit(2)).set(21, 7, TONE.K);
  // analógicos
  px.rect(12, 6, 2, 2, TONE.K).rect(15, 6, 2, 2, TONE.K);
  // patas por cima das empunhaduras
  const paw = (x: number, dy: number) => {
    px.rect(x, 4 + dy, 6, 5, TONE.W).rect(x + 1, 3 + dy, 4, 1, TONE.W);
    px.set(x + 1, 8 + dy, TONE.g).set(x + 3, 8 + dy, TONE.g).set(x + 5, 8 + dy, TONE.g);
  };
  paw(0, press === 1 ? 1 : 0);
  paw(23, press === 2 ? 1 : 0);
  return px;
}

// ------------------------------------------------------------------- cauda --

const TAIL = [
  '......mmm.....',
  '.....mmmmm....',
  '.....mmmmmm...',
  '....mmmmmmm...',
  '....mmmmmmmm..',
  '...mmmmmmmmm..',
  '...WmmmmmmmW..',
  '..WWWmmmmWWWW.',
  '..WWWWWWWWWWW.',
  '..WWWWWWWWWWWW',
  '.WWWWWWWWWWWWW',
  '.WWWWWWWWWWWWW',
  '.WWWWWWWWWWWW.',
  'WWWWWWWWWWWW..',
  'WWWWWWWWWWW...',
  'WWWWWWWWWW....',
  'WWWWWWWWW.....',
  'WWWWWWWW......',
  'WWWWWW........',
  'WWWW..........',
];

export function tail(sway: 0 | 1): Pixels {
  const t = shadeUnderside(fromRows(TAIL));
  return sway ? t.shearRows((y) => (y < 7 ? 1 : 0)) : t;
}

// ------------------------------------------------------------ conteúdo das telas --

function tetrisScreen(frame: number): Pixels {
  const px = new Pixels(SCENE_W, SCENE_H);
  const a = inner('l1');
  px.rect(a.x, a.y, a.w, a.h, '#0d0d0d');
  const cell = (cx: number, cy: number, tone: string) => {
    const x = a.x + 6 + cx * 2;
    const y = a.y + cy * 2;
    px.rect(x, y, 2, 2, tone).set(x + 1, y + 1, TONE.m);
  };
  // campo
  px.rect(a.x + 5, a.y, 1, a.h, '#3b3b37').rect(a.x + 6 + 16, a.y, 1, a.h, '#3b3b37');
  const rng = lcg(7);
  for (let cy = 6; cy < 10; cy += 1) {
    for (let cx = 0; cx < 8; cx += 1) if (rng() > 0.28 + (9 - cy) * 0.12) cell(cx, cy, cy % 2 ? TONE.W : TONE.g);
  }
  // peça caindo (T) em 4 passos
  const y = 1 + (frame % 4);
  [[3, y], [4, y], [5, y], [4, y + 1]].forEach(([cx, cy]) => cell(cx, cy, TONE.w));
  // painel lateral
  px.rect(a.x + 25, a.y + 1, 6, 1, TONE.g).rect(a.x + 25, a.y + 3, 4 + (frame % 2), 1, TONE.m);
  px.rect(a.x + 25, a.y + 6, 5, 4, '#2a2a27').rect(a.x + 26, a.y + 7, 3, 2, TONE.W);
  return px;
}

function textScreen(id: 'l2', frame: number): Pixels {
  const px = new Pixels(SCENE_W, SCENE_H);
  const a = inner(id);
  px.rect(a.x, a.y, a.w, a.h, '#0d0d0d');
  const widths = [14, 9, 16, 7, 12, 15, 8];
  for (let r = 0; r < 3; r += 1) {
    const w = widths[(r + frame) % widths.length];
    px.rect(a.x + 1, a.y + r * 2, Math.min(w, a.w - 2), 1, r === 1 ? TONE.W : TONE.g);
  }
  return px;
}

function starScreen(frame: number): Pixels {
  const px = new Pixels(SCENE_W, SCENE_H);
  const a = inner('r1');
  px.rect(a.x, a.y, a.w, a.h, '#0d0d0d');
  const rng = lcg(21);
  const pts: [number, number][] = [];
  for (let i = 0; i < 16; i += 1) pts.push([1 + Math.floor(rng() * (a.w - 2)), 1 + Math.floor(rng() * (a.h - 2))]);
  pts.forEach(([x, y], i) => px.set(a.x + x, a.y + y, (i + frame) % 3 === 0 ? TONE.w : TONE.m));
  // constelação com linhas
  const c: [number, number][] = [[5, 14], [11, 9], [18, 12], [24, 6], [29, 10]];
  for (let i = 0; i < c.length - 1; i += 1) px.line(a.x + c[i][0], a.y + c[i][1], a.x + c[i + 1][0], a.y + c[i + 1][1], '#3f3f3a');
  c.forEach(([x, y], i) => {
    px.set(a.x + x, a.y + y, TONE.W);
    if ((i + frame) % 3 === 0) px.set(a.x + x - 1, a.y + y, TONE.g).set(a.x + x + 1, a.y + y, TONE.g).set(a.x + x, a.y + y - 1, TONE.g).set(a.x + x, a.y + y + 1, TONE.g);
  });
  return px;
}

function equalizer(frame: number): Pixels {
  const px = new Pixels(SCENE_W, SCENE_H);
  const a = inner('r2');
  px.rect(a.x, a.y, a.w, a.h, '#0d0d0d');
  const rng = lcg(33 + frame * 5);
  for (let i = 0; i < 6; i += 1) {
    const h = 1 + Math.floor(rng() * a.h);
    px.rect(a.x + 1 + i * 3, a.y + a.h - h, 2, h, i % 2 ? TONE.W : TONE.g);
  }
  return px;
}

function pulse(id: 'l3', frame: number): Pixels {
  const px = new Pixels(SCENE_W, SCENE_H);
  const a = inner(id);
  px.rect(a.x, a.y, a.w, a.h, '#0d0d0d');
  const ys = [4, 4, 3, 1, 6, 4, 4, 4, 4];
  for (let i = 0; i < a.w; i += 1) px.set(a.x + i, a.y + ys[(i + frame * 3) % ys.length], TONE.W);
  px.rect(a.x, a.y + a.h - 2, a.w, 1, '#2a2a27');
  return px;
}

// -------------------------------------------------------------- cena fixa --

function monitor(px: Pixels, id: ScreenId): void {
  const s = SCREENS[id];
  px.rect(s.x, s.y, s.w, s.h, ROOM.bezel);
  px.rect(s.x, s.y, s.w, 1, ROOM.bezelLight);
  const a = inner(id);
  px.rect(a.x, a.y, a.w, a.h, ROOM.screenDark);
}

function glow(px: Pixels, id: ScreenId, reach: number): void {
  const s = SCREENS[id];
  for (let y = s.y - reach; y < s.y + s.h + reach; y += 1) {
    for (let x = s.x - reach; x < s.x + s.w + reach; x += 1) {
      if (px.get(x, y)) continue;
      const dx = Math.max(s.x - x, 0, x - (s.x + s.w - 1));
      const dy = Math.max(s.y - y, 0, y - (s.y + s.h - 1));
      const d = Math.max(dx, dy);
      if (d > 0 && d <= reach && (x + y) % 2 === 0) px.set(x, y, d <= 2 ? ROOM.glow1 : ROOM.glow2);
    }
  }
}

/** Fundo: parede, brilho das telas e chão. Fica atrás da cauda e de tudo. */
export function sceneBackdrop(): Pixels {
  const px = new Pixels(SCENE_W, SCENE_H);
  px.rect(0, 0, SCENE_W, SCENE_H, ROOM.wall);
  // brilho das telas na parede
  (Object.keys(SCREENS) as ScreenId[]).forEach((id) => glow(px, id, id === 'l1' || id === 'r1' ? 5 : 3));
  // chão
  px.rect(0, 51, SCENE_W, SCENE_H - 51, ROOM.floor).rect(0, 51, SCENE_W, 1, ROOM.floorLine);
  return px;
}

/** Primeiro plano fixo: cadeira, mesa, monitores e a Sophia sem expressão. */
export function sceneStatic(): Pixels {
  const px = new Pixels(SCENE_W, SCENE_H);

  // cadeira gamer: costas altas com listras
  px.rect(52, 1, 41, 48, ROOM.chair);
  [[52, 1], [53, 1], [52, 2], [92, 1], [91, 1], [92, 2]].forEach(([x, y]) => px.set(x, y, ROOM.wall));
  px.rect(55, 3, 1, 45, ROOM.chairStripe).rect(89, 3, 1, 45, ROOM.chairStripe);
  px.rect(70, 49, 5, 3, ROOM.chair).rect(62, 51, 21, 1, ROOM.chair); // pé da cadeira

  // mesa
  px.rect(14, 45, 116, 1, ROOM.deskEdge).rect(14, 46, 116, 2, ROOM.desk).rect(14, 48, 116, 3, ROOM.deskFront);
  px.rect(16, 48, 3, 3, ROOM.chair).rect(125, 48, 3, 3, ROOM.chair);

  // cabos que descem da mesa
  px.rect(110, 48, 1, 8, ROOM.cable).rect(111, 52, 6, 1, ROOM.cable).rect(34, 48, 1, 8, ROOM.cable);

  // monitores: hastes primeiro, depois as telas
  px.rect(22, 11, 3, 3, ROOM.bezel).rect(123, 11, 3, 3, ROOM.bezel); // braços dos monitores de cima
  px.rect(22, 39, 3, 5, ROOM.bezel).rect(15, 44, 17, 1, ROOM.deskEdge); // pé do L1
  px.rect(121, 39, 3, 5, ROOM.bezel).rect(114, 44, 17, 1, ROOM.deskEdge); // pé do R1
  (Object.keys(SCREENS) as ScreenId[]).forEach((id) => monitor(px, id));

  // corpo da Sophia: pescoço, ombros inclinados e braços até o controle
  const body = new Pixels(SCENE_W, SCENE_H);
  body.rect(66, 28, 13, 3, TONE.W); // pescoço
  body.rect(61, 31, 23, 1, TONE.W).rect(59, 32, 27, 1, TONE.W).rect(57, 33, 31, 1, TONE.W);
  body.rect(56, 34, 33, 11, TONE.W);
  body.rect(56, 34, 4, 11, TONE.g).rect(85, 34, 4, 11, TONE.g); // braços na lateral
  body.rect(60, 36, 25, 1, TONE.g); // dobra do peito
  px.stamp(shadeUnderside(body), 0, 0);

  // cabeça fixa (rosto base); as expressões animadas vêm por cima
  px.stamp(head3d('fwd', 'smile'), 56, 2);
  return px;
}

// ------------------------------------------------------------- camadas --

export interface Layer {
  id: string;
  /** under = atrás da parte fixa. */
  z: 'under' | 'over';
  frames: Pixels[];
  /** Quadros que o CSS alterna; `timeline` indica a linha do tempo própria. */
  timeline?: 'head';
  /** Duração do ciclo completo em segundos. */
  seconds: number;
}

function at(frame: Pixels, x: number, y: number): Pixels {
  const px = new Pixels(SCENE_W, SCENE_H);
  px.stamp(frame, x, y);
  return px;
}

export function sceneLayers(): Layer[] {
  const headAt = (g: Gaze, m: Mouth) => at(head3d(g, m), 56, 2);
  return [
    { id: 'tail', z: 'under', seconds: 3.2, frames: [at(tail(0), 87, 26), at(tail(1), 87, 26)] },
    { id: 'head', z: 'over', seconds: 9, timeline: 'head', frames: [headAt('fwd', 'smile'), headAt('shut', 'smile'), headAt('fwd', 'grin')] },
    { id: 'pad', z: 'over', seconds: 0.9, frames: [at(controller(0), 58, 38), at(controller(1), 58, 38), at(controller(0), 58, 38), at(controller(2), 58, 38)] },
    { id: 'l1', z: 'over', seconds: 2.4, frames: [0, 1, 2, 3].map(tetrisScreen) },
    { id: 'l2', z: 'over', seconds: 2.1, frames: [0, 1, 2].map((f) => textScreen('l2', f)) },
    { id: 'r1', z: 'over', seconds: 2.7, frames: [0, 1, 2].map(starScreen) },
    { id: 'r2', z: 'over', seconds: 1.2, frames: [0, 1, 2, 3].map(equalizer) },
    { id: 'l3', z: 'over', seconds: 1.8, frames: [0, 1, 2].map((f) => pulse('l3', f)) },
  ];
}
