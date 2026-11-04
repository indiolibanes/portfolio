import {claimBodyOwner} from './animation-ownership.mjs';
/** Reference playback. One action owns every keyed TRS property; no facial writes. */
export const ORIGINAL_IDLE_IDS = ['SK_IDLE_01_ORIGINAL','SK_IDLE_02_ORIGINAL','SK_IDLE_03_ORIGINAL'];
export function findOriginalClip(clips,id,layer='composed') {
 if(!ORIGINAL_IDLE_IDS.includes(id)||!['composed','body','rib'].includes(layer))throw Error('Unknown original idle selection');
 const name=id+({composed:'',body:'_BODY',rib:'_RIB'}[layer]);
 return clips.find(c=>c.name===name)??null;
}
export function createOriginalIdleDirector(T,root,clip,{enter=.5,exit=.5,onEvent=()=>{},mixerFactory=r=>new T.AnimationMixer(r)}={}) {
 if(!Number.isFinite(enter)||!Number.isFinite(exit)||enter<.05||exit<.05)throw Error('Invalid transition timing');
 if(!clip||!Number.isFinite(clip.duration)||clip.duration<=0)throw Error('Original idle unavailable');
 const bindings=clip.tracks.map(t=>t.name);if(new Set(bindings).size!==bindings.length)throw Error('Duplicate property ownership');
 const snapshot=[];root.traverse(o=>{if(o.isBone)snapshot.push({o,p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()});});
 const releaseOwner=claimBodyOwner(root,'original:'+clip.name);let disposed=false;
 let mixer,action;try{mixer=mixerFactory(root);action=mixer.clipAction(clip);}catch(e){releaseOwner();throw e;}action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;
 let phase='idle',paused=false,clock=0,entryClock=0,release=0,weight=0,releaseWeight=0,updates=0,speed=1,pending=null,queued=false;
 const timing=p=>{if(!Number.isFinite(p.enter)||!Number.isFinite(p.exit)||p.enter<.05||p.exit<.05)throw Error('Invalid transition timing');};timing({enter,exit});
 const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 function emit(name){onEvent({type:name,clip:clip.name,clock,phase});}
 function restore(){for(const x of snapshot){x.o.position.copy(x.p);x.o.quaternion.copy(x.q);x.o.scale.copy(x.s);}root.updateMatrixWorld(true);}
 function begin(){if(pending){({enter,exit}=pending);pending=null;}clock=entryClock=release=0;phase='entry';weight=0;action.reset().setEffectiveWeight(0).play();action.paused=true;emit('start');}
 function recover(){if(phase==='idle'||phase==='exit')return;release=0;releaseWeight=weight;phase='exit';action.paused=true;emit('recovery');}
 function finish(){action.stop();weight=0;restore();phase='idle';emit('end');if(queued){queued=false;begin();}}
 return {
 start(){if(disposed)return;if(phase==='idle')begin();else{queued=true;recover();}},
 interrupt(){queued=false;recover();},
 setPaused(v){paused=!!v;},
 setSpeed(v){if(!Number.isFinite(v)||v<.1||v>2)throw Error('Invalid speed');speed=v;},
 configure(p){const next={enter,exit,...pending,...Object.fromEntries(Object.entries(p).filter(([k])=>['enter','exit'].includes(k)))};timing(next);if(phase==='idle')({enter,exit}=next);else pending=next;},
 advance(dt){if(disposed)return;if(!Number.isFinite(dt)||dt<0)throw Error('Invalid dt');if(paused||phase==='idle'||dt===0)return;
  // Entry and recovery are outside source time; speed changes only playback.
  if(phase==='entry'){entryClock=Math.min(enter,entryClock+dt);weight=ease(entryClock/enter);action.setEffectiveWeight(weight);mixer.update(0);updates++;if(entryClock>=enter){phase='run';action.paused=false;emit('execution');}}
  else if(phase==='run'){const step=Math.min(dt*speed,clip.duration-clock);action.paused=false;weight=1;action.setEffectiveWeight(1);mixer.update(step);updates++;clock=Math.min(clip.duration,clock+step);if(clock>=clip.duration-1e-8)recover();}
  else {release=Math.min(exit,release+dt);weight=releaseWeight*(1-ease(release/exit));action.setEffectiveWeight(weight);mixer.update(0);updates++;if(release>=exit)finish();}
 },
 dispose(){if(disposed)return;disposed=true;queued=false;action.stop();mixer.uncacheRoot(root);restore();phase='idle';releaseOwner();},
 get state(){return {phase,paused,clock,entryClock,release,weights:[weight],updates,queued,speed,duration:clip.duration,total:clip.duration,progress:clock/clip.duration,parameters:{enter,exit},pending,clip:clip.name,mode:'REFERENCE_QA',timingOriginal:speed===1,owners:bindings.length,loop:'ONCE'};}
 };
}
/** Admit only local TRS libraries targeting actual bones of the selected model. */
export function validateOriginalLibrary(T,root,result) {
 if(result.json.asset?.extras?.skIdleLibrary!=='2.0-a'||result.json.images?.length||result.json.meshes?.length)throw Error('Selecione uma biblioteca privada de animações F2.0-A, sem malhas ou imagens.');
 const bones=new Set();root.traverse(o=>{if(o.isBone)bones.add(o.name);});
 for(const clip of result.gltf.animations){
  if(!/^SK_IDLE_0[123]_ORIGINAL(?:_BODY|_RIB)?$/.test(clip.name)||!Number.isFinite(clip.duration)||clip.duration<=0||clip.duration>60)throw Error('Identificador ou duração da animação inválido.');
  const seen=new Set();
  for(const t of clip.tracks){const p=T.PropertyBinding.parseTrackName(t.name);if(!bones.has(p.nodeName)||!['position','quaternion','scale'].includes(p.propertyName)||p.objectName||p.propertyIndex!==undefined)throw Error('Canal fora do rig corporal: '+t.name);if(seen.has(t.name)||!t.validate()||![...t.values].every(Number.isFinite))throw Error('Canal inválido ou duplicado: '+t.name);seen.add(t.name);}
 }
 if(!result.gltf.animations.length)throw Error('Biblioteca sem animações.');return result.gltf.animations;
}
