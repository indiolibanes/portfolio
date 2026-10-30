/**
 * Integration gate. The 7B-E1 Tripo GLB is an author-provided binary attachment,
 * not text; it cannot be synthesized from its name or replaced with the 6H.
 * GitHub uploads require the actual GLB bytes.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const file = 'public/experimental/sophia-7b-e1.glb';
const expectedSha = 'b0f2c2e9106768b74b0582a703cf5b1c4d4ac2aac57b461ddc22f5696791c53a';
if (!existsSync(file)) {
  console.error('BLOCKED — Missing author-provided 7B GLB:', file);
  console.error('Upload sophia-7b-e1.glb to public/experimental/ in the PR branch.');
  process.exit(1);
}
const bytes = readFileSync(file);
if (bytes.toString('ascii', 0, 4) !== 'glTF') throw Error('Invalid GLB magic');
const length = bytes.readUInt32LE(8);
if (bytes.length !== length) throw Error('GLB length mismatch');
const jsonLength = bytes.readUInt32LE(12);
const json = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
if (!json.meshes?.length || !json.materials?.length) throw Error('Missing mesh/material');
const hash = createHash('sha256').update(bytes).digest('hex');
if (hash !== expectedSha) throw Error('Source GLB does not match approved user upload: ' + hash);
console.log('PASS Sophia 7B-E1 —', bytes.length, 'bytes,',json.meshes.length,'mesh(es),',
  (json.skins || []).length, 'skin(s),',(json.animations||[]).length,'animation(s)');
