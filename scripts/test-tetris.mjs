// Rules test for the 404 game. The game's pure core lives inline in src/pages/404.astro
// between "// <core>" and "// </core>"; this runs that exact block, without a DOM.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'src/pages/404.astro'), 'utf8');
const match = source.match(/\/\/ <core>([\s\S]*?)\/\/ <\/core>/);
assert.ok(match, 'core markers not found in src/pages/404.astro');
const T = new Function(match[1] + '\nreturn Tetris;')();

let passed = 0;
const test = (name, fn) => { fn(); passed += 1; console.log('PASS ' + name); };
const seeded = (seed) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const fillRow = (g, r, except = []) => { for (let c = 0; c < T.COLS; c += 1) g.board[r][c] = except.includes(c) ? 0 : 'X'; };
const sameMatrix = (a, b) => JSON.stringify(a) === JSON.stringify(b);

test('7-bag: each block of seven pieces holds all seven types', () => {
  const g = T.createGame(seeded(1));
  const seen = [g.piece.type, g.next.type];
  for (let i = 0; i < 12; i += 1) { T.hardDrop(g); if (g.clearing) T.finishClear(g); if (g.over) break; seen.push(g.next.type); }
  assert.deepEqual([...new Set(seen.slice(0, 7))].sort(), [...T.TYPES].sort());
});

test('walls stop sideways movement', () => {
  const g = T.createGame(seeded(2));
  for (let i = 0; i < 20; i += 1) T.move(g, -1);
  assert.equal(T.move(g, -1), false);
  assert.ok(g.piece.m.some((row, r) => row.some((v, c) => v && g.piece.x + c === 0)));
  for (let i = 0; i < 20; i += 1) T.move(g, 1);
  assert.equal(T.move(g, 1), false);
  assert.ok(g.piece.m.some((row) => row.some((v, c) => v && g.piece.x + c === T.COLS - 1)));
});

test('four rotations return every piece to its start', () => {
  for (const type of T.TYPES) {
    const p = T.makePiece(type);
    let m = p.m;
    for (let i = 0; i < 4; i += 1) m = T.rotateCW(m);
    assert.ok(sameMatrix(m, p.m), type);
  }
});

test('rotation near a wall kicks inside the board', () => {
  const g = T.createGame(seeded(3));
  g.piece = T.makePiece('I');
  g.piece.m = T.rotateCW(g.piece.m);
  g.piece.x = -2; g.piece.y = 5;
  assert.equal(T.collides(g.board, g.piece.m, g.piece.x, g.piece.y), false);
  assert.equal(T.rotate(g, 1), true);
  assert.equal(T.collides(g.board, g.piece.m, g.piece.x, g.piece.y), false);
});

test('hard drop lands on the floor and scores 2 per row', () => {
  const g = T.createGame(seeded(4));
  g.piece = T.makePiece('O');
  const y0 = g.piece.y;
  T.hardDrop(g);
  assert.equal(g.score, 2 * (T.ROWS - 2 - y0));
  assert.equal(g.board[T.ROWS - 1].filter(Boolean).length, 2);
});

test('soft drop scores 1 per row and stops at the floor', () => {
  const g = T.createGame(seeded(5));
  g.piece = T.makePiece('O');
  let n = 0;
  while (T.softDrop(g)) n += 1;
  assert.equal(g.score, n);
  assert.equal(g.piece.y + 2, T.ROWS);
});

test('one cleared row: 100 points, row removed, board shifted', () => {
  const g = T.createGame(seeded(6));
  fillRow(g, 19, [3, 4, 5, 6]);
  g.board[18][0] = 'X';
  g.piece = T.makePiece('I'); g.piece.x = 3;
  T.hardDrop(g);
  assert.deepEqual(g.clearing, [19]);
  assert.equal(T.finishClear(g), 1);
  assert.equal(g.score, 100 + 2 * (18 - (-1)), 'I spawns at y = -1 and lands at y = 18');
  assert.equal(g.lines, 1);
  assert.equal(g.board[19][0], 'X', 'row above fell down');
  assert.ok(g.board[18].every((v) => !v));
});

test('four rows with a vertical I: 800 points', () => {
  const g = T.createGame(seeded(7));
  for (let r = 16; r < 20; r += 1) fillRow(g, r, [9]);
  g.piece = T.makePiece('I');
  g.piece.m = T.rotateCW(g.piece.m); g.piece.x = 7; g.piece.y = 0;
  T.hardDrop(g);
  assert.equal(g.clearing.length, 4);
  const before = g.score;
  T.finishClear(g);
  assert.equal(g.score - before, 800);
  assert.equal(g.lines, 4);
});

test('level rises every 10 lines and gravity speeds up', () => {
  const g = T.createGame(seeded(8));
  g.lines = 9;
  fillRow(g, 19, [3, 4, 5, 6]);
  g.piece = T.makePiece('I'); g.piece.x = 3;
  T.hardDrop(g); T.finishClear(g);
  assert.equal(g.level, 2);
  assert.ok(T.interval(2) < T.interval(1));
  assert.ok(T.interval(60) >= 90, 'gravity has a floor');
});

test('no input while rows are clearing or after game over', () => {
  const g = T.createGame(seeded(9));
  g.clearing = [19];
  assert.equal(T.move(g, 1), false);
  assert.equal(T.rotate(g, 1), false);
  assert.equal(T.softDrop(g), false);
  assert.equal(T.hardDrop(g), null);
  assert.equal(T.tick(g), null);
  g.clearing = null; g.over = true;
  assert.equal(T.move(g, 1), false);
});

test('stacking without clearing ends the game', () => {
  const g = T.createGame(seeded(10));
  let drops = 0;
  while (!g.over && drops < 200) { T.hardDrop(g); if (g.clearing) T.finishClear(g); drops += 1; }
  assert.equal(g.over, true);
  assert.ok(drops < 200);
});

test('300 random games keep the board consistent', () => {
  for (let seed = 0; seed < 300; seed += 1) {
    const rng = seeded(seed + 100);
    const g = T.createGame(rng);
    for (let step = 0; step < 400 && !g.over; step += 1) {
      const roll = Math.floor(rng() * 7);
      if (roll === 0) T.move(g, -1);
      else if (roll === 1) T.move(g, 1);
      else if (roll === 2) T.rotate(g, 1);
      else if (roll === 3) T.rotate(g, -1);
      else if (roll === 4) T.softDrop(g);
      else if (roll === 5) { if (T.tick(g) === 'locked' && g.clearing) T.finishClear(g); }
      else { T.hardDrop(g); if (g.clearing) T.finishClear(g); }
      assert.equal(g.board.length, T.ROWS);
      assert.ok(g.board.every((row) => row.length === T.COLS));
      assert.ok(Number.isFinite(g.score) && g.score >= 0);
      if (!g.over) assert.equal(T.collides(g.board, g.piece.m, g.piece.x, g.piece.y), false, 'active piece overlaps the stack');
    }
  }
});

console.log('Tetris rules: ' + passed + ' tests passed.');
