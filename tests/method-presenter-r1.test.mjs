// The atlas and SVG use one clock. The original pose timings are checked against
// the source WebP, so the falls retain their cadence and the phase cannot drift.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sampleMethodProjection } from '../src/scripts/method-projection.mjs';

const read = p => readFile(new URL('../' + p, import.meta.url));
const comp = (await read('src/components/MethodPresenter.astro')).toString();
const css = (await read('src/styles/method-scene.css')).toString();

function* chunks(buffer) {
  assert.equal(buffer.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buffer.toString('ascii', 8, 12), 'WEBP');
  for (let i = 12; i + 8 <= buffer.length;) {
    const id = buffer.toString('ascii', i, i + 4);
    const length = buffer.readUInt32LE(i + 4);
    yield [id, buffer.subarray(i + 8, i + 8 + length)];
    i += 8 + length + (length & 1);
  }
}

test('native SVG flow is inside the projection-face clip and has the four accessible steps', () => {
  const [, content] = comp.match(/<g clip-path="url\(#method-projection-face\)">([\s\S]+)<\/g>\s*<\/svg>/);
  for (const label of ['Concepção', 'Execução', 'Avaliação', 'Documentação']) {
    assert.ok(content.includes(label), label);
  }
  assert.match(content, /method-presenter__link--return/);
  assert.match(comp, /role="img"/);
  assert.match(comp, /aria-label="[^"]*concepção[^"]*documentação[^"]*"/i);
  assert.match(comp, /class="method-presenter__projection"[^>]+aria-hidden="true"/);
});

test('the 135 poses keep their original timings and map to unique atlas cells', async () => {
  const source = await read('public/images/sophia/method-presenter-r1-loop.webp');
  const durations = [...chunks(source)].filter(([id]) => id === 'ANMF')
    .map(([, frame]) => frame.readUIntLE(12, 3));
  assert.equal(durations.length, 135);
  let elapsed = 0;
  const cells = new Set();
  for (const [index, duration] of durations.entries()) {
    const pose = sampleMethodProjection(elapsed);
    assert.equal(pose.frame, index);
    assert.equal(sampleMethodProjection(elapsed + duration - 1).frame, index);
    cells.add([pose.sheet, pose.row, pose.column].join(':'));
    elapsed += duration;
  }
  assert.equal(cells.size, durations.length);
  assert.equal(elapsed, 20000);
  assert.deepEqual(sampleMethodProjection(elapsed), sampleMethodProjection(0));
});

test('highlight and actor return to the first stage together after 20 seconds', () => {
  for (const [t, expected] of [[0, 1], [4999, 1], [5000, 2], [10000, 3], [15000, 4], [19999, 4], [20000, 1]]) {
    assert.equal(sampleMethodProjection(t).phase, expected);
  }
  assert.equal(sampleMethodProjection(2500).link, 1);
  assert.equal(sampleMethodProjection(5000).link, 0);
  assert.equal(sampleMethodProjection(17500).link, 4);
});

test('the packed pose sheets have alpha, fit seven cells on each axis and keep the mobile budget', async () => {
  let bytes = 0;
  for (const name of ['poses-0', 'poses-1', 'poses-2', 'poster']) {
    const file = await read('public/images/sophia/method-projection-' + name + '.webp');
    bytes += file.length;
    const [, vp8x] = [...chunks(file)].find(([id]) => id === 'VP8X');
    const cells = name === 'poster' ? 1 : 7;
    assert.ok(vp8x[0] & 0x10, name + ' alpha');
    assert.equal(vp8x.readUIntLE(4, 3) + 1, 230 * cells);
    assert.equal(vp8x.readUIntLE(7, 3) + 1, 174 * cells);
    assert.ok(!(vp8x[0] & 0x02));
  }
  assert.ok(bytes <= 760 * 1024, `total ${bytes} bytes`);
});

test('the idle scene uses a plain poster and the playback honors decorative motion', async () => {
  const runtime = (await read('src/scripts/method-projection.mjs')).toString();
  assert.match(comp, /data-decorative-motion/);
  assert.match(comp, /method-projection-poster\.webp/);
  assert.doesNotMatch(comp, /data-loop=|method-presenter-r1-loop\.webp/);
  assert.match(runtime, /connection\?\.saveData/);
  assert.match(runtime, /document\.hidden/);
  assert.match(css, /prefers-reduced-motion:\s*no-preference/);
  assert.match(css, /aspect-ratio:\s*500\s*\/\s*360/);
  assert.doesNotMatch(comp + runtime, /\.(glb|blend)|WebGL/);
});
