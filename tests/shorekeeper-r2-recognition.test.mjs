import test from 'node:test';
import assert from 'node:assert/strict';
import {PRIVATE_COMBAT_BUNDLES,summarizePrivateCombat} from '../src/scripts/shorekeeper/private-library-coverage.mjs';
import {SOURCE_COMBAT_IDS} from '../src/scripts/shorekeeper/combat-director.mjs';
test('ten unique original combat animations have a three-bundle catalogue',()=>{
 assert.deepEqual(PRIVATE_COMBAT_BUNDLES.map(x=>x.id),['basic','advanced','burst']);
 assert.deepEqual(PRIVATE_COMBAT_BUNDLES.flatMap(x=>x.ids),SOURCE_COMBAT_IDS);
 assert.equal(new Set(PRIVATE_COMBAT_BUNDLES.flatMap(x=>x.ids)).size,10);
});
test('a registered R2 object is not confused with a loaded playable clip',()=>{
 const m={libraries:[{id:'basic'},{id:'advanced'},{id:'burst'}]};
 const v=summarizePrivateCombat(m,[]);
 assert.equal(v.allLoaded,false);assert.equal(v.loaded,0);assert.equal(v.total,10);
 assert.ok(v.rows.every(x=>x.state==='listed'));
});
test('manifest state and active clip state remain separate for manual GLB imports',()=>{
 const v=summarizePrivateCombat(null,PRIVATE_COMBAT_BUNDLES[2].ids);
 assert.equal(v.loaded,2);assert.equal(v.anyRegistered,false);
 assert.equal(v.rows[2].state,'loaded');assert.equal(v.rows[0].state,'absent');
});
test('BODY and RIB variants do not masquerade as independently verified source clips',()=>{
 const v=summarizePrivateCombat({libraries:[{id:'burst'}]},['SK_BURST_02_ORIGINAL_BODY','SK_BURST_02_ORIGINAL_RIB','SK_BURST_02_ORIGINAL']);
 assert.equal(v.rows[2].loaded,1);assert.equal(v.rows[2].state,'partial');
 assert.deepEqual(v.rows[2].missing,['SK_BURST_01_ORIGINAL']);
});
test('full valid set is recognized without requiring a fake VFX-to-Burst marker',()=>{
 const r=summarizePrivateCombat({libraries:PRIVATE_COMBAT_BUNDLES.map(x=>({id:x.id}))},SOURCE_COMBAT_IDS);
 assert.equal(r.loaded,10);assert.equal(r.total,10);assert.equal(r.allLoaded,true);
});
