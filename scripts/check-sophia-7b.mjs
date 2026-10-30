/**
 * Integration gate. The 7B-E1 Tripo GLB is an author-provided binary attachment,
 * not text; it cannot be synthesized from its name or replaced with the 6H.
 * GitHub uploads require the actual GLB bytes.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const file = 'public/experimental/sophia-7b-e1-stage.glb';
const expectedSha = 'ba75051ed118863656a4878e584c9388be3646289eefb4bd2044860bd99fa90d';
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
const names = (json.animations||[]).map(a=>a.name);
for (const clip of ['Idle_Breathe','Focus_On_Game','Celebrate_Small','Look_Around'])
  if (!names.includes(clip)) throw Error('Missing required stage clip: ' + clip);
if ((json.skins||[]).length) throw Error('Unexpected rig: stage source must remain unrigged');
console.log('PASS Sophia 7B-E1 Stage —',bytes.length,'bytes,',names.join(', '));
