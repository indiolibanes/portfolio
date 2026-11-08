/** User actions against the real lab + GLB; includes async selection races and safe pending restart. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {danceRig} from '../scripts/lib/hsin-dance-rig.mjs';
import {createCombatLab} from '../src/scripts/hsin-combat-lab.mjs';
const r=await danceRig(),{T,model,bones}=r,scene=new T.Scene();scene.add(model);model.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});
const camera=new T.PerspectiveCamera(34,390/640,.03,45);camera.position.set(0,1,3);
const orbit=new T.EventDispatcher();orbit.target=new T.Vector3(0,.86,0);orbit.enablePan=false;
class Button extends EventTarget{constructor(key,value){super();this.dataset={[key]:value};}setAttribute(){}}
const actions=['play','restart','stop','pause','camera'].map(id=>new Button('combatAction',id)),abilities=['basic01','basic02','combo','skill','legacy','formshift'].map(id=>new Button('combatAbility',id));
const status={textContent:''},version={value:'r23'},root={querySelector:s=>s==='[data-combat-version]'?version:s==='[data-combat-status]'?status:null,querySelectorAll:s=>s==='[data-combat-action]'?actions:s==='[data-combat-ability]'?abilities:[]};
const fetch0=globalThis.fetch;globalThis.fetch=async url=>new Response(await readFile('public'+String(url).split('?')[0]));
let bodyBusy=false,danceOwned=false;
const abort=new AbortController(),m=JSON.parse(await readFile('src/data/hsin-combat-r2.json'));
const lab=await createCombatLab({T,root,scene,model,bones,body:{busy:()=>bodyBusy,reset(){},release(){}},dance:()=>({owns:()=>danceOwned}),camera,orbit,canvas:new EventTarget(),signal:abort.signal,invalidate(){},modelHash:m.modelSha256,profileHash:m.profileSha256});
const action=id=>actions.find(b=>b.dataset.combatAction===id).dispatchEvent(new Event('click')),choose=id=>abilities.find(b=>b.dataset.combatAbility===id).dispatchEvent(new Event('click'));
async function settle(){for(let i=0;i<100&&lab.diagnostics().selecting;i++)await new Promise(resolve=>setTimeout(resolve,5));assert.equal(lab.diagnostics().selecting,false);}
function step(dt){lab.advance(dt);const d=lab.diagnostics();if(['basic01','basic02','combo'].includes(d.ability)){assert.equal(d.vfx.core.visible,false);assert.ok(!d.trace.filter(x=>x.cycle===d.cycle).some(x=>['charge','ring'].includes(x.event)));}assert.ok(d.env.budget.maxDrawCalls<=3);}
// Selection must not restore another actor's bones, even if a fetch completes while it owns them.
const sentinel=r.by.get('ORG-Bip001HandR'),original=sentinel.quaternion.clone();
for(const owner of ['body','dance']){
 sentinel.quaternion.setFromAxisAngle(new T.Vector3(1,0,0),.12);const expected=sentinel.quaternion.clone();
 if(owner==='body')bodyBusy=true;else danceOwned=true;
 choose('basic02');await settle();assert.deepEqual(sentinel.quaternion.toArray(),expected.toArray(),'selection respects '+owner+' ownership');assert.ok(!lab.owns());
 bodyBusy=danceOwned=false;sentinel.quaternion.copy(original);sentinel.updateMatrix();
}
for(const id of ['basic01','basic02','combo','skill','legacy']){
 choose(id);await settle();assert.equal(lab.diagnostics().ability,id);assert.ok(lab.owns());
 for(let i=0;i<15;i++)step(1/30);action('pause');const t=lab.diagnostics().time;step(.5);assert.equal(lab.diagnostics().time,t);action('pause');
 action('restart');for(let i=0;i<30;i++)step(1/30);await settle();assert.equal(lab.diagnostics().ability,id);assert.ok(lab.owns());
 action('stop');for(let i=0;i<25;i++)step(1/30);assert.ok(!lab.owns());assert.ok(lab.diagnostics().atBaseline);
}
choose('skill');await settle();for(let i=0;i<70;i++)step(1/30);assert.ok(lab.diagnostics().vfx.core.visible);choose('basic02');for(let i=0;i<25;i++)step(1/30);await settle();assert.equal(lab.diagnostics().ability,'basic02');assert.equal(lab.diagnostics().vfx.core.visible,false);
choose('combo');choose('basic01');for(let i=0;i<25;i++)step(1/30);await settle();assert.equal(lab.diagnostics().ability,'basic01','latest queued action wins');
action('stop');for(let i=0;i<25;i++)step(1/30);const prior=lab.diagnostics().ability;choose('formshift');await settle();assert.equal(lab.diagnostics().ability,prior);assert.ok(!lab.owns());
// One stable pool across ten ability changes, not ten newly allocated VFX systems.
const before=new Set();scene.traverse(o=>{if(o.geometry)before.add(o.geometry);});for(let cycle=0;cycle<10;cycle++){choose(cycle%2?'basic01':'basic02');await settle();for(let i=0;i<130;i++)step(1/30);}const after=new Set();scene.traverse(o=>{if(o.geometry)after.add(o.geometry);});assert.deepEqual(after,before);
// Latest selection wins in the interval between recovery completion and the next RAF.
action('stop');for(let i=0;i<25;i++)step(1/30);choose('basic01');await settle();choose('basic02');step(.7);assert.ok(!lab.owns());choose('combo');step(1/60);await settle();assert.equal(lab.diagnostics().ability,'combo');
action('stop');for(let i=0;i<25;i++)step(1/30);
choose('skill');action('stop');await settle();assert.ok(!lab.owns(),'stop cancels in-flight read');
choose('combo');lab.dispose();await settle();assert.equal(scene.children.length,1);abort.abort();globalThis.fetch=fetch0;
console.log('R2.3 lab controls / skill isolation / switching / 10 cycles / async cancellation / disposal PASS');
