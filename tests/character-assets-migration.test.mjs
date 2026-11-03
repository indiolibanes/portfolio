import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync,readdirSync} from 'node:fs';
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

const stalePrefixes=[
 'assets/models/hsin/','assets/animations/hsin/','assets/scenes/hsin/',
 'assets/shorekeeper-vfx/','assets/shorekeeper-butterfly.webp',
 'assets/music-hsin-stage-2026-11-02.avif','assets/phrolova-baton-bow.webp',
 'experimental/sophia-alpha.glb','experimental/sophia-7b-e1-latest.glb',
 'experimental/sophia-2d/','images/sophia/'
];
const staleExact=['public/shorekeeper-black-shores.png','public/shorekeeper.jpg','public/phrolova.jpg','public/phrolova-baton.webp','public/hsin.webp'];
const walked=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(row=>{
 const file=dir+'/'+row.name;
 if(row.isDirectory())return walked(file);
 return /\.(?:js|mjs|ts|astro|css|json|py|sh|yml)$/.test(file)&&file!=='tests/character-assets-migration.test.mjs'?[file]:[];
});
for(const file of [...walked('src'),...walked('scripts'),...walked('tests'),...walked('public/experimental')]){
 const content=readFileSync(file,'utf8');
 for(const prefix of stalePrefixes)assert(!content.includes(prefix),'Stale public asset reference '+prefix+' in '+file);
 for(const prefix of staleExact)assert(!content.includes(prefix),'Stale root media source '+prefix+' in '+file);
}

console.log('Asset reorganized: '+manifest.fileCount+' paths; bytes preserved by stat; legacy redirects and truthful R2 gate PASS');