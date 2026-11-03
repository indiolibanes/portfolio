import {readdir, rm} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

// Astro uses its default dist/ directory in this repository. Never delete public/.
export async function cleanBuildOutput(root) {
  await rm(join(root, 'dist'), {recursive: true, force: true});
}

export async function verifyBuildOutput(root) {
  const rejected = [];
  async function walk(directory, relative = '') {
    for (const item of await readdir(directory, {withFileTypes: true})) {
      const path = relative ? relative + '/' + item.name : item.name;
      const hidden = item.name.startsWith('.') && item.name !== '.well-known';
      const restricted = /^PRIVATE_/i.test(item.name) || item.name === 'local-private'
        || /\.(?:pem|key|log|tmp|bak)$/i.test(item.name);
      if (hidden || restricted || item.isSymbolicLink()) rejected.push(path);
      else if (item.isDirectory()) await walk(join(directory, item.name), path);
    }
  }
  await walk(join(root, 'dist'));
  if (rejected.length) throw Error('Build contains restricted or temporary files (' + rejected.length + '). Inspect locally.');
  console.log('Build hygiene: PASS');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  if (process.argv[2] === 'clean') await cleanBuildOutput(root);
  else if (process.argv[2] === 'verify') await verifyBuildOutput(root);
  else throw Error('Usage: node scripts/build-hygiene.mjs clean|verify');
}
