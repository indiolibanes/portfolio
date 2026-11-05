import test from 'node:test';
import assert from 'node:assert/strict';
import {createRenderLoop} from '../src/scripts/shorekeeper/render-loop.mjs';

function harness(tick) {
 const pending=new Map();let next=0,eligible=true;
 const loop=createRenderLoop({
  request:cb=>{const id=++next;pending.set(id,cb);return id;},
  cancel:id=>{pending.delete(id);},
  eligible:()=>eligible,
  tick,
 });
 function flush(){const nextEntry=pending.entries().next().value;assert.ok(nextEntry,'no RAF scheduled');const [id,cb]=nextEntry;pending.delete(id);cb(100+next);return pending.size;}
 return {loop,pending,flush,setEligible(v){eligible=v;}};
}

test('redraw requested inside a static RAF tick remains scheduled',()=>{
 let h;
 h=harness(()=>{h.loop.wake();return false;});
 h.loop.wake();assert.equal(h.pending.size,1);
 assert.equal(h.flush(),1,'invalidation raised within tick must not be cancelled');
 assert.equal(h.loop.state.pending,true);
 h.loop.dispose();assert.equal(h.pending.size,0);
});

test('a static tick without new invalidation sleeps completely',()=>{
 const h=harness(()=>false);h.loop.wake();
 assert.equal(h.flush(),0);
 assert.equal(h.loop.state.pending,false);
 h.loop.dispose();
});

test('when tick becomes ineligible its in-flight redraw is cancelled',()=>{
 let h;h=harness(()=>{h.loop.wake();h.setEligible(false);return false;});
 h.loop.wake();assert.equal(h.flush(),0);
 assert.equal(h.loop.state.pending,false);
 h.loop.dispose();
});

test('continuous tick and reentrant wake never schedule more than one RAF',()=>{
 let h;h=harness(()=>{h.loop.wake();h.loop.wake();return true;});
 h.loop.wake();assert.equal(h.flush(),1);
 assert.equal(h.loop.state.pending,true);
 h.loop.reconcile();assert.equal(h.pending.size,1);
 h.loop.dispose();
});

test('dispose during tick releases any reentrant wake',()=>{
 let h;h=harness(()=>{h.loop.wake();h.loop.dispose();return true;});
 h.loop.wake();assert.equal(h.flush(),0);
 assert.equal(h.loop.state.disposed,true);
});
