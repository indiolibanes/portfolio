import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBehaviorDirector, smoothQuintic, solveTwoLink, sampleGestureArc} from '../src/scripts/hsin-acting-director.mjs';
assert.equal(smoothQuintic(0),0);assert.equal(smoothQuintic(1),1);
const from=new THREE.Vector3(0,0,0), to=new THREE.Vector3(1,0,0), bend=new THREE.Vector3(0,1,0);
const mid=sampleGestureArc(THREE,from,to,bend,.5);assert.ok(mid.y>.1);assert.ok(sampleGestureArc(THREE,from,to,bend,0).distanceTo(from)<1e-8);assert.ok(sampleGestureArc(THREE,from,to,bend,1).distanceTo(to)<1e-8);
const sol=solveTwoLink(THREE,from,to,bend,1,1);assert.ok(sol.reachable);assert.ok(sol.elbow.y>0);assert.ok(Math.abs(sol.elbow.length()-1)<1e-6);assert.ok(Math.abs(sol.elbow.distanceTo(sol.end)-1)<1e-6);assert.equal(solveTwoLink(THREE,from,to,to,1,1),null);assert.equal(solveTwoLink(THREE,from,new THREE.Vector3(3,0,0),bend,1,1).reachable,false);
let id=0,queue=new Map(),states=[];const director=createBehaviorDirector({onState:s=>states.push(s),requestFrame:fn=>{queue.set(++id,fn);return id},cancelFrame:i=>queue.delete(i),seed:4});
assert.equal(director.start({reducedMotion:true}),false);assert.equal(director.start(),true);
let clock=0;function frame(dt=100){clock+=dt;const jobs=[...queue.values()];queue.clear();jobs.forEach(fn=>fn(clock))}
for(let i=0;i<60;i++)frame();assert.ok(states.includes('anticipate'));assert.ok(states.includes('gesture'));
director.setVisible(false);const prior=director.getState().elapsed;assert.equal(queue.size,0);clock+=100000;director.setVisible(true);frame();assert.equal(director.getState().elapsed,prior);
for(let i=0;i<100;i++)frame();assert.ok(states.includes('hold'));assert.ok(states.includes('release'));director.stop();assert.equal(queue.size,0);assert.equal(director.getState().state,'stopped');console.log('Hsin acting director and spatial geometry: PASS');
