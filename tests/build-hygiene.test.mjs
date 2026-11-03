import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm, symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cleanBuildOutput, verifyBuildOutput} from '../scripts/build-hygiene.mjs';

test('clean removes stale output while preserving sources and symlink targets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'build-hygiene-'));
  try {
    await mkdir(join(root, 'public'));
    await mkdir(join(root, 'dist'));
    await writeFile(join(root, 'public', 'source.txt'), 'keep');
    await writeFile(join(root, 'dist', 'stale.txt'), 'old');
    await cleanBuildOutput(root);
    await assert.rejects(readFile(join(root, 'dist', 'stale.txt')), {code: 'ENOENT'});
    assert.equal(await readFile(join(root, 'public', 'source.txt'), 'utf8'), 'keep');
    await symlink(join(root, 'public'), join(root, 'dist'), 'dir');
    await cleanBuildOutput(root);
    assert.equal(await readFile(join(root, 'public', 'source.txt'), 'utf8'), 'keep');
  } finally { await rm(root, {recursive: true, force: true}); }
});

test('output gate rejects accidental private files and allows intended public assets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'build-hygiene-'));
  try {
    await mkdir(join(root, 'dist', '.well-known'), {recursive: true});
    await writeFile(join(root, 'dist', '.well-known', 'security.txt'), 'public');
    await writeFile(join(root, 'dist', 'hsin.glb'), 'intentional public fixture');
    await verifyBuildOutput(root);
    for (const name of ['.env', '.partial.glb.copy', 'PRIVATE_model.glb', 'trace.log']) {
      await writeFile(join(root, 'dist', name), 'fixture');
      await assert.rejects(verifyBuildOutput(root), /restricted or temporary/);
      await rm(join(root, 'dist', name));
    }
  } finally { await rm(root, {recursive: true, force: true}); }
});
