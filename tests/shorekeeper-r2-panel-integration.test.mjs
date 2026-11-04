import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../src/pages/experimentos/sk/index.astro',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/scripts/shorekeeper-sk-lab.mjs',import.meta.url),'utf8');
test('private library panel and manual Burst launchers are wired, not decorative',()=>{
 assert.match(page,/data-r2-connection-state/);
 assert.match(page,/data-r2-library-list/);
 assert.match(page,/data-r2-recheck/);
 assert.match(page,/data-r2-quick-burst="SK_BURST_01_ORIGINAL"/);
 assert.match(page,/data-r2-quick-burst="SK_BURST_02_ORIGINAL"/);
 assert.match(app,/on\(\$\('\[data-r2-recheck\]'\)/);
 assert.match(app,/recheckR2AndLoad/);
 assert.match(app,/on\(button,'click'/);
 assert.match(app,/inspectPrivateManifest\(\{signal\}\)/);
});
test('availability follows actually loaded clips and private canonical model identity',()=>{
 assert.match(app,/summarizePrivateCombat\(r2Manifest,clips\)/);
 assert.match(app,/metadata\?\.sha256===SHOREKEEPER_CANONICAL\.sha256/);
 assert.match(app,/model\.userData\.skClips\.some\(c=>c\.name===id\)/);
 assert.match(app,/animationLibraries\.some\(lib=>lib\.sha256===entry\.sha256\)/);
});
test('VFX are procedural and remain separate from original Burst animation synchronization',()=>{
 assert.match(page,/efeitos procedurais locais/);
 assert.match(app,/narrative\?\.stop\(\)/);
 assert.match(app,/setVfxProfile/);
 assert.doesNotMatch(page,/data-r2-quick-burst="SK_BURST_02_ORIGINAL".*autoplay/m);
});
