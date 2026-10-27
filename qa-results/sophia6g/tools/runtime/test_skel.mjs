// Verifica o efeito dos canais "weights" (Blink da 6F/6G) no runtime próprio do site (gltf-skel.js).
import { readFileSync } from 'node:fs';
const [,, modPath, glbPath] = process.argv;
const { parseGLB, Skeleton } = await import(modPath);
const b = readFileSync(glbPath);
const buf = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
const { json, bin } = parseGLB(buf);
const sk = new Skeleton(json, bin);
const mi = sk.meshNode;
const out = [];
for (const name of Object.keys(sk.clips)) {
  const clip = sk.clips[name];
  let worst = 0, worstT = 0, finite = true;
  for (let i = 0; i <= 200; i++) {
    const t = clip.duration * i / 200;
    sk.evaluate([{ clip, time: t, weight: 1 }]);
    const s = [sk.S[mi * 3], sk.S[mi * 3 + 1], sk.S[mi * 3 + 2]];
    const dev = Math.max(...s.map((v) => Math.abs(v - 1)));
    if (!s.every(Number.isFinite)) finite = false;
    if (dev > worst) { worst = dev; worstT = t; }
  }
  out.push({ clip: name, meshNode: mi, maxMeshNodeScaleDeviation: +worst.toFixed(4), at_s: +worstT.toFixed(3), finite,
             morphWeights: sk.morphWeights ? Array.from(sk.morphWeights).map((v) => +v.toFixed(3)) : null });
}
console.log(JSON.stringify(out, null, 1));
