// node scripts/test-sophia-morph-runtime.mjs CAMINHO.glb
// Regressão do runtime próprio (gltf-skel.js) com GLBs que trazem canais glTF "weights" (Blink da Sophia 6F/6G):
// a escala do nó da malha deve permanecer 1 em todos os clipes e os pesos de morph devem ser expostos.
import { readFileSync } from 'node:fs';
import { parseGLB, Skeleton } from '../public/experimental/gltf-skel.js';
const path = process.argv[2];
if (!path) { console.error('uso: node scripts/test-sophia-morph-runtime.mjs CAMINHO.glb'); process.exit(2); }
const b = readFileSync(path);
const { json, bin } = parseGLB(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
const sk = new Skeleton(json, bin);
let fail = 0;
for (const [name, clip] of Object.entries(sk.clips)) {
  let maxDev = 0, peak = 0;
  for (let i = 0; i <= 400; i += 1) {
    sk.evaluate([{ clip, time: clip.duration * i / 400, weight: 1 }]);
    const o = sk.meshNode * 3;
    maxDev = Math.max(maxDev, Math.abs(sk.S[o] - 1), Math.abs(sk.S[o + 1] - 1), Math.abs(sk.S[o + 2] - 1));
    if (sk.morphWeights.length) peak = Math.max(peak, sk.morphWeights[0]);
  }
  const ok = maxDev < 1e-6;
  if (!ok) fail += 1;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}: desvio de escala do nó da malha=${maxDev.toFixed(6)} pico de ${sk.targetNames[0] || 'morph 0'}=${peak.toFixed(3)}`);
}
process.exit(fail ? 1 : 0);
