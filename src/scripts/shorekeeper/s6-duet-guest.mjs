import {createFloorOccupancy} from '../astral-tidal-garden.mjs';
import {createDuetTrace} from './duet-cinematic.mjs';
/**
 * S6-D duo guest (private preview): one Hsin scene/renderer/RAF, independent
 * body owner per character. Never publishes a Shorekeeper GLB or fetches a
 * non-Access origin. Source posture/fidelity not certified: G7 stays NO_GO.
 */
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {LoadingManager} from 'three';
import {inspectPrivateManifest,getPrivateFile,inspectPublicStageManifest,getPublicStageFile} from './remote-private-model.mjs';
import {SHOREKEEPER_CANONICAL} from './private-model-cache.mjs';
import {prepareDuetModel,s6DuoModelRequirements} from './duet-model-preparation.mjs';
export {s6DuoModelRequirements} from './duet-model-preparation.mjs';
import {assertSelfContainedGLB,disposeObject} from './local-model.mjs';
import {validateCombatLibrary} from './combat-director.mjs';
import {createOriginalIdleDirector,ORIGINAL_IDLE_IDS} from './original-idle-director.mjs';
import {createInspection} from './inspection.mjs';
import {createGentleFace} from './gentle-acting.mjs';
import {APPROVED_MANUAL_RECIPES} from './approved-manual-gallery.mjs';
import {S6_AUTO_FACE_ROSTER} from './s6-autonomy.mjs';
import {createAnatomicalFaceDirector} from './anatomical-face.mjs';
import {createMouthR5} from './mouth-r5.mjs';
import {duetMusicSnapshot} from './duet-music-contract.mjs';
import {R6_PRIMARY_CHOICES,resolveFaceMenu} from './facial-unified-menu.mjs';
import {createNonRepeatingChoice,quietFaceWait,g113InterludeSeconds} from './duet-acting-policy.mjs';
export const canPlayDuetR6Expression=id=>R6_PRIMARY_CHOICES.some(x=>x.id===id);

const REQUIRED=Object.freeze(['basic','advanced','burst']);
export const S6_DUO_STATUS=Object.freeze({
  NO_ACCESS:'AUTHENTICATION_REQUIRED',MISSING:'PRIVATE_ASSETS_MISSING',
  INCOMPLETE:'PRIVATE_LIBRARY_INCOMPLETE',CONFIGURATION:'PRIVATE_SERVICE_UNAVAILABLE',INVALID:'PRIVATE_MANIFEST_INVALID',NETWORK:'PRIVATE_NETWORK_UNAVAILABLE',READY:'DUO_PRIVATE_PREVIEW_G7_PENDING',
  FAILED:'PRIVATE_GUEST_UNAVAILABLE'
});
export function s6DuoRequirements(manifest,hash){
  if(!manifest||!['shorekeeper-private-assets/v1','shorekeeper-stage-assets/v1'].includes(manifest.schema))return false;
  if(manifest.model?.sha256!==hash||manifest.model?.bytes!==SHOREKEEPER_CANONICAL.bytes)return false;
  return REQUIRED.every(id=>manifest.libraries?.some(x=>x.id===id))&&new Set(manifest.libraries.map(x=>x.id)).size===manifest.libraries.length;
}
export function nextDuoIdle(index,count=ORIGINAL_IDLE_IDS.length) {
  if(!Number.isInteger(index)||!(count>0))throw Error('Invalid duo idle index');
  return ((index+1)%count+count)%count;
}
function aborted(signal){return !!signal?.aborted;}
export async function loadS6DuetGuest(T,scene,{signal,preferredHeight=1.55,experimentalR6=false,preparation=null,hostModel=null,camera=null,cameraStage=null,exclusionRects=()=>[],onStatus=()=>{},lowPower=false,traceEnabled=false,releaseSource='private'}={}){
  const guestStart=performance.now();let firstGuestFrameMs=null,preparationMs=null;
  if(releaseSource!=='private'&&releaseSource!=='public')throw Error('Invalid guest source');
  const inspect=releaseSource==='public'?inspectPublicStageManifest:inspectPrivateManifest;
  const fetchBinary=releaseSource==='public'?getPublicStageFile:getPrivateFile;
  const prepared=experimentalR6?(preparation??prepareDuetModel({signal,inspect,fetchFile:fetchBinary})):null;
  const preparedModel=prepared?await prepared.take():null;
  if(prepared&&!preparedModel)return null;
  const inspected=preparedModel?{state:preparedModel.ready?'ready':preparedModel.state,manifest:preparedModel.manifest}:await inspect({signal});
  if(inspected.state!=='ready')return {ready:false,status:['denied','auth_redirect'].includes(inspected.state)?S6_DUO_STATUS.NO_ACCESS:inspected.state==='missing'?S6_DUO_STATUS.MISSING:inspected.state==='unconfigured'?S6_DUO_STATUS.CONFIGURATION:inspected.state==='invalid'?S6_DUO_STATUS.INVALID:inspected.state==='incomplete'?S6_DUO_STATUS.INCOMPLETE:inspected.state==='failed'?S6_DUO_STATUS.FAILED:S6_DUO_STATUS.NETWORK,reason:inspected.state==='failed'?'DOWNLOAD_OR_INTEGRITY':null,
    advance(){},dispose(){}};
  const manifest=inspected.manifest;
  if(!(experimentalR6?s6DuoModelRequirements(manifest,SHOREKEEPER_CANONICAL.sha256):s6DuoRequirements(manifest,SHOREKEEPER_CANONICAL.sha256)))return {ready:false,status:S6_DUO_STATUS.INCOMPLETE,advance(){},dispose(){}};
  if(aborted(signal))return null;
  const manager=new LoadingManager();manager.setURLModifier(url=>{
    if(!/^(?:blob:|data:)/i.test(url))throw Error('External private GLB resource blocked');
    return url;
  });
  const parser=new GLTFLoader(manager),scenes=[],loaded=[];
  let failureStage='DOWNLOAD_OR_INTEGRITY',model=null,group=null,director=null,face=null,mouthCorrection=null,disposed=false,modelParseMs=null;
  const ownedScene=s=>{scenes.push(s);return s;};
  try{
    // Authenticated R2 endpoint verifies HTTP size, header SHA-256, byte length
    // and full SHA-256 before any asset reaches GLTFLoader.
    async function parseFile(entry,kind){
      failureStage='DOWNLOAD_OR_INTEGRITY';
      let file=null;
      const preparedBuffer=kind==='model'?preparedModel?.buffer:null;
      if(!preparedBuffer)file=await fetchBinary(entry,{kind,signal,asBuffer:true});
      if(aborted(signal))throw new DOMException('Cancelled','AbortError');
      const buffer=preparedBuffer??(file instanceof ArrayBuffer?file:await file.arrayBuffer()),json=assertSelfContainedGLB(buffer);
      failureStage='GLTF_PARSE';const parseStarted=performance.now();const gltf=await parser.parseAsync(buffer,'');
      if(disposed||aborted(signal)){disposeObject(gltf.scene);throw new DOMException('Cancelled','AbortError');}
      if(kind==='model')modelParseMs=performance.now()-parseStarted;
      if(kind==='model'&&preparedModel)preparedModel.buffer=null;
      failureStage='INITIALIZATION_OR_RIG';
      ownedScene(gltf.scene);
      return {gltf,json};
    }
    const base=await parseFile(manifest.model,'model');
    if(aborted(signal))throw new DOMException('Cancelled','AbortError');
    failureStage='INITIALIZATION_OR_RIG';model=base.gltf.scene;
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
    let active=-1,restSeconds=0,faceSeconds=quietFaceWait(),manualFaceCooldown=0,playing=true;
    const idleChoice=createNonRepeatingChoice(ORIGINAL_IDLE_IDS.length);
    const faceChoice=createNonRepeatingChoice(S6_AUTO_FACE_ROSTER.length);
    const trace=createDuetTrace(T,model,group);
    const occupancy=createFloorOccupancy(T,model);
    let g113=null,vfx=null,g113Loading=null,g113Clips=null,g113Status='NOT_REQUESTED',g113Attempted=false,g113Cooldown=0,cameraPreference='auto';
    const cinematicSelected=()=>cameraPreference==='auto'||cameraPreference==='shorekeeper';
    let musicSnapshot=duetMusicSnapshot();
    const observeMusic=sample=>{if(!disposed)musicSnapshot=duetMusicSnapshot(sample);return musicSnapshot;};
    function switchIdle(){
      director?.dispose();director=null;
      active=idleChoice.next();
      director=createOriginalIdleDirector(T,model,loaded.find(c=>c.name===ORIGINAL_IDLE_IDS[active]),
        {enter:.65,exit:.6,preservePoseOnDispose:true});
      director.start();
    }
    switchIdle();
    // G11.3 is the already-authored S5 seven-source cinematic (not a yaw loop).
    // Extra libraries are fetched only after an explicit test or verified playback.
    async function startG113(){
      // The S5 choreography is music-exclusive, never a button-triggered action.
      if(!musicSnapshot.playbackConfirmed||disposed||aborted(signal)||g113Loading||(g113&&g113.state.phase!=='idle'))return false;
      if(g113&&g113.state.phase==='idle')finishG113();
      g113Attempted=true;
      if(!s6DuoRequirements(manifest,SHOREKEEPER_CANONICAL.sha256)){
        g113Status='PRIVATE_COMBAT_LIBRARIES_REQUIRED';return false;
      }g113Status='LOADING_VERIFIED_G113';
      g113Loading=(async()=>{
        let nextVfx=null,nextDirector=null;
        try{
          if(!g113Clips){
            const additional=[];
            for(const id of REQUIRED){
              const item=manifest.libraries.find(row=>row.id===id);
              const data=await parseFile(item,'library');if(disposed||aborted(signal))return false;
              additional.push(...validateCombatLibrary(T,model,data));
              disposeObject(data.gltf.scene);
            }
            scenes.length=0;
            const unique=new Map([...loaded,...additional].map(c=>[c.name,c]));
            if(unique.size!==loaded.length+additional.length)throw Error('Duplicated G11.3 source clips');
            const {R61_SOURCE_IDS}=await import('./r61-plan.mjs');
            if(!R61_SOURCE_IDS.every(id=>unique.has(id)))throw Error('G11.3 missing authenticated source clip');
            g113Clips=[...unique.values()];
          }
          if(disposed||aborted(signal))return false;
          const [{ShorekeeperVfxR5Director},{createR62Integration}]=await Promise.all([
            import('./vfx-r5.mjs'),import('./r62-integration.mjs')
          ]);
          if(disposed||aborted(signal)||!musicSnapshot.playbackConfirmed)return false;
          nextVfx=new ShorekeeperVfxR5Director(scene,{camera,mobile:lowPower,reducedMotion:false});
          nextVfx.bindModel(model);
          // One Stellarealm canopy/field contains BOTH performers, never a separate SK scene.
          let sharedArena=null;
          if(hostModel){
            hostModel.updateMatrixWorld(true);group.updateMatrixWorld(true);
            const box=new T.Box3().setFromObject(hostModel).union(new T.Box3().setFromObject(group));
            const mid=box.getCenter(new T.Vector3());
            sharedArena={x:mid.x,z:mid.z,floorY:box.min.y,radius:box.getSize(new T.Vector3()).length()/2+.75};
          }
          // The Hsin sky/moon stay the background; only the shared Stellarealm
          // field, canopy and G11 score are drawn. Never replace the stage camera.
          nextVfx.environment.sky.visible=false;
          nextVfx.setStage('outer');nextVfx.setState('OFF');
          // Keep camera choreography off so Hsin and Shorekeeper stay in the same frame.
          if(!cameraStage)throw Error('DUET_CAMERA_STAGE_REQUIRED');
          const stage=cameraStage;
          // A combo claims the exact body owner currently held by an idle:
          // release the idle BEFORE constructing the G11.3 director.
          director?.dispose();director=null;
          face?.reset();
          const activeVfx=nextVfx; // Stable lease: cleanup variables are nulled after ownership transfer.
          nextDirector=createR62Integration(T,model,g113Clips,stage,{
            getVfx:()=>activeVfx,camera:true,entry:.65,preservePoseOnDispose:true,
            arena:sharedArena,
            // Preserve the exact approved S5 intelligent camera: the guest remains
            // the sole subject during its musical G11.3 presentation.
            cameraProfile:{smart:true},
            reducedMotion:()=>false,
            onEvent:e=>face?.onAnimationEvent?.(e)
          });
          if(disposed||aborted(signal)||!musicSnapshot.playbackConfirmed)return false;
          nextDirector.start();
          if(!cinematicSelected())nextDirector.stopCamera({preserve:true});
          g113=nextDirector;vfx=nextVfx;
          nextDirector=null;nextVfx=null;
          g113Status='PLAYING_G113_S5';onStatus(g113Status);
          return true;
        }catch(error){
          g113Status='G113_SOURCE_OR_VFX_UNAVAILABLE';onStatus(g113Status);
          console.warn('G11.3 unavailable:',error?.message??'Source or presentation failure');
          return false;
        }finally{
          nextDirector?.dispose();nextVfx?.dispose();
          if(!disposed&&!director&&!g113)switchIdle();
          g113Loading=null;
        }
      })();
      return g113Loading;
    }
    function finishG113(){
      if(g113){g113.dispose();g113=null;}
      if(vfx){vfx.dispose();vfx=null;}
      // A full G11.3 cycle earns a 5–8 s playing-time contemplative interlude.
      // The body/VFX director has already released ownership for original idles.
      g113Cooldown=g113InterludeSeconds();g113Attempted=false;
      faceSeconds=Math.min(faceSeconds,.5+Math.random()*.9);
      restSeconds=1.5+Math.random()*2.5;
      if(!disposed){g113Status='IDLE_RECOVERED';face?.reset();switchIdle();}
    }
    function advance(dt,{paused=false,reducedMotion=false,music=null}={}){
      observeMusic(music);
      if(reducedMotion&&g113?.state.presentationActive)g113.interrupt();
      if(disposed||paused||!(dt>0)||!playing)return;
      if(reducedMotion&&!g113)return;
      const elapsed=Math.min(.09,dt);
      const confirmed=musicSnapshot.playbackConfirmed;
      if(!confirmed&&g113?.state.presentationActive)g113.interrupt();
      if(g113){
        g113.advance(elapsed);vfx?.update(elapsed,1);
        if(traceEnabled)occupancy.sample();
        if(traceEnabled)trace.sample(elapsed,{body:g113.state,music:musicSnapshot,vfx:g113.scoreAdapter?.last??null,camera:g113.cameraTelemetry()??{position:camera?.position.toArray(),fov:camera?.fov,director:g113.state.camera}});
        face?.advance(elapsed,{writeFacial:true});
        if(g113.state.phase==='idle'&&!g113.state.camera?.returning)finishG113();
        model.updateMatrixWorld(true);return;
      }
      const contemplativeInterlude=confirmed&&g113Cooldown>0;
      if(confirmed&&g113Cooldown<=0&&!g113Attempted&&!g113Loading){
        void startG113();
      }
      if(!confirmed){g113Attempted=false;}
      // Count the 5–8 seconds ONLY while the music is actually playing.
      // Paused/buffering time must not consume the interlude in silence.
      if(confirmed)g113Cooldown=Math.max(0,g113Cooldown-elapsed);
      director?.advance(elapsed);
      if(director?.state.phase==='idle'){
        restSeconds-=elapsed;
        if(restSeconds<=0){restSeconds=1.5+Math.random()*3.5;switchIdle();}
      }
      face?.advance(elapsed,{writeFacial:true});
      manualFaceCooldown=Math.max(0,manualFaceCooldown-elapsed);
      if((!confirmed||contemplativeInterlude)&&manualFaceCooldown<=0){
        faceSeconds-=elapsed;
        if(faceSeconds<=0&&!face?.state.busy){
          let accepted=false;
          for(let tries=0;tries<S6_AUTO_FACE_ROSTER.length;tries++){
            const row=S6_AUTO_FACE_ROSTER[faceChoice.next()];
            if(face.qaSupport(row.id).available&&face.triggerQA(row.id)){accepted=true;break;}
          }
          faceSeconds=accepted?quietFaceWait():3;
        }
      }
      model.updateMatrixWorld(true);
    }
    function manualFace(perform){
      if(disposed||!experimentalR6)return false;
      face.setFrozen(false);
      const ok=perform();
      if(ok){manualFaceCooldown=18;faceSeconds=quietFaceWait();}
      return ok;
    }
    function dispose(){
      if(disposed)return;
      disposed=true;g113?.dispose();vfx?.dispose();director?.dispose();face?.dispose();mouthCorrection?.dispose();scene.remove(group);disposeObject(model);
    }
    preparationMs=performance.now()-guestStart-(modelParseMs??0);
    return {ready:true,status:S6_DUO_STATUS.READY,group,advance,dispose,observeMusic,
      markRendered(){if(firstGuestFrameMs===null)firstGuestFrameMs=performance.now()-guestStart;},
      cameraActive(){return !!(g113?.state.cameraActive||g113?.state.camera?.returning);},
      setCameraPreference(mode){
        if(!['auto','free','hsin','shorekeeper'].includes(mode)||disposed)return false;
        cameraPreference=mode;
        if(g113?.state.presentationActive){
          if(cinematicSelected())g113.resumeCamera();
          else g113.stopCamera({preserve:true});
        }
        return true;
      },
      interrupt(){if(g113?.state.presentationActive)g113.interrupt();},
      diagnostics(){return {state:this.state,occupancy:occupancy.report(),trace:trace.report(),clips:(g113Clips??loaded).map(c=>({name:c.name,duration:c.duration,tracks:c.tracks.map(t=>({name:t.name,keys:t.times.length,start:t.times[0],end:t.times[t.times.length-1]}))}))};},
      playR6Expression(id){if(!canPlayDuetR6Expression(id))return false;return manualFace(()=>face.playCandidate(id));},
      playFaceSelection(value){
        const selected=resolveFaceMenu(value);
        if(!selected)return false;
        return manualFace(()=>selected.kind==='r6'?face.playCandidate(selected.id):face.playBaseline(selected.id));
      },
      neutralR6(){return manualFace(()=>face.reset());},
      blinkR6(){return manualFace(()=>face.trigger('blink'));},
      get loadingMetrics(){return {...prepared?.report(),modelParseMs,preparationExcludingParseMs:preparationMs,firstGuestFrameMs,firstGuestFrame:'CPU_RENDER_SUBMISSION_NOT_GPU_PRESENTATION'};},
      get state(){return {source:'AUTHENTICATED_R2_PRIVATE',cameraPreference,librariesLoaded:experimentalR6?'MODEL_ONLY_IDLE_FACIAL':'FULL_COMBAT',idle:ORIGINAL_IDLE_IDS[active],face:face?.state.expression,
        G7:'NO_GO',R6:experimentalR6?'MANUAL_R5_CANDIDATE':'DISABLED',music:musicSnapshot,g113:{status:g113Status,mode:g113?.state.mode??null,cue:g113?.state.cue??null,musicExclusive:true,librariesLoaded:!!g113Clips,stellarealm:vfx?.state??'OFF',interludeSecondsRemaining:g113Cooldown,interludeActive:g113Cooldown>0&&!g113},quiet:{idlePolicy:'RANDOM_NON_REPEAT',facialPolicy:'S6_CURATED_BASELINE_RANDOM'},visualQA:'PENDING',duo:'ONE_SCENE_SINGLE_RAF'};}};
  }catch(error){
    director?.dispose();face?.dispose();mouthCorrection?.dispose();if(group)scene.remove(group);
    for(const s of new Set([...scenes,...(model?[model]:[])]))disposeObject(s);
    if(error?.name==='AbortError')return null;
    return {ready:false,status:S6_DUO_STATUS.FAILED,reason:failureStage,advance(){},dispose(){}};
  }
}
