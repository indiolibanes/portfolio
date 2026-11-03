import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';
const manifest=JSON.parse(readFileSync('docs/assets/public-character-migration.json','utf8'));
const redirects=readFileSync('public/_redirects','utf8');
assert.equal(manifest.fileCount,44);
assert.equal(manifest.migrations.length,manifest.fileCount);
assert.equal(new Set(manifest.migrations.map(x=>x.destination)).size,manifest.fileCount);
for(const row of manifest.migrations){
 assert(!existsSync(row.source),'Old ungrouped asset still exists: '+row.source);
 assert(existsSync(row.destination),'Missing migrated asset: '+row.destination);
 assert.equal(statSync(row.destination).size,row.size,'Asset size changed: '+row.destination);
 assert(redirects.includes('/'+row.source.slice(7)+' /'+row.destination.slice(7)+' 301'),'Missing compatibility redirect: '+row.source);
}
const hsin=readFileSync('src/scripts/hsin-stage-config.mjs','utf8');
const sophia=readFileSync('src/scripts/sophia-404-renderer.js','utf8');
const sk=readFileSync('src/scripts/shorekeeper/vfx-presets.mjs','utf8');
const music=readFileSync('src/components/MusicShelf.astro','utf8');
assert(hsin.includes('/assets/characters/hsin/models/hsin-v2.0.glb'));
assert(sophia.includes('/assets/characters/sophia/models/sophia-alpha.glb'));
assert(sophia.includes('/assets/characters/sophia/models/sophia-7b-e1.glb'));
assert(sk.includes('/assets/characters/shorekeeper/vfx/'));
assert(music.includes('/assets/characters/phrolova/vfx/'));
const privateR2=JSON.parse(readFileSync('docs/assets/private-r2-layout.json','utf8'));
assert.equal(privateR2.status,'NOT_CONNECTED_NOT_VERIFIED');
assert(!existsSync('public/assets/characters/shorekeeper/models/shorekeeper-f20a-original-idles.glb'),'Shorekeeper private GLB accidentally published');
console.log('Asset reorganized: '+manifest.fileCount+' paths; bytes preserved by stat; legacy redirects and truthful R2 gate PASS');