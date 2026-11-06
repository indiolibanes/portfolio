import test from 'node:test';
import assert from 'node:assert/strict';
import {s6DuoRequirements,nextDuoIdle,S6_DUO_STATUS} from '../src/scripts/shorekeeper/s6-duet-guest.mjs';
import {SHOREKEEPER_CANONICAL} from '../src/scripts/shorekeeper/private-model-cache.mjs';
const libs=['basic','advanced','burst'].map(id=>({id,sha256:'a'.repeat(64)}));
const manifest={schema:'shorekeeper-private-assets/v1',model:{sha256:SHOREKEEPER_CANONICAL.sha256,bytes:SHOREKEEPER_CANONICAL.bytes},libraries:libs};
test('duo rejects wrong source, empty/partial/duplicated private manifest',()=>{
 assert.equal(s6DuoRequirements(manifest,SHOREKEEPER_CANONICAL.sha256),true);
 assert.equal(s6DuoRequirements({...manifest,model:{...manifest.model,bytes:0}},SHOREKEEPER_CANONICAL.sha256),false);
 assert.equal(s6DuoRequirements({...manifest,libraries:[libs[0]]},SHOREKEEPER_CANONICAL.sha256),false);
 assert.equal(s6DuoRequirements({...manifest,libraries:[...libs,libs[0]]},SHOREKEEPER_CANONICAL.sha256),false);
 assert.equal(s6DuoRequirements({...manifest,model:{...manifest.model,sha256:'b'.repeat(64)}},SHOREKEEPER_CANONICAL.sha256),false);
});
test('duo idle rotation remains deterministic and read-only',()=>{
 assert.deepEqual([nextDuoIdle(-1),nextDuoIdle(0),nextDuoIdle(1),nextDuoIdle(2)],[0,1,2,0]);
 assert.throws(()=>nextDuoIdle(1,0));
 assert.equal(S6_DUO_STATUS.READY,'DUO_PRIVATE_PREVIEW_G7_PENDING');
});
