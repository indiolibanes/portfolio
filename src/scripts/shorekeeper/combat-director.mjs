import {createOriginalIdleDirector} from './original-idle-director.mjs';

export const ORIGINAL_ATTACK_IDS = Object.freeze([1,2,3,4].map(n=>`SK_ATTACK_0${n}_ORIGINAL`));
/** Advanced moves use original ActorX sources; they are not visually approved. */
export const ADVANCED_COMBAT_IDS = Object.freeze(['SK_ATTACK_L02_ORIGINAL','SK_SKILL_01_ORIGINAL','SK_SKILL_QTE_01_ORIGINAL','SK_AIR_SKILL_01_ORIGINAL']);
export const COMBAT_CLIP_IDS = Object.freeze([...ORIGINAL_ATTACK_IDS,...ADVANCED_COMBAT_IDS]);

/** Accept only self-contained animation-only libraries with body TRS tracks. */
export function validateCombatLibrary(T, root, result) {
 const json=result.json;
 if(json.asset?.extras?.skCombatLibrary!=='2.1-c'||json.images?.length||json.meshes?.length||json.skins?.length) throw Error('Biblioteca de combate inválida.');
 const bones=new Set();root.traverse(o=>{if(o.isBone)bones.add(o.name);});
 if(!result.gltf.animations.length) throw Error('Biblioteca sem animações.');
 for(const clip of result.gltf.animations){
  const clipId=clip.name.replace(/_(?:BODY|RIB)$/,'');
  if(!COMBAT_CLIP_IDS.includes(clipId)||!Number.isFinite(clip.duration)||clip.duration<=0||clip.duration>60) throw Error('Identificador ou duração inválidos.');
  const seen=new Set();
  for(const track of clip.tracks){
   const p=T.PropertyBinding.parseTrackName(track.name);
   if(!bones.has(p.nodeName)||!['position','quaternion','scale'].includes(p.propertyName)||p.objectName||p.propertyIndex!==undefined||seen.has(track.name)||!track.validate()||!Array.from(track.values).every(Number.isFinite)) throw Error('Canal corporal inválido ou duplicado: '+track.name);
   seen.add(track.name);
  }
 }
 return result.gltf.animations;
}

/** Central-loop driven; it never runs two actions or writes facial morphs. */
export function createCombatDirector(T,root,clips,options={}){
 let current=null,paused=false;
 const disposeCurrent=()=>{current?.dispose();current=null;};
 return {
  playAttack(id){
   if(!COMBAT_CLIP_IDS.includes(id)) throw Error('Ataque desconhecido.');
   if(current&&current.state.phase!=='idle') return false;
   const clip=clips.find(c=>c.name===id); if(!clip) return false;
   if(clip.tracks.some(t=>!/^.*\.(?:position|quaternion|scale)$/.test(t.name))) throw Error('Canal não corporal.');
   disposeCurrent();current=createOriginalIdleDirector(T,root,clip,options);current.setPaused(paused);current.start();return true;
  },
  pause(){paused=true;current?.setPaused(true);},
  resume(){paused=false;current?.setPaused(false);},
  interrupt(){current?.interrupt();},
  recover(){current?.interrupt();},
  advance(dt){current?.advance(dt);},
  getState(){return {paused,animation:current?.state??null};},
  dispose(){disposeCurrent();}
 };
}
