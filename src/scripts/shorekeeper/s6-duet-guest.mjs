/**
 * S6-D duo guest (private preview): one Hsin scene/renderer/RAF, independent
 * body owner per character. Never publishes a Shorekeeper GLB or fetches a
 * non-Access origin. Source posture/fidelity not certified: G7 stays NO_GO.
 */
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {LoadingManager} from 'three';
import {inspectPrivateManifest,getPrivateFile} from './remote-private-model.mjs';
import {SHOREKEEPER_CANONICAL,readPrivateModel} from './private-model-cache.mjs';
import {assertSelfContainedGLB,disposeObject} from './local-model.mjs';
import {validateCombatLibrary} from './combat-director.mjs';
import {createOriginalIdleDirector,ORIGINAL_IDLE_IDS} from './original-idle-director.mjs';
import {createInspection} from './inspection.mjs';
import {createGentleFace} from './gentle-acting.mjs';
import {APPROVED_MANUAL_RECIPES} from './approved-manual-gallery.mjs';
import {S6_AUTO_FACE_ROSTER} from './s6-autonomy.mjs';
import {createAnatomicalFaceDirector} from './anatomical-face.mjs';
import {createMouthR5} from './mouth-r5.mjs';
import {R6_G113_CANDIDATES} from './r6-g113-bridge.mjs';

const REQUIRED=Object.freeze(['basic','advanced','burst']);
export const S6_DUO_STATUS=Object.freeze({
  NO_ACCESS:'AUTHENTICATION_REQUIRED',MISSING:'PRIVATE_ASSETS_MISSING',
  INCOMPLETE:'PRIVATE_LIBRARY_INCOMPLETE',READY:'DUO_PRIVATE_PREVIEW_G7_PENDING',
  FAILED:'PRIVATE_GUEST_UNAVAILABLE'
});
export function s6DuoModelRequirements(manifest,hash){
 return !!manifest&&manifest.schema==='shorekeeper-private-assets/v1'&&manifest.model?.sha256===hash&&manifest.model?.bytes===SHOREKEEPER_CANONICAL.bytes;
}
export function s6DuoRequirements(manifest,hash){
  if(!manifest||manifest.schema!=='shorekeeper-private-assets/v1')return false;
  if(manifest.model?.sha256!==hash||manifest.model?.bytes!==SHOREKEEPER_CANONICAL.bytes)return false;
  return REQUIRED.every(id=>manifest.libraries?.some(x=>x.id===id))&&new Set(manifest.libraries.map(x=>x.id)).size===manifest.libraries.length;
}
export function nextDuoIdle(index,count=ORIGINAL_IDLE_IDS.length) {
  if(!Number.isInteger(index)||!(count>0))throw Error('Invalid duo idle index');
  return ((index+1)%count+count)%count;
}
function aborted(signal){return !!signal?.aborted;}
export async function loadS6DuetGuest(T,scene,{signal,preferredHeight=1.55,experimentalR6=false}={}){
  const inspected=await inspectPrivateManifest({signal});
  if(inspected.state!=='ready')return {ready:false,status:inspected.state==='denied'?S6_DUO_STATUS.NO_ACCESS:S6_DUO_STATUS.MISSING,
    advance(){},dispose(){}};
  const manifest=inspected.manifest;
  if(!(experimentalR6?s6DuoModelRequirements(manifest,SHOREKEEPER_CANONICAL.sha256):s6DuoRequirements(manifest,SHOREKEEPER_CANONICAL.sha256)))return {ready:false,status:S6_DUO_STATUS.INCOMPLETE,advance(){},dispose(){}};
  if(aborted(signal))return null;
  const manager=new LoadingManager();manager.setURLModifier(url=>{
    if(!/^(?:blob:|data:)/i.test(url))throw Error('External private GLB resource blocked');
    return url;
  });
  const parser=new GLTFLoader(manager),scenes=[],loaded=[];
  let model=null,group=null,director=null,face=null,mouthCorrection=null,disposed=false;
  const ownedScene=s=>{scenes.push(s);return s;};
  try{
    // Authenticated R2 endpoint verifies HTTP size, header SHA-256, byte length
    // and full SHA-256 before any asset reaches GLTFLoader.
    async function parseFile(entry,kind){
      // Authorization always precedes any private cache reuse; never use a stale local copy on 401/403.
      let file=null;
      if(kind==='model'&&experimentalR6){
        const cached=await readPrivateModel().catch(()=>null);
        if(cached?.sha256===entry.sha256&&cached.file?.size===entry.bytes){
          const buffer=await cached.file.arrayBuffer();
          const digest=await crypto.subtle.digest('SHA-256',buffer);
          const hex=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
          if(hex===entry.sha256)file=cached.file;
        }
      }
      if(!file)file=await getPrivateFile(entry,{kind,signal});
      if(aborted(signal))throw new DOMException('Cancelled','AbortError');
      const buffer=await file.arrayBuffer(),json=assertSelfContainedGLB(buffer);
      const gltf=await parser.parseAsync(buffer,'');
      ownedScene(gltf.scene);
      return {gltf,json};
    }
    const base=await parseFile(manifest.model,'model');
    if(aborted(signal))throw new DOMException('Cancelled','AbortError');
    model=base.gltf.scene;
    loaded.push(...(base.gltf.animations??[]));
    for(const id of (experimentalR6?[]:REQUIRED)){
      const entry=manifest.libraries.find(x=>x.id===id);
      const data=await parseFile(entry,'library');
      const clips=validateCombatLibrary(T,model,data);
      loaded.push(...clips);
    }
    const names=new Set(loaded.map(c=>c.name));
    if(loaded.some(c=>!c?.name)||names.size!==loaded.length||!ORIGINAL_IDLE_IDS.every(id=>names.has(id)))throw Error('Private source clip inventory incomplete');
    if(aborted(signal))throw new DOMException('Cancelled','AbortError');
    model.userData.skClips=loaded;
    const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());
    if(bounds.isEmpty()||!Number.isFinite(size.y)||size.y<=0)throw Error('Invalid guest geometry bounds');
    const scale=preferredHeight/size.y;
    if(!Number.isFinite(scale)||scale<=0||scale>1000)throw Error('Guest scale out of bounds');
    group=new T.Group();group.name='S6 private Shorekeeper guest';
    model.scale.multiplyScalar(scale);
    model.position.y-=bounds.min.y*scale;
    group.position.set(1.7,0,0); // Initial separation; host performs dynamic silhouette-envelope fitting.
    group.add(model);
    if(experimentalR6)mouthCorrection=createMouthR5(model); // Reversible; preserves F2.0-A source bytes and morph dictionaries.
    const inspection=createInspection(model);
    face=experimentalR6?createAnatomicalFaceDirector(inspection):createGentleFace(inspection,{qaRecipes:APPROVED_MANUAL_RECIPES});face.reset();
    scene.add(group);
    for(const s of scenes)if(s!==model)disposeObject(s);
    scenes.length=0;
    let active=-1,restSeconds=0,faceSeconds=9,faceIndex=0,playing=true;
    let musicState='NO_MUSIC',musicProvider='none',musicEpoch=null;
    function switchIdle(){
      director?.dispose();director=null;
      active=nextDuoIdle(active);
      director=createOriginalIdleDirector(T,model,loaded.find(c=>c.name===ORIGINAL_IDLE_IDS[active]),
        {enter:.45,exit:.6});
      director.start();
    }
    switchIdle();
    function advance(dt,{paused=false,reducedMotion=false,music=null}={}){
      // Playback recognition only. Do not claim choreography/sync or autoplay an unapproved facial pose.
      musicState=music?.playbackConfirmed===true&&music?.status==='playing'
        ?'PLAYING_CONFIRMED':music?.status==='paused'?'PAUSED':music?.status==='buffering'?'BUFFERING':'NO_MUSIC';
      musicProvider=music?.provider??'none';musicEpoch=music?.epoch??null;
      if(disposed||paused||reducedMotion||!(dt>0)||!playing)return;
      const elapsed=Math.min(.09,dt);
      director?.advance(elapsed);
      if(director?.state.phase==='idle'){
        restSeconds-=elapsed;
        if(restSeconds<=0){restSeconds=2.5;switchIdle();}
      }
      face?.advance(elapsed,{writeFacial:true});
      faceSeconds-=elapsed;
      if(!experimentalR6&&faceSeconds<=0&&!face?.state.busy) {
        for(let tries=0;tries<S6_AUTO_FACE_ROSTER.length;tries++){
          const row=S6_AUTO_FACE_ROSTER[faceIndex++%S6_AUTO_FACE_ROSTER.length];
          if(face.qaSupport(row.id).available && face.triggerQA(row.id))break;
        }
        faceSeconds=18;
      }
      model.updateMatrixWorld(true);
    }
    function dispose(){
      if(disposed)return;
      disposed=true;director?.dispose();face?.dispose();mouthCorrection?.dispose();scene.remove(group);disposeObject(model);
    }
    return {ready:true,status:S6_DUO_STATUS.READY,group,advance,dispose,
      playR6Expression(id){if(!experimentalR6||disposed||!R6_G113_CANDIDATES.some(x=>x.id===id))return false;face.setFrozen(false);return face.playCandidate(id);},
      neutralR6(){if(!experimentalR6||disposed)return false;face.setFrozen(false);return face.reset();},
      blinkR6(){if(!experimentalR6||disposed)return false;return face.trigger('blink');},
      get state(){return {source:'AUTHENTICATED_R2_PRIVATE',librariesLoaded:experimentalR6?'MODEL_ONLY_IDLE_FACIAL':'FULL_COMBAT',idle:ORIGINAL_IDLE_IDS[active],face:face?.state.expression,
        G7:'NO_GO',R6:experimentalR6?'MANUAL_R5_CANDIDATE':'DISABLED',music:{state:musicState,provider:musicProvider,epoch:musicEpoch,choreography:'NOT_AUTHORED'},visualQA:'PENDING',duo:'ONE_SCENE_SINGLE_RAF'};}};
  }catch(error){
    director?.dispose();face?.dispose();mouthCorrection?.dispose();if(group)scene.remove(group);
    for(const s of new Set([...scenes,...(model?[model]:[])]))disposeObject(s);
    if(error?.name==='AbortError')return null;
    return {ready:false,status:S6_DUO_STATUS.FAILED,reason:'ASSET_OR_RIG_VALIDATION_FAILED',advance(){},dispose(){}};
  }
}
