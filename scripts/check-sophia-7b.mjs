/** Validate the actual author-supplied Sophia 7B E1 in this repository. */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const file = 'public/experimental/sophia-7b-e1-latest.glb';
if (!existsSync(file)) throw Error('Sophia 7B E1 missing: ' + file);
const data = readFileSync(file);
if (data.length < 500_000 || data.toString('ascii', 0, 4) !== 'glTF') throw Error('Invalid GLB file');
if (data.readUInt32LE(4) !== 2 || data.readUInt32LE(8) !== data.length) {
  throw Error('GLB header/version/declared length invalid');
}
const jsonLength = data.readUInt32LE(12);
if (data.toString('ascii', 16, 20) !== 'JSON' || 20 + jsonLength > data.length) {
  throw Error('GLB JSON chunk invalid');
}
const gltf = JSON.parse(data.toString('utf8', 20, 20 + jsonLength));
if (!gltf.meshes?.length || !gltf.materials?.length || !gltf.images?.length) {
  throw Error('Sophia must have mesh, materials and embedded textures');
}
const checksum = createHash('sha256').update(data).digest('hex');
console.log('PASS Sophia 7B E1 latest', JSON.stringify({
  bytes: data.length,
  sha256: checksum,
  meshes: gltf.meshes.length,
  materials: gltf.materials.length,
  images: gltf.images.length,
  skins: gltf.skins?.length || 0,
  animations: (gltf.animations || []).map(clip => clip.name || '(unnamed)'),
}));
