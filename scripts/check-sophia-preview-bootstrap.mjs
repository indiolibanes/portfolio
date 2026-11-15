// Ensure every experimental Sophia preview calls the function it actually imports.
// Previously the R3b/R3c pages compiled successfully but raised ReferenceError on load.
import { readFile, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const pages = [
  'src/pages/experimentos/sophia-face-r2/index.astro',
  'src/pages/experimentos/sophia-kitsune-r3b/index.astro',
  'src/pages/experimentos/sophia-kitsune-r3c/index.astro',
];
let checked = 0;
for (const pageFile of pages) {
  try { await access(pageFile); } catch { continue; }
  const contents = await readFile(pageFile, 'utf8');
  const match = contents.match(/import\s*\{\s*([A-Za-z_$][\w$]*)\s*\}\s*from\s*['"]([^'"]+)['"];?\s*\n\s*([A-Za-z_$][\w$]*)\(\);/);
  if (!match) throw Error('No matching import/bootstrap pair: ' + pageFile);
  const [, imported, relative, called] = match;
  if (imported !== called) throw Error(pageFile + ': imported ' + imported + ' but invoked ' + called);
  const script = resolve(dirname(pageFile), relative);
  const source = await readFile(script, 'utf8');
  if (!source.includes('export function ' + imported + '(')) throw Error(script + ': missing exported ' + imported);
  const result = spawnSync(process.execPath, ['--check', script], { encoding: 'utf8' });
  if (result.status !== 0) throw Error(script + ': syntax error: ' + result.stderr);
  checked++;
}
if (checked < 2) throw Error('Expected at least the R2 and R3b online QA pages to be checked.');
console.log('PASS: ' + checked + ' Sophia preview bootstraps/imports verified');
