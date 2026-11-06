/**
 * S6-D duo guest (private preview): one Hsin scene/renderer/RAF, independent
 * body owner per character. Never publishes a Shorekeeper GLB or fetches a
 * non-Access origin. Source posture/fidelity not certified: G7 stays NO_GO.
 */
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {LoadingManager} from 'three';
import {inspectPrivateManifest,getPrivateFile} from './remote-private-model.mjs';
import {SHOREKEEPER_CANONICAL} from './private-model-cache.mjs';
import {assertSelfContainedGLB,disposeObject} from './local-model.mjs';
import {validateCombatLibrary} from './combat-director.mjs';
import {createOriginalIdleDirector,ORIGINAL_IDLE_IDS} from './original-idle-director.mjs';
import {createInspection} from './inspection.mjs';
import {createAnatomicalFaceDirector} from './anatomical-face.mjs';
import {APPROVED_MANUAL_RECIPES} from './approved-manual-gallery.mjs';
import {S6_EXPRESSION_FAMILIES,playS6Expression} from './s6-expression-catalog.mjs';
import {createS6DuoChoreographer,S6_DUO_MODES} from './s6-duo-choreography.mjs';
import {R61_SOURCE_IDS} from './r61-plan.mjs';
import {summarizePrivateCombat} from './private-library-coverage.mjs';
import {createR62Integration} from './r62-integration.mjs';
import {ShorekeeperVfxR5Director} from './vfx-r5.mjs';

const REQUIRED=Object.freeze(['basic','advanced','burst']);
export const S6_DUO_STATUS=Object.freeze({
  NO_ACCESS:'AUTHENTICATION_REQUIRED',MISSING:'PRIVATE_ASSETS_MISSING',
  INCOMPLETE:'PRIVATE_LIBRARY_INCOMPLETE',READY:'DUO_PRIVATE_PREVIEW_G7_PENDING',
  FAILED:'PRIVATE_GUEST_UNAVAILABLE'
});
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
export async function loadS6DuetGuest(T,scene,{signal,stage=null,preferredHeight=1.55}={}){
  const inspected=await inspectPrivateManifest({signal});
  if(inspected.state!=='ready')return {ready:false,status:inspected.state==='denied'?S6_DUO_STATUS.NO_ACCESS:S6_DUO_STATUS.MISSING,
    advance(){},dispose(){}};
  const manifest=inspected.manifest;
  if(!s6DuoRequirements(manifest,SHOREKEEPER_CANONICAL.sha256))return {ready:false,status:S6_DUO_STATUS.INCOMPLETE,advance(){},dispose(){}};
  if(aborted(signal))return null;
  const manager=new LoadingManager();manager.setURLModifier(url=>{
    if(!/^(?:blob:|data:)/i.test(url))throw Error('External private GLB resource blocked');
    return url;
  });
  const parser=new GLTFLoader(manager),scenes=[],loaded=[];
  let model=null,group=null,director=null,face=null,combat=null,vfx=null,choreographer=null,disposed=false;
  const ownedScene=s=>{scenes.push(s);return s;};
  try{
    // Authenticated R2 endpoint verifies HTTP size, header SHA-256, byte length
    // and full SHA-256 before any asset reaches GLTFLoader.
    async function parseFile(entry,kind){
      const file=await getPrivateFile(entry,{kind,signal});
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
    for(const id of REQUIRED){
      const entry=manifest.libraries.find(x=>x.id===id);
      const data=await parseFile(entry,'library');
      const clips=validateCombatLibrary(T,model,data);
      loaded.push(...clips);
    }
    const names=new Set(loaded.map(c=>c.name));
    if(loaded.some(c=>!c?.name)||names.size!==loaded.length||!ORIGINAL_IDLE_IDS.every(id=>names.has(id))||!R61_SOURCE_IDS.every(id=>names.has(id))||!summarizePrivateCombat(manifest,loaded).allLoaded)throw Error('Private source clip inventory incomplete');
    if(aborted(signal))throw new DOMException('Cancelled','AbortError');
    model.userData.skClips=loaded;
    const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3());
    if(bounds.isEmpty()||!Number.isFinite(size.y)||size.y<=0)throw Error('Invalid guest geometry bounds');
    const scale=preferredHeight/size.y;
    if(!Number.isFinite(scale)||scale<=0||scale>1000)throw Error('Guest scale out of bounds');
    group=new T.Group();group.name='S6 private Shorekeeper guest';
    model.scale.multiplyScalar(scale);
    model.position.y-=bounds.min.y*scale;
    group.position.set(.85,0,0);
    group.add(model);
    const inspection=createInspection(model);
    // R6 is the newest anatomical/acting engine. Human-approved V2/R3
    // appearance baselines remain available, with no added facial writer.
    face=createAnatomicalFaceDirector(inspection,{qaRecipes:APPROVED_MANUAL_RECIPES});
    face.reset();
    scene.add(group);
    for(const source of scenes)if(source!==model)disposeObject(source);
    scenes.length=0;
    let idleIndex=-1,quietSeconds=0,faceSeconds=6,blinkSeconds=5.5,
      musicSeconds=0,rotateClock=0,combatCooldown=0,musicBlocked=false,facialIndex=0;
    const updateFace=dt=>{
      face?.advance(dt,{writeFacial:true});
      blinkSeconds-=dt;faceSeconds-=dt;
      if(blinkSeconds<=0){face?.trigger('blink');blinkSeconds=5.4;}
      if(faceSeconds<=0&&!face?.state.busy){
        // Strict semantic deduplication: one latest active candidate OR one
        // approved baseline per family, never both in the same interval.
        for(let n=0;n<S6_EXPRESSION_FAMILIES.length;n++){
          const row=S6_EXPRESSION_FAMILIES[facialIndex++%S6_EXPRESSION_FAMILIES.length];
          if(playS6Expression(face,row).ok)break;
        }
        faceSeconds=15.5;
      }
    };
    function enterIdle(){
      if(disposed)return;
      if(combat){combat.dispose();combat=null;}
      director?.dispose();director=null;
      face?.reset();
      idleIndex=nextDuoIdle(idleIndex);
      const clip=loaded.find(c=>c.name===ORIGINAL_IDLE_IDS[idleIndex]);
      if(!clip)throw Error('Authenticated original idle not found');
      director=createOriginalIdleDirector(T,model,clip,{enter:.45,exit:.6});
      director.start();quietSeconds=3.5;
    }
    function releaseCombat(){
      if(!combat)return;
      combat.dispose();combat=null;
      vfx?.setState('OFF');
      face?.reset();
      enterIdle();
    }
    const availableMusicStage=()=>stage?.scene===scene&&stage?.camera&&stage?.orbit&&typeof stage.restoreCamera==='function'&&stage?.renderer;
    function beginCombat(){
      if(disposed||musicBlocked||!availableMusicStage())return false;
      if(combat)return true;
      try{
        director?.dispose();director=null;
        face?.reset();
        // Allocate G11.3 only on confirmed music; this never changes Hsin
        // bones, renderer, controls or RAF. Camera remains wide for both.
        if(!vfx){
          vfx=new ShorekeeperVfxR5Director(scene,{
            camera:stage.camera,mobile:!!stage.mobile,reducedMotion:false
          });
          vfx.bindModel(model);vfx.setState('AMBIENT');
        }
        combat=createR62Integration(T,model,loaded,stage,{
          getVfx:()=>vfx,camera:false,bodyStability:'off',
          reducedMotion:()=>false,
          onEvent:e=>face?.onAnimationEvent(e),
        });
        combat.start();combatCooldown=0;return true;
      }catch{
        combat?.dispose();combat=null;
        vfx?.dispose();vfx=null;
        musicBlocked=true;
        // No silent substituted animations or unapproved source tracks.
        enterIdle();return false;
      }
    }
    enterIdle();
    function settleQuiet(dt){
      // If music ends mid-sequence, allow the real S5 source recovery to
      // finish; never instantaneously overwrite its single body mixer.
      if(combat){
        combat.advance(dt);
        if(combat.state.phase==='idle'&&!combat.state.camera?.returning)releaseCombat();
        return;
      }
      director?.advance(dt);
      if(director?.state.phase==='idle'){
        quietSeconds-=dt;
        if(quietSeconds<=0)enterIdle();
      }
      updateFace(dt);
    }
    function settleMusic(dt){
      rotateClock+=dt;
      // Bounded, frontal stage yaw; no 180° backside, no Root track edits.
      group.rotation.y=.12+.14*Math.sin(rotateClock*.31);
      if(combat){
        combat.advance(dt);
        if(combat.state.phase==='idle'&&!combat.state.camera?.returning){
          releaseCombat();combatCooldown=12;
        }
      }else{
        director?.advance(dt);
        combatCooldown-=dt;
        if(combatCooldown<=0)beginCombat();
      }
      vfx?.update(dt,Math.min(2,stage?.renderer?.getPixelRatio?.()??1));
    }
    choreographer=createS6DuoChoreographer({
      onEnterMusic:()=>!musicBlocked&&!!availableMusicStage(),
      onEnterQuiet:()=>{
        if(combat)combat.interrupt();
        else vfx?.setState('OFF');
        face?.reset();
      },
      quietTick:dt=>{
        if(Math.abs(group.rotation.y)>1e-4)group.rotation.y*=Math.max(0,1-dt*2);
        settleQuiet(dt);
        if(!combat&&vfx){vfx.dispose();vfx=null;}
        else vfx?.update(dt,Math.min(2,stage?.renderer?.getPixelRatio?.()??1));
      },
      musicTick:settleMusic,
    });
    function advance(dt,{paused=false,reducedMotion=false,music=null}={}){
      if(disposed||!(dt>0))return;
      const elapsed=Math.min(.09,dt);
      choreographer.advance(elapsed,{music,paused,reducedMotion});
      model.updateMatrixWorld(true);
    }
    function dispose(){
      if(disposed)return;
      disposed=true;
      choreographer?.dispose();
      combat?.dispose();combat=null;
      director?.dispose();director=null;
      face?.dispose();face=null;
      vfx?.dispose();vfx=null;
      scene.remove(group);disposeObject(model);
    }
    return {ready:true,status:S6_DUO_STATUS.READY,group,advance,dispose,
      get state(){return {source:'AUTHENTICATED_R2_PRIVATE',idle:ORIGINAL_IDLE_IDS[idleIndex],
        face:face?.state.id??null,mode:choreographer?.state.mode??S6_DUO_MODES.QUIET,
        combat:combat?.state.mode??null,rotation:group.rotation.y,
        G7:'NO_GO',facial:'R6_CANDIDATE_WITH_APPROVED_V2_FALLBACK',
        vfx:combat?'G11.3_R62_S5_SOURCE_ONLY':'OFF',
        visualQA:'PENDING_GPU_AND_SOURCE',duo:'ONE_SCENE_SINGLE_RAF'};}};

  }catch(error){
    choreographer?.dispose();combat?.dispose();director?.dispose();face?.dispose();vfx?.dispose();if(group)scene.remove(group);
    for(const s of new Set([...scenes,...(model?[model]:[])]))disposeObject(s);
    if(error?.name==='AbortError')return null;
    return {ready:false,status:S6_DUO_STATUS.FAILED,reason:'ASSET_OR_RIG_VALIDATION_FAILED',advance(){},dispose(){}};
  }
}
