/**
 * Combat R2.2 environmental simulation (pure Node, no THREE): determinism, clock-only dependence, pause, rewind, pool budget,
 * grounding rules (no ripple without a planted, loaded foot), dissipation. Fed with the real choreography clock, markers and
 * the real pelvis shift (score hip channel); hands follow synthetic arcs that only need to be smooth.
 */
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createEnvSim,CAPACITY,GEOMETRY_TRIANGLES,WORST_CASE_TRIANGLES} from '../src/scripts/hsin-combat-env-sim.mjs';
import {MARKERS,torso} from '../scripts/lib/hsin-combat-r21-score.mjs';
const DT=1/30,END=8.4;
const markers=new Map(MARKERS.map(([n,t])=>[n,t]));
const hand=(t,side)=>{ // smooth synthetic palms around a standing body
 const s=side==='R'?-1:1,k=t<3.6?1:0,arc=t<2.4?(t-1.8):t<3.5?(t-2.78):0;
 if(t>=3.9&&t<5.45){const g=.45-.2*Math.min(1,(t-3.9)/1.3);return [s*g/2,1.05,.28];}
 if(t>=5.45&&t<6.2){return side==='R'?[-.2-.5*(t-5.45),1.1,.4+.6*(t-5.45)]:[.2,1.05,.3];}
 return [s*(.25+.2*Math.sin(arc*4*k)),.85+.35*(side==='L'?arc*k:0),.15+.15*Math.cos(arc*4*k)];
};
function pose(t,over={}){
 const pr=hand(t,'R'),pl=hand(t,'L'),h=torso(t).hip;
 return {pr,pl,c:[(pr[0]+pl[0])/2,(pr[1]+pl[1])/2,(pr[2]+pl[2])/2],s:h,gap:Math.hypot(pr[0]-pl[0],pr[1]-pl[1],pr[2]-pl[2]),footX:[-.09,.09],footZ:[0,0],planted:[1,1],mid:[0,0,0],rd:[-.8,.1,.59],...over};
}
function alloc(){return {ringM:new Float32Array(CAPACITY.rings*16),ringC:new Float32Array(CAPACITY.rings*3),shardM:new Float32Array(CAPACITY.shards*16),shardC:new Float32Array(CAPACITY.shards*3),glintM:new Float32Array(CAPACITY.glints*16),glintC:new Float32Array(CAPACITY.glints*3),rings:0,shards:0,glints:0};}
const view={rx:1,ry:0,rz:0,ux:0,uy:1,uz:0,fx:0,fy:0,fz:1};
function run({steps,over=()=>({}),density=1,sim=createEnvSim({density}),stopAt=END}={}){
 const out=alloc(),trace=[],fired=new Set();let peak={rings:0,shards:0,glints:0,tris:0};
 for(const t of steps){
  if(t>stopAt)break;
  const p=pose(t,over(t));
  for(const [name,mt] of markers)if(mt<=t&&!fired.has(name)){fired.add(name);sim.event(name,mt,{pr:p.pr,pl:p.pl,vr:[-1.2,.2,.8],vl:[.4,1.4,.2],c:p.c,s:p.s,mid:p.mid});}
  sim.update(t,p);sim.write(t,view,out);
  peak.rings=Math.max(peak.rings,out.rings);peak.shards=Math.max(peak.shards,out.shards);peak.glints=Math.max(peak.glints,out.glints);peak.tris=Math.max(peak.tris,out.rings*GEOMETRY_TRIANGLES.ring+out.shards*GEOMETRY_TRIANGLES.shard+out.glints*GEOMETRY_TRIANGLES.glint);
  trace.push([+t.toFixed(4),out.rings,out.shards,out.glints,+out.ringC.slice(0,out.rings*3).reduce((a,b)=>a+b,0).toFixed(5),+out.shardC.slice(0,out.shards*3).reduce((a,b)=>a+b,0).toFixed(5)]);
 }
 return {sim,out,trace,peak};
}
const even=(dt)=>{const a=[];for(let t=0;t<=END+1e-9;t+=dt)a.push(Math.min(END,t));return a;};
// 1. deterministic for the same clock sequence
const a=run({steps:even(DT)}),b=run({steps:even(DT)});
assert.deepEqual(a.trace,b.trace,'same clock -> same effects');
// 2. budget: pool capacities, triangles, draw calls
assert.ok(a.peak.rings<=CAPACITY.rings&&a.peak.shards<=CAPACITY.shards&&a.peak.glints<=CAPACITY.glints,'pool capacity '+JSON.stringify(a.peak));
assert.ok(a.peak.tris<=3000,'peak triangles '+a.peak.tris);
assert.ok(WORST_CASE_TRIANGLES<=3000,'worst-case triangles with every pool full '+WORST_CASE_TRIANGLES);
assert.ok(a.peak.rings>0&&a.peak.shards>0&&a.peak.glints>0,'all three layers are used');
// 3. nothing before the first marker that owns it, nothing left after the dissipation
const early=a.trace.filter(r=>r[0]<1.4);assert.ok(early.every(r=>r[2]===0&&r[1]===0),'no shards or ripples before the first verified weight transfer (1.55 s hip peak)');
const late=a.trace.filter(r=>r[0]>=markers.get('ring')+2.6);assert.ok(late.length>0&&late.every(r=>r[1]===0&&r[2]===0&&r[3]===0),'the field is gone 2.6 s after the release (embers fade over about 2 s)');
// 4. frame-rate independence of the spawn budget (the sequence of clock values changes, the effect does not)
const slow=run({steps:even(1/17)}),fast=run({steps:even(1/60)});
const sp=r=>r.sim.state.stats.shards,ratio=sp(slow)/sp(fast);
assert.ok(ratio>.8&&ratio<1.2,'spawned shards at 17 Hz vs 60 Hz '+sp(slow)+' / '+sp(fast));
assert.ok(Math.abs(slow.sim.state.stats.ripples-fast.sim.state.stats.ripples)<=1,'ripples do not depend on the frame rate');
// 5. pause: the same clock value changes nothing
{const sim=createEnvSim(),out=alloc();for(const t of even(DT)){if(t>5.2)break;const p=pose(t);for(const [n,mt] of markers)if(mt<=t&&mt>t-DT)sim.event(n,mt,{pr:p.pr,pl:p.pl,vr:[0,0,0],vl:[0,0,0],c:p.c,s:p.s,mid:p.mid});sim.update(t,p);}
 const p=pose(5.2);sim.write(5.2,view,out);const first=[out.rings,out.shards,out.glints,Array.from(out.shardM.slice(0,out.shards*16))];
 for(let i=0;i<30;i++){sim.update(5.2,p);sim.write(5.2,view,out);}
 assert.deepEqual([out.rings,out.shards,out.glints,Array.from(out.shardM.slice(0,out.shards*16))],first,'paused effects stay exactly where they are');}
// 6. rewind / restart resets
{const r=run({steps:even(DT),stopAt:4.6});const out=alloc();r.sim.update(.5,pose(.5));r.sim.write(.5,view,out);assert.equal(out.shards+out.rings+out.glints,0,'going back to the start clears the field');}
// 7. grounding: no ripple and no floor fragment without a planted, loaded foot
{const air=run({steps:even(DT),over:()=>({planted:[0,0]})});
 // ripples that remain are the skill mandala responses (centre of the feet), never foot ripples: count only those after the release
 const rel=markers.get('charge');assert.ok(air.trace.filter(r=>r[0]>1&&r[0]<rel-.05).every(r=>r[1]===0),'no floor rings during the Basic strikes when no foot is planted (the charge seal belongs to the Skill)');
 assert.equal(air.sim.state.stats.transfers,0,'no weight-transfer ripples in the air');}
// 8. weight transfer: verified pelvis peaks over planted feet make ripples near the real hip extremes
{const times=[];const sim=createEnvSim();const out=alloc();const seen=new Set();let lastR=0;
 for(const t of even(DT)){const p=pose(t);for(const [n,mt] of markers)if(mt<=t&&!seen.has(n)){seen.add(n);sim.event(n,mt,{pr:p.pr,pl:p.pl,vr:[-1.2,.2,.8],vl:[.4,1.4,.2],c:p.c,s:p.s,mid:p.mid});}
  sim.update(t,p);if(sim.state.stats.ripples>lastR){times.push(+t.toFixed(2));lastR=sim.state.stats.ripples;}}
 assert.ok(sim.state.stats.transfers>=2,'verified weight-transfer peaks '+sim.state.stats.transfers);
 const near=(x,c)=>times.some(t=>Math.abs(t-x)<.35);for(const x of [2.2,3.32,5.45])assert.ok(near(x,times),'a ripple near '+x+' s: '+times.join(','));
 mkdirSync('docs/hsin-combat-r22',{recursive:true});
 writeFileSync('docs/hsin-combat-r22/env-sim-qa.json',JSON.stringify({peak:a.peak,spawned:a.sim.state.stats,rippleTimes:times,spawnRatio17vs60:+ratio.toFixed(3),budget:{rings:CAPACITY.rings,shards:CAPACITY.shards,glints:CAPACITY.glints,maxTriangles:WORST_CASE_TRIANGLES}},null,1)+'\n');}
console.log('hsin-combat-env-sim ok',JSON.stringify(a.peak));
