/** Real-GLB support checks between samples, interrupted steps, and a repeatable 600-second session. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {danceRig} from '../scripts/lib/hsin-dance-rig.mjs';
import {decodeDanceData} from '../src/scripts/hsin-dance-data.mjs';
import {createDancePose} from '../src/scripts/hsin-dance-pose.mjs';
import {createDanceDirector} from '../src/scripts/hsin-dance-director.mjs';
import {createMusicState} from '../src/scripts/hsin-music-state.mjs';
import {createMusicTransport} from '../src/scripts/hsin-music-transport.mjs';
const manifest=JSON.parse(await readFile('src/data/hsin-dance.json')),raw=await readFile('public'+manifest.url),data=decodeDanceData(JSON.parse(raw));
assert.equal(createHash('sha256').update(raw).digest('hex'),manifest.sha256);assert.equal(raw.length,manifest.bytes);assert.equal(Object.keys(data.phrases).length,8);assert.equal(data.names.length,38);
const r=await danceRig(),{T}=r,pose=createDancePose({THREE:T,data,bones:r.bones,model:r.model});assert.ok(pose.ready&&pose.lowerBody);
r.model.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false;});
const lateral=r.by.get('ORG-Bip001ThighL').getWorldPosition(new T.Vector3()).sub(r.by.get('ORG-Bip001ThighR').getWorldPosition(new T.Vector3())).setY(0).normalize();
const baseline={};for(const side of ['L','R'])baseline[side]=r.by.get('ORG-Bip001Foot'+side).getWorldPosition(new T.Vector3());
const soles=[];for(const mesh of r.meshes){mesh.skeleton.update();const g=mesh.geometry;for(let i=0;i<g.attributes.position.count;i++){
 let side=null;for(const s of ['L','R']){let weight=0;for(let k=0;k<4;k++){const n=mesh.skeleton.bones[g.attributes.skinIndex.getComponent(i,k)].name;if(n==='ORG-Bip001Foot'+s||n==='ORG-Bip001Toe0'+s||n.startsWith('ORG-Bone_Toe')&&n.endsWith('_'+s))weight+=g.attributes.skinWeight.getComponent(i,k);}if(weight>.999)side=s;}
 if(side){const p=mesh.getVertexPosition(i,new T.Vector3()).applyMatrix4(mesh.matrixWorld);if(p.y<.005&&i%4===0)soles.push({mesh,i,side,p});}
}}
assert.ok(soles.length>100,'actual sole surfaces cannot be an empty proxy');
function supportOffset(name,side,t){if(name!=='lunar-waltz')return 0;if(side==='L'){if(t<=.08||t>=.75)return 0;if(t>=.26&&t<=.57)return .065;}else{if(t<=.34||t>=.98)return 0;if(t>=.52&&t<=.80)return .09;}return null;}
const result={frames:0,soleVertices:soles.length,maxSupportDrift:0,minSoleY:Infinity,maxOrgDefGap:0,maxStepDegrees:0,seconds:600,publicVersion:'2.0.1',visual:'VISUAL_QA_PENDING',footToleranceMeters:.0005};
const v=new T.Vector3();
for(const [name,p]of Object.entries(data.phrases))for(let sample=0;sample<=240;sample++){
 const t=sample/240;pose.apply(name,t,.37,.72);r.model.updateMatrixWorld(true);for(const mesh of r.meshes)mesh.skeleton.update();result.frames++;
 for(const s of soles){s.mesh.getVertexPosition(s.i,v).applyMatrix4(s.mesh.matrixWorld);result.minSoleY=Math.min(result.minSoleY,v.y);const offset=supportOffset(name,s.side,t);if(offset!==null)result.maxSupportDrift=Math.max(result.maxSupportDrift,v.distanceTo(s.p.clone().addScaledVector(lateral,offset)));}
 for(const side of ['L','R'])for(const part of ['Thigh','Calf','Foot','Toe0'])result.maxOrgDefGap=Math.max(result.maxOrgDefGap,r.by.get('ORG-Bip001'+part+side).getWorldPosition(v).distanceTo(r.by.get('DEF-Bip001'+part+side).getWorldPosition(new T.Vector3())));
}
assert.ok(result.maxSupportDrift<.0005,'support surface slip below 0.5 mm including quantization/interpolation: '+result.maxSupportDrift);assert.ok(result.minSoleY>-.0005,'no visible floor penetration: '+result.minSoleY);assert.ok(result.maxOrgDefGap<.0002);
pose.restore();
function runSession(){
let now=0,position=0,token;const music=createMusicState({now:()=>now}),transport=createMusicTransport({now:()=>now});
let writes=0,director;const idle={advance(){assert.ok(!director.owns());writes++;},busy:()=>false,release(){}};
director=createDanceDirector({idle,pose,music,transport,seed:33});const seen=new Set(),rawApply=pose.apply;pose.apply=(...args)=>{seen.add(args[0]);return rawApply(...args);};const trace=[],q=new T.Quaternion(),previous=data.names.map(n=>r.by.get(n).quaternion.clone());
function report(status){music.observe(token,{status,trackId:'fixture',positionSeconds:position,durationSeconds:1000});}
for(let i=0;i<18000;i++){
 now=i*1000/30;
 if(i===30)token=music.select('youtube');if(i===90)report('playing');
 if(i===2700||i===7200)report('paused');if(i===3000||i===7500)report('playing');
 if(i===5400)report('buffering');if(i===5520)report('playing');if(i===8100){position+=40;report('playing');}
 if(i===10000){token=music.select('spotify');report('playing');}if(i===10600){token=music.select('youtube');report('playing');}
 if(i===16000)report('ended');if(i===16600)music.select('none');
 if(music.sample().status==='playing'){position+=1/30;if(i%15===0)report('playing');}
 const frozen=i>=12000&&i<12060;if(!frozen)director.advance(1/30);const state=director.diagnostics();if(state.phrase)seen.add(state.phrase);if(i%30===0)trace.push([state.state,state.phrase,state.episodes]);
 if(i<90)assert.equal(state.state,'CONTEMPLATIVE_IDLE');if(i>10200&&i<10600)assert.equal(state.state,'CONTEMPLATIVE_IDLE','Spotify only listens even with a mocked playing event');
 for(let k=0;k<data.names.length;k++){q.copy(r.by.get(data.names[k]).quaternion).normalize();result.maxStepDegrees=Math.max(result.maxStepDegrees,q.angleTo(previous[k])*180/Math.PI);if(frozen)assert.deepEqual(q.toArray(),previous[k].toArray());previous[k].copy(q);}
}
assert.equal(seen.size,8);assert.ok(writes>0);assert.ok(result.maxStepDegrees<16,'no angular teleport during landing or handoff');director.dispose();assert.ok(pose.atReference());data.names.forEach((n,i)=>assert.deepEqual(r.by.get(n).quaternion.toArray(),data.rest.slice(i*4,i*4+4)));
const root=r.model.getObjectByName(data.positionNames[0]);assert.deepEqual(root.position.toArray(),data.positionRest);
pose.apply=rawApply;return {trace,phrases:[...seen]};
}
const first=runSession(),second=runSession();assert.deepEqual(first,second,'two seeded R2 sessions reproduce exactly');const {trace}=first,seen=new Set(first.phrases);result.sessions=2;
// Pause during the ramp must not jump from the preparation gain to a full-amplitude pose.
for(const status of ['paused','buffering'])for(const frames of [4,8,12,20]){
 pose.restore();let tick=0;const m=createMusicState({now:()=>tick}),token=m.select('youtube'),transport=createMusicTransport({now:()=>tick});m.observe(token,{status:'playing',positionSeconds:0,trackId:'fixture'});
 const d=createDanceDirector({idle:{advance(){},release(){},busy:()=>false},pose,music:m,transport});
 for(let i=0;i<frames;i++){tick+=1000/30;d.advance(1/30);}assert.equal(d.diagnostics().state,'DANCE_PREPARATION');
 const before=data.names.map(n=>r.by.get(n).quaternion.clone()),p0=r.model.getObjectByName(data.positionNames[0]).position.clone();
 m.observe(token,{status,positionSeconds:tick/1000,trackId:'fixture'});d.advance(0);d.advance(0);
 data.names.forEach((n,i)=>assert.ok(before[i].angleTo(r.by.get(n).quaternion)<1e-7,'zero-time preparation interruption cannot change pose gain'));
 assert.ok(p0.distanceTo(r.model.getObjectByName(data.positionNames[0]).position)<1e-10);for(let i=0;i<100;i++)d.advance(1/30);d.dispose();assert.ok(pose.atReference());m.dispose();
}
// Every sampled interruption completes a baked support path and hands back exactly at the reference.
for(const interruption of [.11,.21,.37,.47,.61,.72,.85,.93]){
 pose.restore();let now=0,clockPhase=0;const m=createMusicState({now:()=>now}),token=m.select('youtube');m.observe(token,{status:'playing',trackId:'synthetic',positionSeconds:0});
 const clock={playing:true,mode:'mapped',revision:1,phase:0,region:0,phraseId:'lunar-waltz',phraseSeconds:5.6,intensity:.5},transport={advance(){clock.phase=clockPhase;return clock;},diagnostics:()=>clock};
 const d=createDanceDirector({idle:{advance(){},release(){},busy:()=>false},pose,music:m,transport});
 for(let i=0;i<26;i++){now+=1000/30;d.advance(1/30);}clockPhase=interruption;d.advance(0);assert.equal(d.diagnostics().phrase,'lunar-waltz');
 m.observe(token,{status:'paused',trackId:'synthetic',positionSeconds:1});d.advance(0);
 for(let i=0;i<90;i++){d.advance(1/30);r.model.updateMatrixWorld(true);for(const side of ['L','R'])assert.ok(r.by.get('ORG-Bip001Foot'+side).getWorldPosition(v).y>=baseline[side].y-.0005,'director pause safely lands each lifted foot');}
 d.dispose();m.dispose();assert.ok(pose.atReference());
}
let allocations=0;class Counted extends T.Quaternion{constructor(...a){super(...a);allocations++;}}const counted=createDancePose({THREE:{...T,Quaternion:Counted},data,bones:r.bones,model:r.model}),initial=allocations;for(let i=0;i<600;i++)counted.apply('lunar-waltz',i/600);assert.equal(allocations,initial);counted.restore();
result.phrases=[...seen];result.traceHash=createHash('sha256').update(JSON.stringify(trace)).digest('hex');result.runtimeBufferBytes=pose.bufferBytes();console.log('Lunar Dance R2 PASS',JSON.stringify(result));if(process.env.HSIN_DANCE_REPORT)await writeFile('docs/hsin-dance-r2-qa.json',JSON.stringify(result,null,2)+'\n');
