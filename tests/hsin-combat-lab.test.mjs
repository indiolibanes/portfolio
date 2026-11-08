import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {danceRig} from '../scripts/lib/hsin-dance-rig.mjs';
import {createCombatLab} from '../src/scripts/hsin-combat-lab.mjs';
const r22=process.argv.includes('--r22'),version=process.argv.includes('--r2')||r22?'r2':'r1';
const r=await danceRig(),{T,model,bones}=r;
const scene=new T.Scene();scene.add(model);
const orbit=new T.EventDispatcher();orbit.target=new T.Vector3(0,1,0);orbit.enablePan=false;
const camera=new T.PerspectiveCamera(34,16/9,.03,45);camera.position.set(0,1,3);
const canvas=new EventTarget(),controller=new AbortController(),status={textContent:''};
class Button extends EventTarget{constructor(action){super();this.dataset={combatAction:action};}}
const buttons=['play','restart','stop','pause','camera'].map(a=>new Button(a));
const root={querySelector:selector=>selector==='[data-combat-version]'?{value:r22?'r22':version}:status,querySelectorAll:selector=>selector==='[data-combat-action]'?buttons:[]};
let danceOwned=false,releases=0;
const body={busy:()=>false,reset(){},release(){releases++;}};
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>new Response(await readFile('public/assets/animations/hsin/combat-'+version+'.json','utf8'));
const manifest=JSON.parse(await readFile('src/data/hsin-combat-'+version+'.json'));
const lab=await createCombatLab({T,root,scene,model,bones,body,dance:()=>({owns:()=>danceOwned}),camera,orbit,canvas,signal:controller.signal,invalidate(){},modelHash:manifest.modelSha256,profileHash:manifest.profileSha256});
const envGroup=()=>scene.getObjectByName('Hsin combat R2.2 environment effects');
const disposed={geometries:0,materials:0,instanced:0};
if(r22){
 const g=envGroup();assert.ok(g,'R2.2 creates its group only when chosen');assert.ok(!g.visible,'no visible environment before the sequence starts');
 assert.equal(g.children.length,3);
 for(const m of g.children){assert.ok(m.isInstancedMesh);assert.ok(!m.visible,'no permanently active invisible meshes');m.geometry.addEventListener('dispose',()=>disposed.geometries++);m.addEventListener('dispose',()=>disposed.instanced++);}
 g.children[0].material.addEventListener('dispose',()=>disposed.materials++);
 assert.equal(new Set(g.children.map(m=>m.material)).size,1,'one shared material');
}else assert.equal(envGroup(),undefined,'R2.1 must not create the environment layer');
const envPeak={calls:0,rings:0,shards:0,glints:0,triangles:0};
const trackEnv=()=>{if(!r22)return;const d=lab.diagnostics().env;envPeak.calls=Math.max(envPeak.calls,envGroup().children.filter(m=>m.visible&&m.count>0).length);for(const k of ['rings','shards','glints'])envPeak[k]=Math.max(envPeak[k],d.instances[k]);envPeak.triangles=Math.max(envPeak.triangles,d.triangles);};
const click=action=>buttons.find(b=>b.dataset.combatAction===action).dispatchEvent(new Event('click'));
danceOwned=true;click('play');assert.ok(!lab.owns());assert.equal(releases,0);danceOwned=false;
click('play');assert.ok(lab.owns());
for(let f=0;f<50;f++){if(lab.needsAdvance())lab.advance(1/30);trackEnv();}
assert.equal(lab.diagnostics().state,'BASIC');
click('pause');const t=lab.diagnostics().time;lab.advance(1);assert.equal(lab.diagnostics().time,t);
click('pause');click('camera');assert.equal(lab.diagnostics().camera,'automatic');
canvas.dispatchEvent(new Event('wheel'));assert.equal(lab.diagnostics().camera,'free');
click('restart');assert.equal(lab.diagnostics().state,'INTERRUPTED');
for(let f=0;f<25;f++)if(lab.needsAdvance())lab.advance(1/30);
assert.equal(lab.diagnostics().cycle,2);
for(let f=0;f<(version==='r2'?260:180);f++)if(lab.needsAdvance())lab.advance(1/30);
assert.ok(!lab.owns());assert.equal(lab.diagnostics().state,'COMPLETE');
click('play');lab.advance(.5);click('stop');
for(let f=0;f<25;f++)if(lab.needsAdvance())lab.advance(1/30);
assert.ok(!lab.owns());
if(version==='r2'){
 click('play');for(let frame=0;frame<166;frame++)if(lab.needsAdvance())lab.advance(1/30);
 const before=lab.face({}).smileL;assert.ok(before>0);
 click('stop');assert.equal(lab.face({}).smileL,before);
 lab.advance(.3);const after=lab.face({}).smileL;assert.ok(after>0&&after<before);
 while(lab.needsAdvance())lab.advance(1/30);
 click('play');lab.advance(.4);click('restart');click('stop');
 const cycle=lab.diagnostics().cycle;
 for(let frame=0;frame<60;frame++)if(lab.needsAdvance())lab.advance(1/30);
 assert.equal(lab.diagnostics().cycle,cycle);
}
if(r22){
 // full sequence: the environment must appear, stay inside the budget and be gone when the sequence ends
 click('play');for(let f=0;f<270;f++){if(lab.needsAdvance())lab.advance(1/30);trackEnv();}
 assert.ok(envPeak.rings>0&&envPeak.shards>0&&envPeak.glints>0,'every layer is used '+JSON.stringify(envPeak));
 assert.ok(envPeak.calls<=3&&envPeak.triangles<=3000,'environment budget '+JSON.stringify(envPeak));
 assert.ok(!lab.owns());assert.equal(envGroup().visible,false);assert.equal(lab.diagnostics().env.triangles,0);
 // interruption during each effect: stop mid-effect, let the recovery finish, nothing may remain
 for(const at of [1.95,2.3,2.9,3.4,4.5,5.6,6.3]){
  click('play');let guard=0;while(lab.diagnostics().time<at&&guard++<400){if(lab.needsAdvance())lab.advance(1/30);}
  trackEnv();click('stop');
  guard=0;while(lab.needsAdvance()&&guard++<200){lab.advance(1/30);trackEnv();}
  assert.ok(!lab.owns(),'interrupted at '+at);assert.equal(envGroup().visible,false,'environment cleared after interruption at '+at);
  const e=lab.diagnostics().env;assert.equal(e.instances.rings+e.instances.shards+e.instances.glints,0);
 }
 // repeated restarts while effects are alive
 for(let k=0;k<6;k++){click('play');for(let f=0;f<55;f++)if(lab.needsAdvance())lab.advance(1/30);click('restart');for(let f=0;f<40;f++)if(lab.needsAdvance())lab.advance(1/30);}
 click('stop');for(let f=0;f<100;f++)if(lab.needsAdvance())lab.advance(1/30);assert.ok(!lab.owns());
 // pause freezes the layer: same clock, same instances
 click('play');for(let f=0;f<150;f++)if(lab.needsAdvance())lab.advance(1/30);
 click('pause');const frozen=JSON.stringify(lab.diagnostics().env.instances);const m0=envGroup().children[1].instanceMatrix.array.slice(0,16);
 for(let f=0;f<30;f++)lab.advance(1/30);assert.equal(JSON.stringify(lab.diagnostics().env.instances),frozen);assert.deepEqual(Array.from(envGroup().children[1].instanceMatrix.array.slice(0,16)),Array.from(m0));
 click('pause');click('stop');for(let f=0;f<100;f++)if(lab.needsAdvance())lab.advance(1/30);
 await writeFile('docs/hsin-combat-r22/lab-qa.json',JSON.stringify({peak:envPeak,diagnostics:lab.diagnostics()},null,2)+'\n');
}
if(!r22)await writeFile('docs/hsin-combat-'+version+'/lab-qa.json',JSON.stringify(lab.diagnostics(),null,2)+'\n');
lab.dispose();lab.dispose();controller.abort();assert.equal(scene.children.length,1);
if(r22){assert.equal(disposed.geometries,3,'three shared geometries disposed');assert.equal(disposed.materials,1,'shared material disposed');assert.equal(envGroup(),undefined);}assert.equal(orbit.enablePan,false);
globalThis.fetch=originalFetch;
console.log('Combat lab: manual controls, pause, safe restart, takeover, recovery and disposal PASS');
