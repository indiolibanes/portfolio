import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createLocalLoader,F16_HASH} from '../src/scripts/shorekeeper/local-model.mjs';
import {SHOREKEEPER_CANONICAL} from '../src/scripts/shorekeeper/private-model-cache.mjs';
import {RECIPES} from '../src/scripts/shorekeeper/shorekeeper-face-expressions.mjs';
const buildGLB=()=>{
 const source=Buffer.from(JSON.stringify({asset:{version:'2.0'},scene:0,scenes:[{nodes:[]}],nodes:[]}));
 const pad=(4-source.length%4)%4,body=Buffer.concat([source,Buffer.alloc(pad,32)]);
 const b=Buffer.alloc(20+body.length);
 b.write('glTF',0);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);
 b.writeUInt32LE(body.length,12);b.write('JSON',16);body.copy(b,20);
 return b.buffer.slice(b.byteOffset,b.byteOffset+b.length);
};
for(const [sha,expected,version] of [
 [SHOREKEEPER_CANONICAL.sha256,'CANONICAL','F2.0-A'],
 [F16_HASH,'LEGACY','F1.6'],
 ['f'.repeat(64),'UNKNOWN','GLB não reconhecido']
]){
 const loader=createLocalLoader({read:async()=>buildGLB(),hash:async()=>sha,parse:async()=>({scene:{}})});
 const r=await loader.load({name:'private.glb',size:120});
 assert.equal(r.modelStatus,expected);
 assert(r.version.includes(version));
 assert.equal(r.sha256,sha);
}
const page=await readFile('src/pages/experimentos/sk/index.astro','utf8');
const runtime=await readFile('src/scripts/shorekeeper-sk-lab.mjs','utf8');
const gentle=await readFile('src/scripts/shorekeeper/gentle-acting.mjs','utf8');
for(const id of ['MY_STAR','LITTLE_SMILE','LOVE','HELLO','HOPE','SURPRISE_SOFT','WORRIED','GLANCE']){
 assert(RECIPES[id],id+' recipe absent');
 assert(page.includes("'"+id+"'"),id+' manual button missing');
}
assert(page.includes('data-facial-qa')&&!page.includes('data-facial-qa hidden'));
assert(page.includes('data-facial-candidate={id}'));
assert(runtime.includes('face?.triggerQA(id)'));
assert(runtime.includes('face?.onAnimationEvent(e)'));
assert(runtime.includes("face?.advance(dt,{writeFacial:control('originalMode').value==='expressive'&&control('presentationMode').value!=='combat'})"));
assert(runtime.includes('scheduler?.advance(dt,{advanceFace:false})'),'face must advance only once');
assert(runtime.includes("control('presentationMode').value==='combat'"),'combat gating required');
assert(gentle.includes("SK_(?:ATTACK|SKILL|AIR_SKILL|BURST)_"));
assert(!page.includes('data-facial-qa="automatic"'),'no auto recovered expressions');
console.log('Shorekeeper F.2 canonical version + manual recovered facial controls PASS');
