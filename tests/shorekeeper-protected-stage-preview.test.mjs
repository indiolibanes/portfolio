import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequestGet as protectedManifest} from '../functions/api/shorekeeper/manifest.js';
import {onRequestGet as publicManifest} from '../functions/api/stage/shorekeeper/manifest.js';

const stage=readFileSync(new URL('../src/scripts/hsin-stage.ts',import.meta.url),'utf8');

test('candidate stage uses the private source ONLY after an explicit preview opt-in',()=>{
 assert.match(stage,/privatePreview=publicRelease&&new URLSearchParams\(location\.search\)\.get\('privatePreview'\)==='1'/);
 assert.match(stage,/publicAssetSource=publicRelease&&!privatePreview/);
 assert.match(stage,/if\(publicAssetSource\)\{\s*const \{inspectPublicStageManifest,getPublicStageFile\}/);
 assert.match(stage,/releaseSource:publicAssetSource\?'public':'private'/);
 assert.match(stage,/privatePreview\s*\?\(guest\?\.ready\?'Hsin e Shorekeeper · prévia autenticada pronta\.'/);
});

test('a URL flag alone cannot bypass the protected manifest Access check',async()=>{
 const bucket={async get(){throw Error('R2 must not be read for unauthenticated request');}};
 const env={SHOREKEEPER_ASSETS_R2:bucket,SK_ACCESS_TEAM_DOMAIN:'https://example.cloudflareaccess.com',SK_ACCESS_AUD:'a'.repeat(24),SK_PUBLIC_STAGE_ENABLED:'0'};
 const privateResponse=await protectedManifest({request:new Request('https://preview.example/api/shorekeeper/manifest?privatePreview=1'),env});
 assert.equal(privateResponse.status,403);
 const publicResponse=await publicManifest({env});
 assert.equal(publicResponse.status,404,'public release still fails closed');
});
