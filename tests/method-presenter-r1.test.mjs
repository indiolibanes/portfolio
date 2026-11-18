import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = p => readFile(new URL('../' + p, import.meta.url));
const comp = (await read('src/components/MethodPresenter.astro')).toString();

function webpChunks(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');
  assert.equal(buffer.readUInt32LE(4), buffer.length - 8);
  const chunks = [];
  for (let i = 12; i + 8 <= buffer.length;) {
    const id = buffer.toString('ascii', i, i + 4);
    const length = buffer.readUInt32LE(i + 4);
    assert.ok(i + 8 + length <= buffer.length, id + ' must be complete');
    chunks.push([id, buffer.subarray(i + 8, i + 8 + length)]);
    i += 8 + length + (length & 1);
  }
  return chunks;
}

test('the browser receives an animated WebP by default and a poster for reduced motion', () => {
  assert.match(comp, /<picture\b[\s\S]*?<source media="[^"]*prefers-reduced-motion: reduce[^"]*" srcset="\/images\/sophia\/method-native-poster.webp"[\s\S]*?<img\s+src="\/images\/sophia\/method-native-loop.webp"/);
  assert.doesNotMatch(comp, /data-decorative-motion|data-motion-playing|<script\b|\.(glb|blend)/i);
});

test('vector labels remain clipped to the projected face and described for assistive technology', () => {
  const labels = comp.split('class="method-presenter__labels"')[1];
  assert.match(labels, /clip-path="url\(#method-projection-face\)"/);
  for (const label of ['Concepção', 'Execução', 'Avaliação', 'Documentação']) assert.ok(labels.includes(label));
  assert.match(labels, /method-presenter__link--return/);
  assert.match(comp, /role="img"/);
  assert.match(comp, /aria-label="[^"]*concepção[^"]*documentação[^"]*"/i);
});

test('the native WebP is transparent and repeats the full 20-second sequence', async () => {
  const file = await read('public/images/sophia/method-native-loop.webp');
  const chunks = webpChunks(file);
  const [, header] = chunks.find(([id]) => id === 'VP8X');
  const [, animation] = chunks.find(([id]) => id === 'ANIM');
  const frames = chunks.filter(([id]) => id === 'ANMF').map(([, frame]) => frame);
  assert.equal(header[0] & 0x12, 0x12, 'alpha and animation bits');
  assert.equal(header.readUIntLE(4, 3) + 1, 480);
  assert.equal(header.readUIntLE(7, 3) + 1, 345);
  assert.equal(animation.readUInt16LE(4), 0, 'infinite loop');
  assert.ok(frames.length >= 135, 'retains the original pose coverage');
  const times = frames.map(frame => frame.readUIntLE(12, 3));
  assert.equal(times.reduce((sum, time) => sum + time, 0), 20000);
  assert.ok(Math.min(...times) >= 20, 'avoid duration clamping in browser');
  assert.ok(new Set(frames.map(frame => frame.subarray(16).toString('base64'))).size >= 120);
  assert.ok(file.length < 1250 * 1024, `animation ${file.length} B`);
});

test('the reduced-motion source is an independent still with the same dimensions', async () => {
  const chunks = webpChunks(await read('public/images/sophia/method-native-poster.webp'));
  const [, header] = chunks.find(([id]) => id === 'VP8X');
  assert.equal(header[0] & 0x12, 0x10);
  assert.equal(header.readUIntLE(4, 3) + 1, 480);
  assert.equal(header.readUIntLE(7, 3) + 1, 345);
  assert.ok(!chunks.some(([id]) => id === 'ANIM' || id === 'ANMF'));
});
