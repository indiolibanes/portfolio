import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

export async function verifyFaceQaBuild(directory = resolve('dist')) {
  let checked = 0;
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      assert.doesNotMatch(path, /sophia-face-qa|Sophia_(?:Anime_Facial|Kitsune_Eyes)_R1/i, 'QA/private asset path in production');
      if (entry.isDirectory()) await walk(path);
      else if (/\.(?:html|js|mjs|css|json)$/i.test(entry.name)) {
        checked++;
        assert.doesNotMatch(await readFile(path, 'utf8'), /sophia-face-qa\/1\.1|Morph targets reais|Sophia_(?:Anime_Facial|Kitsune_Eyes)_R1\.glb|\/experimentos\/sophia-face-qa\//, 'QA code or private master reference in production');
      }
    }
  }
  await walk(directory);
  return { checkedTextFiles: checked, qaRouteInProduction: false, privateMasterReferences: false };
}
if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  console.log(JSON.stringify(await verifyFaceQaBuild(process.argv[2]), null, 2));
}
