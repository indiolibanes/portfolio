import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {danceRig} from '../scripts/lib/hsin-dance-rig.mjs';
import {decodeCombatData} from '../src/scripts/hsin-combat-data.mjs';
import {createCombatPose} from '../src/scripts/hsin-combat-pose.mjs';
import {createCombatDirector} from '../src/scripts/hsin-combat-director.mjs';
import {createCombatVfx} from '../src/scripts/hsin-combat-vfx.mjs';
import {createCombatEnv} from '../src/scripts/hsin-combat-env.mjs';
import {ABILITIES,ABILITY_CATEGORIES} from '../src/scripts/hsin-combat-abilities.mjs';
import {auditArms} from '../scripts/qa-hsin-combat-arms.mjs';
const results={kind:'Node deterministic + real GLB skin; no GPU/FPS evidence',clips:{}};
assert.equal(ABILITY_CATEGORIES.HEAVY.implemented,false);assert.equal(ABILITIES.formshift.implemented,false);assert.equal(ABILITIES.skill.canonicalDemonstrated,false);
for(const id of ['basic01','basic02','combo','skill']){
 const text=await readFile(`public/assets/animations/hsin/combat-r23-${id}.json`,'utf8'),manifest=JSON.parse(await readFile(`src/data/hsin-combat-r23-${id}.json`));
 assert.equal(createHash('sha256').update(text).digest('hex'),manifest.sha256);
 const data=decodeCombatData(JSON.parse(text)),r=await danceRig(),{T,model,bones,by}=r;
 model.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});
 const scene=new T.Scene();scene.add(model);const camera=new T.PerspectiveCamera(34,1,.03,45);camera.position.set(0,1,3);
 const pose=createCombatPose({T,data,bones,model}),vfx=createCombatVfx({T,scene,camera,by}),env=createCombatEnv({T,scene,camera,by,vfx});
 const events=[];let releases=0;
 const director=createCombatDirector({pose,sequence:data.sequence,onEvent:e=>{if(e==='clear'){vfx.clear();env.clear();return;}events.push([e,director.sample().time]);vfx.event(e,director.sample().time);env.event(e,director.sample().time);},onRelease:()=>{vfx.clear();env.clear();releases++;}});
 const meshGroup=scene.getObjectByName('Hsin combat R2.1 pooled effects');
 const assertNoSkill=()=>{if(id==='skill')return;const p=vfx.probe();assert.equal(p.core.visible,false);assert.equal(p.shell.visible,false);assert.ok(!events.some(([e])=>['charge','ring','recovery'].includes(e)));};
 function step(dt){director.advance(dt);if(director.owns()){vfx.update(director.sample().time);env.update(director.sample().time);}assertNoSkill();assert.ok(env.visibleDrawCalls()<=3);}
 const states=[];
 for(const hz of [30,60]){
  director.reset();events.length=0;assert.ok(director.start());assert.ok(!director.start(),'one owner');assert.ok(!director.select(data.sequence),'cannot swap active');
  for(let i=0;i<Math.ceil(data.seconds*hz)+1;i++)step(1/hz);
  assert.ok(!director.owns());assert.ok(pose.atBaseline());assert.equal(director.sample().state,'COMPLETE');
  assert.deepEqual(events,data.sequence.markers);states.push(events.slice());
 }
 assert.deepEqual(states[0],states[1]);
 // Pause, restart and interruption on both sides of each actual impact marker.
 const impacts=data.sequence.markers.filter(([e])=>e.startsWith('arc')||e==='ring').map(([,t])=>t);
 for(const at of [.15,...impacts.flatMap(t=>[t-.03,t,t+.03]),data.seconds-.1]){
  director.reset();director.start();step(at);
  const q=bones.map(b=>b.quaternion.toArray());director.pause();step(.5);assert.deepEqual(bones.map(b=>b.quaternion.toArray()),q);director.resume();
  director.interrupt();for(let i=0;i<40;i++)step(1/60);assert.ok(!director.owns());assert.ok(pose.atBaseline());assert.equal(vfx.visibleDrawCalls(),0);assert.equal(env.visibleDrawCalls(),0);
 }
 // Same poses after a long frame and uniform stepping; exact events retain their own marker poses.
 director.reset();director.start();step(2);const dropped=bones.map(b=>b.quaternion.clone()),dropTrace=events.slice();
 director.reset();director.start();for(let i=0;i<120;i++)step(1/60);
 assert.ok(Math.max(...bones.map((b,i)=>b.quaternion.clone().normalize().angleTo(dropped[i].clone().normalize())))<.00001);
 const geometry=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometry.add(o.geometry);if(o.material)materials.add(o.material);});
 for(let cycle=0;cycle<10;cycle++){director.reset();director.start();for(let i=0;i<Math.ceil(data.seconds*30)+1;i++)step(1/30);assert.ok(pose.atBaseline());const g=new Set(),m=new Set();scene.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)m.add(o.material);});assert.deepEqual(g,geometry);assert.deepEqual(m,materials);}
 // Check endpoint speed at a sub-frame spacing, including velocity of the real palms.
 let endpointSpeed=0;for(const end of [0,data.seconds]){const dt=1/600;pose.apply(Math.max(0,end-dt)/data.seconds);const a=by.get('ORG-Bip001HandR').getWorldPosition(new T.Vector3());pose.apply(Math.min(data.seconds,end+dt)/data.seconds);const b=by.get('ORG-Bip001HandR').getWorldPosition(new T.Vector3());endpointSpeed=Math.max(endpointSpeed,a.distanceTo(b)/dt);}assert.ok(endpointSpeed<.015,id+' endpoint speed '+endpointSpeed);
 director.dispose();env.dispose();vfx.dispose();assert.equal(scene.children.length,1);
 const audit=await auditArms(text,{label:id});
 for(const [side,a] of Object.entries(audit.summary)){
  assert.deepEqual(Object.entries(a.fails).filter(([,f])=>f.frames),[],id+' '+side+' anatomical gates');
  const baseline={R:{stretch:3.563,compress:.267},L:{stretch:3.284,compress:.184}}[side];
  assert.ok(a.surface.maxStretch<=baseline.stretch*1.1);assert.ok(a.surface.minCompress>=baseline.compress*.8);
 }
 await writeFile(`docs/hsin-combat-r23/anatomy-${id}.json`,JSON.stringify(audit,null,2)+'\n');
 results.clips[id]={frames:data.frameCount,seconds:data.seconds,markers:data.sequence.markers,endpointSpeedMps:endpointSpeed,releases,anatomy:'PASS',cycles:10,geometryCount:geometry.size,materialCount:materials.size};
}
await writeFile('docs/hsin-combat-r23/tests.json',JSON.stringify(results,null,2)+'\n');console.log('R2.3 independent attacks / interruption / clocks / resources / anatomy PASS',results.clips);
