import {createSourceReviewDirector} from './shorekeeper/source-review.mjs';
import {createR61Director} from './shorekeeper/r61-cinematic.mjs';
import {setSourceReviewVfxIsolation} from './shorekeeper/source-review-visuals.mjs';
import {createFrameMetrics} from './shorekeeper/frame-metrics.mjs';
import {createPresentationClock} from './shorekeeper/presentation-clock.mjs';
import {needsContinuousFrame} from './shorekeeper/frame-policy.mjs';
import {invalidateComboCache} from './shorekeeper/combo-plan.mjs';
import * as T from 'three';
import {createOriginalIdleDirector,findOriginalClip,ORIGINAL_IDLE_IDS,validateOriginalLibrary} from './shorekeeper/original-idle-director.mjs';
import {COMBAT_CLIP_IDS,validateCombatLibrary} from './shorekeeper/combat-director.mjs';
import {BURST_ORIGINAL_IDS,createRebasedBurstClip,createBindRootBurstClip} from './shorekeeper/liberation-rotation.mjs';
import {EXPRESSION_LIBRARY,bindExpressionButtons} from './shorekeeper/expression-library.mjs';
import {createGentleFace,createContemplativeScheduler} from './shorekeeper/gentle-acting.mjs';
import {createDirector} from './shorekeeper/director.mjs';
import {createLocalLoader,disposeObject,assertSelfContainedGLB} from './shorekeeper/local-model.mjs';
import {createInspection,boneGroup,morphGroup,FACE_PRESETS} from './shorekeeper/inspection.mjs';
import {MOUTH_QA_RECIPES} from './shorekeeper/mouth-qa-probes.mjs';
import {APPROVED_MANUAL_RECIPES,isApprovedManualGesture} from './shorekeeper/approved-manual-gallery.mjs';
import {createMouthIsolation,facialGeometryInventory} from './shorekeeper/mouth-forensics.mjs';
import {createMouthR5} from './shorekeeper/mouth-r5.mjs';
import {ShorekeeperVfxR5Director} from './shorekeeper/vfx-r5.mjs';
import {createMouthR4} from './shorekeeper/mouth-r4.mjs';
import {ShorekeeperVfxR4Director} from './shorekeeper/vfx-r4.mjs';
import {celestialCameraFit,celestialCameraFitR5} from './shorekeeper/celestial-framing.mjs';
import {bodyOwner} from './shorekeeper/animation-ownership.mjs';
import {cameraOwner} from './shorekeeper/camera-ownership.mjs';
import {createComboCamera} from './shorekeeper/combo-camera.mjs';
import {prepareInspectableCombo} from './shorekeeper/combo-plan.mjs';
import {createMouthR3} from './shorekeeper/mouth-r3.mjs';
import {ShorekeeperVfxR3Director} from './shorekeeper/vfx-r3.mjs';
import {ShorekeeperVfxR2Director} from './shorekeeper/vfx-r2.mjs';
import {createComboDirector} from './shorekeeper/combo-sequencer.mjs';
import {createVfxNarrative} from './shorekeeper/vfx-narrative.mjs';
import {inspectPrivateManifest,getPrivateFile} from './shorekeeper/remote-private-model.mjs';
import {summarizePrivateCombat} from './shorekeeper/private-library-coverage.mjs';
import {createMouthRibbonWeld} from './shorekeeper/mouth-ribbon-weld.mjs';
import {createStage} from './shorekeeper/stage.mjs';
import {SHOREKEEPER_CANONICAL,readPrivateModel,savePrivateModel,forgetPrivateModel} from './shorekeeper/private-model-cache.mjs';
import {createRenderLoop} from './shorekeeper/render-loop.mjs';
import {labPhase,permissions} from './shorekeeper/lab-state.mjs';
export {assertSelfContainedGLB};
const PHASES={empty:'Sem modelo',loading:'Carregando',ready:'Pronto',animating:'Animando',paused:'Pausado',error:'Erro','context-lost':'WebGL perdido'};
export function mountShorekeeperLab(root){
 if(root._skDispose)root._skDispose();
 const $=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)],control=n=>$('[data-control="'+n+'"]'),action=n=>$('[data-action="'+n+'"]');
 // Keep emergency manual imports reachable only with an explicit maintenance flag.
 // Hidden controls remain mounted because loader/cancel/cache handlers depend on them.
 root.dataset.maintenance=String(new URLSearchParams(location.search).get('maintenance')==='1');
 const lifetime=new AbortController(),events={signal:lifetime.signal},on=(el,event,fn)=>el.addEventListener(event,fn,events);
 const facialR6=new URLSearchParams(location.search).get('facialR6')==='1';
 const mouthQA=facialR6||new URLSearchParams(location.search).get('mouthQA')==='1';
 const facialQA=mouthQA||new URLSearchParams(location.search).get('facialQA')==='1'; // Manual, explicit candidates in the Expressions tab; never scheduled automatically.
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),loader=createLocalLoader(),host=$('[data-sk-canvas]');
 const state={webgl:false,contextLost:false,loading:false,error:false,model:false,phase:'idle',paused:false};
 let stage=null,model=null,inspection=null,director=null,selected=null,metadata=null,disposed=false,loadId=0,suspended=false,userPaused=false,last=0,summaryAt=0,metricsStart=0,frames=0,frameMs=0,renderFrameMs=0;
 const presentationClock=createPresentationClock(),frameMetrics=createFrameMetrics(),renderMetrics=createFrameMetrics();
 let loop=null,preparation=null,preparationSequence=0,preparationReport={status:'IDLE'};
 let comboCamera=null,exemplarCamera=null,narrative=null,vfx=null,vfxPaused=false,vfxDemoCameraSet=false;
 let r6QaDispose=null;
 let face=null,scheduler=null,outOfView=false,mouthIsolation=null,mouthWeld=null,referenceUrl=null;
 let activePrivateFile=null,cachedPrivateSha=null,manualFileChosen=false,remoteAttempt=null;
 let r2Manifest=null,r2Connection='checking',r2HttpStatus=null,r2Checking=false;
 let sweep=null,sweepLast=null,lastPhase='',lastDirectorPhase='idle',restError=null,releaseCounts=null;
 const errors=[],warnings=[],flags=[],animationLibraries=[];let libraryGeneration=0;const libraryLoader=createLocalLoader();let observed={fps:null,frameTimeMs:null};
 const status=message=>{$('[data-sk-status]').textContent=message;};
 const privateStatus=message=>{$('[data-private-cache-status]').textContent=message;};
 const r2Labels=Object.freeze({
  checking:'Verificando o manifesto protegido do R2…',
  ready:'Manifesto R2 autorizado. As bibliotecas só ficam prontas após validação dos clipes.',
  denied:'Acesso privado negado (403). Autentique-se no Cloudflare Access para este domínio; o site não ignora essa proteção.',
  unconfigured:'R2 indisponível (503). Verifique o binding SHOREKEEPER_ASSETS_R2 e a configuração do Access no ambiente Pages.',
  missing:'Manifesto R2 ausente (404). Confira characters/shorekeeper/manifests/current.json.',
  invalid:'Manifesto incompatível ou inválido. Confira schema, hashes, nomes e máximo de quatro bibliotecas.',
  unavailable:'Serviço privado indisponível; verifique a implantação e tente novamente.',
  network:'Não foi possível contatar o serviço privado. Verifique rede, domínio e conexão.',
  cancelled:'Verificação anterior cancelada.',
 });
 function syncR2LibraryPanel(){
  const stateText=$('[data-r2-connection-state]'),container=$('[data-r2-library-list]');
  if(!stateText||!container)return;
  const clips=model?.userData?.skClips??[];
  const summary=summarizePrivateCombat(r2Manifest,clips);
  const modelReady=metadata?.sha256===SHOREKEEPER_CANONICAL.sha256;
  stateText.textContent=(r2Labels[r2Connection]??r2Labels.unavailable)+(r2Connection==='ready'?' Modelo: '+(modelReady?'canônico carregado':model?'outro GLB carregado':'ainda não carregado')+'.':r2HttpStatus&&r2Connection==='unavailable'?' (HTTP '+r2HttpStatus+').':'');
  const lines=[{label:'Modelo F2.0-A',text:modelReady?'verificado e carregado':r2Manifest?'registrado; carregamento pendente':'não verificado'}];
  for(const row of summary.rows){
   const label=row.label+' · '+row.loaded+'/'+row.total+' clipes';
   const detail=row.ready?'pronto para selecionar':row.state==='partial'?'parcial; faltam '+row.missing.length+' clipes':row.registered?'registrado no R2; carregamento pendente':'ainda não registrado neste manifesto';
   lines.push({label,text:detail});
  }
  container.replaceChildren(...lines.map(line=>{
   const entry=document.createElement('p');entry.className='sk-help';entry.setAttribute('role','listitem');
   const title=document.createElement('strong');title.textContent=line.label;entry.append(title,document.createTextNode(' — '+line.text));return entry;
  }));
  const manualReady=phase()==='ready'||(phase()==='animating'&&control('presentationMode').value==='contemplation');
  const canPlay=!!model&&modelReady&&manualReady&&!state.loading&&!userPaused;
  for(const button of all('[data-r2-quick-burst]')){
   const id=button.dataset.r2QuickBurst;
   button.disabled=!canPlay||!clips.some(clip=>clip.name===id);
   button.title=clips.some(clip=>clip.name===id)?'Bursts originais; efeitos celestiais independentes.':'Animação original ainda não reconhecida.';
  }
  const refresh=$('[data-r2-recheck]');
  refresh.disabled=r2Checking||state.loading||state.contextLost||!state.webgl;
  refresh.textContent=r2Checking?'Verificando acervo…':'Verificar acesso e carregar bibliotecas';
 }
 const syncPrivateButtons=()=>{action('rememberPrivate').disabled=!model||!activePrivateFile||state.loading;action('forgetPrivate').disabled=!cachedPrivateSha;};
 const log=(message,kind='error')=>{const list=kind==='error'?errors:warnings;list.push({time:new Date().toISOString(),message:String(message)});if(list.length>50)list.shift();};
 const warn=message=>{log(message,'warning');status(message);};
 function phase(){state.model=!!model;state.phase=director?.state.phase??'idle';state.paused=!!model&&(userPaused||(!!director?.state.paused&&state.phase!=='idle'));return labPhase(state);}
 function sync(force=false){if(state.loading||state.contextLost){last=0;presentationClock.reanchor();loop?.reconcile();}const p=phase();const key=p+':'+control('originalMode').value+':'+control('actingAuto').checked+':'+!!face?.state.busy;if(!force&&lastPhase===key)return;lastPhase=key;root.dataset.state=p;$('[data-phase]').textContent=PHASES[p];const can=permissions(p,!!director);if(control('actingAuto').checked&&control('originalMode').value==='expressive')can.rig=false;root.dataset.motionPaused=String(userPaused||suspended||outOfView||document.hidden||state.contextLost||state.loading||!model);
 for(const el of all('[data-view], [data-preset], [data-morph], [data-control], [data-action]')){const n=el.dataset.control,a=el.dataset.action;
 if(['panelWidth','dpr','fps'].includes(n)||['panel','retry','cancel','report','errors','copy','rememberPrivate','forgetPrivate'].includes(a))continue;
 if(el.dataset.boneAxis)continue;
 if(n||el.dataset.morph||el.dataset.view||el.dataset.preset||['capture','config','customPreset','sweep','stopSweep','flag'].includes(a))el.disabled=!can.inspect;
 if(['originalIdle','originalLayer','presentationMode'].includes(n))el.disabled=!can.rig;
 if(n==='originalMode')el.disabled=!can.inspect;
 if(['bone','boneSearch','rigreset'].includes(n))el.disabled=!can.rig;
 if(['play','repeat'].includes(a))el.disabled=!can.play;
 if(a==='pause')el.disabled=!can.pause;
 if(a==='interrupt')el.disabled=!can.interrupt;
 if(['enter','transfer','exit','speed'].includes(n))el.disabled=!can.play;
 }
 for(const el of all('[data-mouth-probe], [data-mouth-geometry], [data-mouth-component], [data-mouth-flat], [data-mouth-view], [data-mouth-restore], [data-mouth-export], [data-mouth-capture]'))el.disabled=!mouthAllowed();
 for(const el of all('[data-mouth-probe*="_R2_"], [data-mouth-probe*="_R3_"]'))el.disabled=!mouthAllowed();
 for(const el of all('[data-bone-axis], [data-rig-preset]'))el.disabled=!can.rig||(!selected&&el.dataset.boneAxis!==undefined);
 const blink=$('[data-morph="E_Close"]');blink.disabled=!can.inspect||!inspection?.names.includes('E_Close');action('sweep').disabled=blink.disabled;
 if(control('originalIdle').value!=='legacy'||control('originalMode').value==='expressive'){control('transfer').disabled=true;for(const el of all('[data-morph], [data-preset], [data-preset-config]'))el.disabled=true;for(const n of ['gazeX','gazeY','morph','morphWeight','morphGroup'])control(n).disabled=true;action('sweep').disabled=true;action('customPreset').disabled=true;}
 const expressive=control('originalMode').value==='expressive';
 control('actingAuto').disabled=facialR6||!can.inspect||!expressive||motion.matches;
 if(expressive&&can.inspect&&(face?.state.busy||scheduler?.state.enabled||userPaused)){action('pause').disabled=false;action('interrupt').disabled=false;}
 if(can.inspect&&userPaused)action('pause').disabled=false;
 control('expressionIntensity').disabled=!can.inspect||!expressive;
 for(const button of all('[data-expression]')){const id=button.dataset.expression,support=id==='blink'?{available:inspection?.names.includes('E_Close'),missing:['E_Close']}:face?.support(id);button.disabled=!can.inspect||!expressive||!support?.available;button.title=support&&!support.available?'Indisponível: '+support.missing.join(', '):'';}
 for(const button of all('[data-facial-candidate]')){
  const id=button.dataset.facialCandidate;
  const available=id==='NEUTRAL'||face?.qaSupport(id)?.available;
  button.disabled=!facialQA||!can.inspect||!expressive||control('presentationMode').value==='combat'||!available;
  button.title=available?'Candidato experimental · sem aprovação visual':'Morphs necessários indisponíveis neste GLB';
 }
 for(const button of all('[data-approved-expression]')){
  const id=button.dataset.approvedExpression;
  const canonical=metadata?.sha256===SHOREKEEPER_CANONICAL.sha256;
  const available=id==='NEUTRAL'||(isApprovedManualGesture(id)&&face?.qaSupport(id)?.available);
  button.disabled=!canonical||mouthQA||!can.inspect||!expressive||userPaused||control('presentationMode').value==='combat'||!available;
  button.title=!canonical?'Esta apresentação exige o GLB F2.0-A canônico.':!available?'Morphs exigidos indisponíveis.':'Manual · retorno ao repouso; geometria sem mudança automática.';
 }
 const approvedGeometry=$('[data-approved-geometry]');
 approvedGeometry.disabled=!metadata||metadata.sha256!==SHOREKEEPER_CANONICAL.sha256||mouthQA||!can.inspect||!expressive||userPaused||control('presentationMode').value==='combat';
 for(const button of all('[data-facial-camera], [data-facial-capture]'))button.disabled=!can.inspect;

 for(const option of control('originalIdle').options){if(option.value==='legacy')continue;const combat=COMBAT_CLIP_IDS.includes(option.value);option.hidden=(control('presentationMode').value==='combat')!==combat;option.disabled=combat?!model?.userData.skClips?.some(c=>c.name===option.value):!findOriginalClip(model?.userData.skClips??[],option.value,control('originalLayer').value);}
 action('stopSweep').disabled=!sweep;action('capture').disabled=!can.inspect;
 $('[data-config-file]').disabled=!can.rig;$('[data-original-file]').disabled=!can.rig;$('[data-sk-file]').disabled=state.contextLost||!state.webgl;action('cancel').hidden=!state.loading;action('retry').hidden=state.webgl&&!state.contextLost;
 $('[data-empty]').hidden=!!model;$('[data-rig-status]').textContent=can.rig?'Edição disponível':'Edição bloqueada';action('pause').textContent=userPaused?'Retomar':'Pausar';syncPrivateButtons();syncVfx();syncR2LibraryPanel();
 if(facialR6){for(const el of all('[data-morph], [data-preset], [data-preset-config], [data-expression], [data-facial-candidate], [data-control="gazeX"], [data-control="gazeY"], [data-control="morphWeight"], [data-control="expressionIntensity"], [data-control="actingAuto"]'))el.disabled=true;action('sweep').disabled=true;action('customPreset').disabled=true;}
 }
 function stopSweep(restore=true){if(sweep&&restore)inspection?.setMorph('E_Close',sweep.previous);sweep=null;sweepLast=null;syncFace();sync(true);}
 function syncFace(){if(!inspection)return;for(const n of ['E_Close','gazeX','gazeY','morphWeight']){const v=n==='E_Close'?(inspection.weights.E_Close??0):n==='morphWeight'?(inspection.weights[control('morph').value]??0):n==='gazeX'?(inspection.weights.Pupil_R??0)-(inspection.weights.Pupil_L??0):(inspection.weights.Pupil_Up??0)-(inspection.weights.Pupil_Down??0);const el=n==='E_Close'?$('[data-morph="E_Close"]'):control(n);el.value=String(v);$('[data-value="'+n+'"]').textContent=Number(v).toFixed(2);}}
 function fillBones(){const query=control('boneSearch').value.toLowerCase(),sel=control('bone'),current=selected?.name;sel.replaceChildren();const groups=new Map();for(const b of inspection?.bones??[]){const group=boneGroup(b.name);if(!(`${b.name} ${group}`.toLowerCase().includes(query)))continue;if(!groups.has(group)){const opt=document.createElement('optgroup');opt.label=group;groups.set(group,opt);sel.append(opt);}groups.get(group).append(new Option(b.name,b.name));}if(current&&[...sel.options].some(o=>o.value===current))sel.value=current;else sel.selectedIndex=-1;}
 function fillMorphs(){const sel=control('morph'),current=sel.value,group=control('morphGroup').value;sel.replaceChildren(new Option('Selecione um morph',''));for(const n of inspection?.names??[]){const mesh=inspection.morphMeshes.find(m=>m.morphTargetDictionary[n]!==undefined);if(!group||morphGroup(n,mesh.name)===group)sel.add(new Option(n,n));}sel.value=[...sel.options].some(o=>o.value===current)?current:'';syncFace();}
 function showBone(){if(!inspection||!selected){$('[data-bone-data]').textContent='Selecione um bone para inspecionar.';return;}const info=inspection.boneInfo(selected);$('[data-bone-data]').textContent=JSON.stringify(info,null,2);const offset=inspection.offsets.get(selected.name)??[0,0,0];all('[data-bone-axis]').forEach((el,i)=>{el.value=String(offset[i]);$('[data-bone-angle="'+el.dataset.boneAxis+'"]').textContent=offset[i]+'°';});}
 function settings(){return Object.fromEntries(['enter','transfer','exit'].map(k=>[k,Number(control(k).value)]));}
 function cancelPreparation(reason='cancelled'){if(preparation)invalidateComboCache(model);preparationSequence++;preparation?.abort();preparation=null;if(preparationReport.status==='PREPARING')preparationReport={...preparationReport,status:'CANCELLED',reason};syncPreparation();}
 function release(){presentationClock.reset();invalidateComboCache(model);cancelPreparation('model-release');comboCamera?.stop();comboCamera=null;narrative?.stop();setSourceReviewVfxIsolation(vfx,false);vfx?.bindModel(null);mouthIsolation?.dispose();mouthIsolation=null;mouthWeld?.dispose();mouthWeld=null;activePrivateFile=null;libraryGeneration++;libraryLoader.cancel();animationLibraries.length=0;r6QaDispose?.();r6QaDispose=null;if(face?.dispose)face.dispose();else face?.reset();face=null;scheduler=null;stopSweep(false);director?.dispose();director=null;if(model){stage?.detach(model);releaseCounts=disposeObject(model,inspection?.extraMaterials??[]);}model=null;inspection=null;selected=null;metadata=null;restError=null;}
 function restoreRig(){if(phase()!=='ready')return;director?.dispose();inspection.restore();buildDirector();showBone();status('Pose original restaurada.');sync(true);}
 function buildDirector(){
 if(director)face?.onAnimationEvent({type:'end',clip:director.state.clip??'SK_COMBO_EXPERIMENTAL'});
 cancelPreparation('director-change'); comboCamera?.stop(); director?.dispose();director=null;
 const selected=control('originalIdle').value;
 if(selected==='legacy'&&control('presentationMode').value==='combat'){status('Ataques indisponíveis: adicione as bibliotecas privadas em repouso.');return;}
 if(selected!=='legacy'){
  const clip=COMBAT_CLIP_IDS.includes(selected)?model?.userData.skClips?.find(c=>c.name===selected):findOriginalClip(model?.userData.skClips??[],selected,control('originalLayer').value);
  if(clip){director=createOriginalIdleDirector(T,model,clip,{...settings(),onEvent:e=>{face?.onAnimationEvent(e);scheduler?.onEvent(e);if(e.type==='recovery')status('Recuperando a pose inicial…');}});presentationClock.setSpeed(Number(control('speed').value));director.setSpeed(1);}
  else status('Sequência indisponível neste GLB. Selecione a cópia privada F2.0-A ou retorne ao gesto F1.6.');
  return;
 }
 const body=model?.userData.skClips?.find(c=>c.name==='Stand1_Action01_window'),cloth=model?.userData.skClips?.find(c=>c.name==='Rib_Stand1_ClothLayer');if(body&&cloth){try{director=createDirector(T,model,body,cloth,settings());presentationClock.setSpeed(Number(control('speed').value));director.setSpeed(1);}catch(e){log('Composição: '+e.message);}}else warn('Modelo carregado. Os dois clipes esperados não estão disponíveis; inspeção estática permitida.');}
 function visuals(){if(!stage)return;stage.quality(Number(control('dpr').value));stage.light(Number(control('light').value));stage.background(control('background').value);$('[data-value="light"]').textContent=control('light').value;if(!inspection)return;inspection.materials(control('materials').value,control('wireframe').checked);for(const m of inspection.meshes)m.frustumCulled=control('culling').checked;for(const n of ['skeleton','axes'])stage.overlay(n,control(n).checked);}
 function stopCameraOwners(){comboCamera?.stop();narrative?.stop();}
 function setMouthGeometry(mode){
  if(!model||(!mouthQA&&metadata?.sha256!==SHOREKEEPER_CANONICAL.sha256))return;
  if(!['canonical','r2','r3','r4','r5'].includes(mode))throw Error('Geometria inválida');
  mouthIsolation?.dispose();mouthIsolation=null;mouthWeld?.dispose();mouthWeld=null;
  try{if(mode==='r2')mouthWeld=createMouthRibbonWeld(model);else if(mode==='r3')mouthWeld=createMouthR3(model);else if(mode==='r4')mouthWeld=createMouthR4(model);else if(mode==='r5')mouthWeld=createMouthR5(model);}
  finally{
   if(mouthQA){
    mouthIsolation=createMouthIsolation(T,model);const select=$('[data-mouth-component]');
    select.replaceChildren(new Option('Tudo · material original','all'),new Option('Contorno candidato isolado','contour'),new Option('Face sem o contorno candidato','without-contour'));
    for(const c of mouthIsolation.components)select.add(new Option('Ilha '+c.id+' · '+c.vertices+' vértices','component:'+c.id));
    $('[data-mouth-geometry]').value=mode;
   }else $('[data-approved-geometry]').value=mode;
   stage?.invalidate();
  }
 }
 async function load(file,source='local'){if(!file||state.contextLost||!stage)return;const id=++loadId;libraryGeneration++;libraryLoader.cancel();stopSweep();state.loading=true;state.error=false;sync(true);$('[data-load-progress]').hidden=false;$('[data-load-progress]').value=0;status('Lendo arquivo local…');
 try{const result=await loader.load(file,p=>{if(id!==loadId||disposed)return;$('[data-load-progress]').value=p.value;status(p.stage+'…');});if(!result)return;if(id!==loadId||disposed||state.contextLost){disposeObject(result.gltf.scene);return;}
 if(mouthQA&&result.sha256!==SHOREKEEPER_CANONICAL.sha256){disposeObject(result.gltf.scene);throw Error('A bancada B1 exige o GLB canônico verificado.');}
 const r6Module=facialR6?await import('./shorekeeper/anatomical-face.mjs'):null;
 const r6QaModule=facialR6?await import('./shorekeeper/facial-r6-qa.mjs'):null;
 if(id!==loadId||disposed||state.contextLost){disposeObject(result.gltf.scene);return;}
 release();model=result.gltf.scene;model.userData.skClips=result.gltf.animations;inspection=createInspection(model);if(r6Module)face=r6Module.createAnatomicalFaceDirector(inspection);else face=createGentleFace(inspection,{qaRecipes:mouthQA||facialQA?MOUTH_QA_RECIPES:APPROVED_MANUAL_RECIPES});face.reset();control('expressionIntensity').value='1';$('[data-value="expressionIntensity"]').textContent='100%';scheduler=createContemplativeScheduler({face,available:()=>ORIGINAL_IDLE_IDS.filter(id=>findOriginalClip(model?.userData.skClips??[],id,'composed')),start:id=>{if(!model||(director&&director.state.phase!=='idle')||control('originalMode').value!=='expressive')return false;director?.dispose();director=null;control('originalIdle').value=id;control('originalLayer').value='composed';buildDirector();if(!director)return false;presentationClock.setSpeed(Number(control('speed').value));director.setSpeed(1);presentationClock.setSpeed(1);control('speed').value='1';$('[data-value="speed"]').textContent='1×';director.start();sync(true);return true;}});scheduler.setReducedMotion(motion.matches);control('actingAuto').checked=false;control('originalMode').value='expressive';stage.adopt(model);vfx?.bindModel(model);if(vfx?.r5&&!mouthQA)vfx.setState('AMBIENT');if(vfx?.r4&&!mouthQA)stage.restoreCamera((vfx?.r5?celestialCameraFitR5:celestialCameraFit)({center:vfx.center.toArray(),height:vfx.scale,aspect:stage.camera.aspect}));if(mouthQA)setMouthGeometry(new URLSearchParams(location.search).get('mouthR5')==='1'?'r5':new URLSearchParams(location.search).get('mouthR4')==='1'?'r4':new URLSearchParams(location.search).get('mouthR2')==='1'?'r2':new URLSearchParams(location.search).get('mouthR3')==='1'||new URLSearchParams(location.search).get('mouthR2')==='r3'?'r3':'canonical');
 if(facialR6)r6QaDispose=r6QaModule.mountFacialR6Qa($('[data-facial-r6]'),{face,allowed:()=>mouthAllowed()&&!face.report().combat,geometry:()=>$('[data-mouth-geometry]').value,setGeometry:setMouthGeometry,captureCamera:()=>({...stage.cameraConfig(),orbitLimits:{min:stage.orbit.minDistance,max:stage.orbit.maxDistance}}),restoreCamera:c=>{stage.orbit.minDistance=c.orbitLimits.min;stage.orbit.maxDistance=c.orbitLimits.max;stage.restoreCamera(c);},camera:yaw=>{stopCameraOwners();const m=model.getObjectByName('Shorekeeper_Face'),target=new T.Box3().setFromBufferAttribute(m.geometry.attributes.position).getCenter(new T.Vector3());m.localToWorld(target);const a=yaw*Math.PI/180;stage.orbit.minDistance=.025;stage.restoreCamera({position:[target.x+Math.sin(a)*.37,target.y,target.z+Math.cos(a)*.37],target:target.toArray(),preset:'facial-r6-'+yaw});},exportReport:r=>save({...r,canonicalSha256:metadata?.sha256,geometry:$('[data-mouth-geometry]').value,camera:stage.cameraConfig(),renderer:stage.info()},'shorekeeper-r6-QA.json'),invalidate:()=>stage.invalidate()});
 if(facialR6)$('[data-tab="face"]').click();
 metadata={file:file.name,bytes:file.size,sha256:result.sha256,version:result.version,origin:source};activePrivateFile=file;
 if(!mouthQA&&metadata.sha256===SHOREKEEPER_CANONICAL.sha256){
  const mode=new URLSearchParams(location.search).get('approvedGeometry');
  if(mode==='r4'||mode==='r5')setMouthGeometry(mode);
  else $('[data-approved-geometry]').value='canonical';
 }
 privateStatus(result.sha256===SHOREKEEPER_CANONICAL.sha256?'GLB canônico F2.0-A verificado · três idles originais. '+(cachedPrivateSha===result.sha256?'Cópia guardada neste navegador.':'Você pode guardá-lo neste navegador.'):'GLB alternativo carregado · verifique as animações antes de guardar.');
 const missing=result.json.accessors?.filter(a=>a.sparse&&a.type==='VEC3'&&(!a.min||!a.max)).length??0;if(missing)log(missing+' accessors sparse VEC3 sem min/max: inspecionar culling.','warning');
 userPaused=false;lastDirectorPhase='idle';control('presentationMode').value='contemplation';control('originalIdle').value='legacy';control('originalLayer').value='composed';
 const available=ORIGINAL_IDLE_IDS.filter(id=>findOriginalClip(result.gltf.animations,id));if(available.length)control('originalIdle').value=available[0];if(available.length===3&&!motion.matches&&!mouthQA){control('originalIdle').value=available[0];control('originalMode').value='expressive';control('actingAuto').checked=true;scheduler?.setEnabled(true);} $('[data-original-availability]').textContent=available.length?'Idles disponíveis: '+available.map(id=>id.replace('SK_IDLE_','').replace('_ORIGINAL','')).join(', ')+'. Atuação facial experimental.':'Idle 01, 02 e 03 indisponíveis neste GLB. O gesto F1.6 e a inspeção continuam disponíveis.';
 control('boneSearch').value='';control('materials').value='original';control('wireframe').checked=false;control('skeleton').checked=false;control('axes').checked=false;control('culling').checked=true;control('morphGroup').replaceChildren(new Option('Todas as regiões',''));
 const groups=new Set(inspection.names.map(n=>morphGroup(n,inspection.morphMeshes.find(m=>m.morphTargetDictionary[n]!==undefined).name)));for(const g of groups)control('morphGroup').add(new Option(g,g));fillBones();fillMorphs();showBone();buildDirector();visuals();if(available.length===3&&!motion.matches&&!mouthQA&&director){director.start();}
 $('[data-sk-file-name]').textContent=file.name;$('[data-model-id]').textContent=result.version+'\nSHA-256: '+result.sha256;status('Modelo local carregado. '+result.version+'.');restError=inspection.restError();
 }catch(e){if(id!==loadId||disposed)return;if(e.name!=='AbortError'){log(e.message);state.error=!model;status('Não foi possível abrir: '+e.message);if(!metadata&&model){release();state.error=true;}}}
 finally{if(id===loadId&&!disposed){state.loading=false;$('[data-load-progress]').hidden=true;sync(true);diagnostics();loop?.reconcile();}}
 }
 function setVfxProfile(profile){narrative?.stop();vfx?.dispose();const Ctor={r2:ShorekeeperVfxR2Director,r3:ShorekeeperVfxR3Director,r4:ShorekeeperVfxR4Director,r5:ShorekeeperVfxR5Director}[profile];if(!Ctor)throw Error('Perfil VFX inválido');vfx=new Ctor(stage.scene,{camera:stage.camera,mobile:matchMedia('(pointer:coarse)').matches||matchMedia('(max-width:768px)').matches,reducedMotion:motion.matches});vfx.bindModel(model);narrative=createVfxNarrative(vfx,stage,{cameraFit:vfx.r5?celestialCameraFitR5:vfx.r4?celestialCameraFit:null,endState:vfx.r5?'OFF':'AMBIENT'});if(director?.state.mode==='SOURCE_REVIEW')setSourceReviewVfxIsolation(vfx,true);$('[data-vfx-profile]').value=profile;}
 function initializeStage(){cancelPreparation('stage-reset');comboCamera?.stop();narrative?.stop();narrative=null;vfx?.dispose();vfx=null;try{stage=createStage(host,{gpuTiming:new URLSearchParams(location.search).get('gpuTiming')==='1',adaptiveDpr:new URLSearchParams(location.search).get('adaptiveDpr')==='1',invalidated:()=>loop?.wake(),resized(){if(vfx?.r5&&stage?.cameraConfig().preset==='celestial')stage.restoreCamera((vfx?.r5?celestialCameraFitR5:celestialCameraFit)({center:vfx.center.toArray(),height:vfx.scale,aspect:stage.camera.aspect,azimuth:Math.atan2(stage.camera.position.x-vfx.center.x,stage.camera.position.z-vfx.center.z)}));},lost(){if(director?.state.mode==='R61_EXPERIMENTAL')director.interrupt();remoteAttempt?.abort();r2Checking=false;libraryGeneration++;libraryLoader.cancel();invalidateComboCache(model);comboCamera?.stop();narrative?.stop();presentationClock.reanchor();cancelPreparation('context-lost');vfx?.setSuspended(true);state.contextLost=true;state.loading=false;loadId++;loader.cancel();last=0;stopSweep();status('Contexto WebGL perdido. Aguardando restauração do navegador.');sync(true);syncVfx();loop?.reconcile();},restored(){state.contextLost=false;state.error=false;last=0;vfx?.setSuspended(vfxPaused||userPaused);stage.resize();status('WebGL restaurado. Confira o modelo e as texturas.');sync(true);syncVfx();loop?.reconcile();}});state.webgl=true;state.contextLost=false;state.error=false;setVfxProfile(new URLSearchParams(location.search).get('vfx')??'r5');if(model)stage.adopt(model);stage.renderer.debug.onShaderError=()=>{log('Falha de compilação de material no WebGL.');status('Erro de shader: consulte o diagnóstico.');};visuals();}catch(e){state.webgl=false;state.error=true;log(e.message);status(e.message);}sync(true);diagnostics();}
 function report(){return {schema:'shorekeeper-inspection/1.8',presenceVersion:'2.0-b.3',route:'/experimentos/sk/',revision:root.dataset.revision,branch:root.dataset.branch,exportedAt:new Date().toISOString(),model:metadata,state:phase(),loadSequence:loadId,renderLoop:loop?.state??null,presentationClock:presentationClock.state,frameMetrics:frameMetrics.report(),renderMetrics:renderMetrics.report(),comboPreparation:{...preparationReport},mouthGeometry:mouthQA?($('[data-mouth-geometry]')?.value??null):($('[data-approved-geometry]')?.value??null),facialR6:facialR6?face?.report?.()??null:null,ownership:{body:model?bodyOwner(model):null,camera:stage?cameraOwner(stage):null},camera:stage?.cameraConfig()??null,morphs:inspection?{...inspection.weights}:{},bonesAltered:inspection?Object.fromEntries(inspection.offsets):{},animation:director?.state??null,requestedParameters:settings(),animationLibraries:[...animationLibraries],originalAnimation:{id:control('originalIdle').value,layer:control('originalLayer').value,mode:control('originalIdle').value==='legacy'?'LEGACY':control('originalMode').value==='expressive'?'EXPRESSIVE_ACTING':'REFERENCE_QA',facial:face?.state??null,expressionCapabilities:face?Object.fromEntries(Object.keys(EXPRESSION_LIBRARY).map(id=>[id,face.support(id)])):null,scheduler:scheduler?.state??null,visualQA:'PENDING'},returnError:restError,visuals:Object.fromEntries(['materials','background','light','dpr','fps'].map(k=>[k,control(k).value])),overlays:Object.fromEntries(['wireframe','skeleton','axes','culling'].map(k=>[k,control(k).checked])),counts:inspection?.summary()??null,observed,renderer:stage?.info()??null,vfx:vfx?.report()??null,narrative:narrative?.state??null,lastDisposal:releaseCounts,browser:{userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],devicePixelRatio:devicePixelRatio||1,reducedMotion:motion.matches},notes:$('[data-notes]').value,flags,errors,warnings,visualQA:'PENDING_HUMAN_REVIEW'};}
 function save(data,name,type='application/json'){const blob=data instanceof Blob?data:new Blob([JSON.stringify(data,null,2)],{type}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function config(){const r=report();return {schema:r.schema,modelSha256:metadata?.sha256,camera:r.camera,morphs:r.morphs,bones:r.bonesAltered,animation:r.requestedParameters,speed:Number(control('speed').value),visuals:r.visuals,overlays:r.overlays};}
 function diagnostics(){const r=report();const f=face?.state,id=f?.id,preset=EXPRESSION_LIBRARY[id];$('[data-expression-state]').textContent=!inspection?'Selecione o modelo local.':control('originalMode').value!=='expressive'?'Reference QA · atuação facial desativada.':userPaused?'Atuação pausada.':f?.busy?((preset?.label??'Repouso')+(f.blink>0?' · piscada bilateral':'')+' · '+({entry:'entrada',hold:'presença',exit:'retorno',idle:'repouso'}[f.phase])):'Repouso · escolha um pequeno gesto.';for(const b of all('[data-expression][aria-pressed]'))b.setAttribute('aria-pressed',String(f?.busy&&b.dataset.expression===id));$('[data-sk-diagnostics]').textContent=JSON.stringify({state:r.state,counts:r.counts,observed:r.observed,renderer:r.renderer,mixer:r.animation,lastDisposal:r.lastDisposal,errors,warnings},null,2);$('[data-readout="fps"]').textContent='FPS '+(observed.fps??'—')+' · '+(observed.frameTimeMs??'—')+' ms';$('[data-readout="counts"]').textContent=inspection?inspection.bones.length+' bones · '+inspection.summary().morphs+' morphs':'Sem modelo';}
 function run(){if(control('originalIdle').value!=='legacy'){stopSweep();if(control('originalMode').value==='reference'){face?.reset();if(!facialR6)inspection?.preset({});syncFace();}}if(!permissions(phase(),!!director).play)return;if(inspection.offsets.size&&director.state.phase==='idle'){director.dispose();inspection.restore();buildDirector();showBone();status('Offsets manuais restaurados para executar o gesto na referência original.');}userPaused=false;director.setPaused(false);face?.setPaused(false);scheduler?.setPaused(false);director.start();sync(true);}
 on($('[data-sk-file]'),'change',e=>{manualFileChosen=true;remoteAttempt?.abort();load(e.target.files?.[0]);e.target.value='';});
 on(action('rememberPrivate'),'click',async()=>{
  const file=activePrivateFile,sha=metadata?.sha256;if(!file||!sha||state.loading)return;
  action('rememberPrivate').disabled=true;privateStatus('Guardando GLB somente neste navegador…');
  try{const saved=await savePrivateModel(file,sha);if(disposed)return;cachedPrivateSha=saved.sha256;privateStatus('Guardado neste navegador: '+saved.filename+' · '+(saved.bytes/1e6).toFixed(1)+' MB. Nenhum envio ao servidor.');}
  catch(e){if(!disposed)privateStatus('Não foi possível guardar: '+e.message+' Selecione o GLB normalmente nas próximas visitas.');}
  if(!disposed)syncPrivateButtons();
 });
 on(action('forgetPrivate'),'click',async()=>{
  action('forgetPrivate').disabled=true;
  try{await forgetPrivateModel();if(disposed)return;cachedPrivateSha=null;privateStatus('Cópia privada apagada deste navegador. O modelo em execução permanece até fechar a página.');}
  catch(e){if(!disposed)privateStatus('Não foi possível apagar a cópia local: '+e.message);}
  if(!disposed)syncPrivateButtons();
 });
 on(action('cancel'),'click',()=>{cancelPreparation('load-cancel');remoteAttempt?.abort();loadId++;loader.cancel();libraryGeneration++;libraryLoader.cancel();state.loading=false;$('[data-load-progress]').hidden=true;status('Leitura cancelada; o modelo anterior foi mantido.');sync(true);loop?.reconcile();});
 on(action('retry'),'click',()=>{cancelPreparation('retry');remoteAttempt?.abort();loadId++;loader.cancel();libraryGeneration++;libraryLoader.cancel();r2Checking=false;state.loading=false;stage?.dispose();stage=null;initializeStage();last=0;loop?.reconcile();});
 on(action('panel'),'click',()=>{const collapsed=root.dataset.panelCollapsed!=='true';root.dataset.panelCollapsed=String(collapsed);action('panel').setAttribute('aria-expanded',String(!collapsed));stage?.resize();});
 on(control('panelWidth'),'input',()=>root.style.setProperty('--panel-width',control('panelWidth').value+'px'));
 for(const b of all('[data-tab]'))on(b,'click',()=>{for(const tab of all('[data-tab]')){tab.setAttribute('aria-selected',String(tab===b));tab.tabIndex=tab===b?0:-1;}for(const pane of all('[data-pane][role=tabpanel]'))pane.hidden=pane.dataset.pane!==b.dataset.tab;});
 for(const b of all('[data-tab]'))on(b,'keydown',e=>{const tabs=all('[data-tab]'),i=tabs.indexOf(b);let next;if(e.key==='ArrowRight')next=tabs[(i+1)%tabs.length];if(e.key==='ArrowLeft')next=tabs[(i+tabs.length-1)%tabs.length];if(e.key==='Home')next=tabs[0];if(e.key==='End')next=tabs.at(-1);if(next){e.preventDefault();next.click();next.focus();}});
 for(const b of all('[data-view]'))on(b,'click',()=>{if(!permissions(phase()).inspect)return;stopCameraOwners();stage.view(b.dataset.view);for(const el of all('[data-view]'))el.setAttribute('aria-pressed',String(el===b));});
 on(control('boneSearch'),'input',fillBones);on(control('bone'),'change',()=>{selected=inspection?.bones.find(b=>b.name===control('bone').value);showBone();sync(true);});
 for(const el of all('[data-bone-axis]'))on(el,'input',()=>{if(phase()!=='ready'||!selected)return;inspection.rotate(selected,all('[data-bone-axis]').map(x=>Number(x.value)));showBone();});
 on(control('rigreset'),'click',restoreRig);
 for(const b of all('[data-rig-preset]'))on(b,'click',()=>{if(phase()!=='ready')return;const patterns={head:/Head/,arm:/LUpperArm|LArm/,hair:/Bone_Hair/};const bone=inspection.bones.find(x=>patterns[b.dataset.rigPreset].test(x.name));if(!bone){warn('Preset indisponível neste rig.');return;}inspection.rotate(bone,b.dataset.rigPreset==='head'?[0,10,0]:[5,0,0]);selected=bone;fillBones();showBone();sync(true);});
 for(const n of ['skeleton','axes','wireframe','culling','materials','background','light','dpr'])on(control(n),n==='light'?'input':'change',visuals);
 on(control('morphGroup'),'change',fillMorphs);on(control('morph'),'change',syncFace);
 on(control('morphWeight'),'input',()=>{if(!inspection||facialR6)return;const value=Number(control('morphWeight').value);stopSweep();inspection.setMorph(control('morph').value,value);syncFace();});
 on($('[data-morph="E_Close"]'),'input',e=>{if(facialR6)return;const value=Number(e.target.value);stopSweep();inspection?.setMorph('E_Close',value);syncFace();});
 for(const [c,positive,negative] of [['gazeX','Pupil_R','Pupil_L'],['gazeY','Pupil_Up','Pupil_Down']])on(control(c),'input',()=>{if(!inspection||facialR6)return;const value=Number(control(c).value);stopSweep();inspection.setMorph(positive,Math.max(0,value));inspection.setMorph(negative,Math.max(0,-value));syncFace();});
 for(const b of all('[data-preset]'))on(b,'click',()=>{if(facialR6||!permissions(phase()).inspect)return;stopSweep();inspection.preset(FACE_PRESETS[b.dataset.preset]);syncFace();const missing=Object.keys(FACE_PRESETS[b.dataset.preset]).filter(n=>!inspection.names.includes(n));status(missing.length?'Preset parcial: morphs ausentes '+missing.join(', '):'Preset aplicado. Confira visualmente o resultado.');});
 on(action('customPreset'),'click',()=>{try{const values=JSON.parse($('[data-preset-config]').value);if(!values||Array.isArray(values)||typeof values!=='object'||Object.values(values).some(x=>!Number.isFinite(x)||x<0||x>1))throw Error('Use um objeto com pesos entre 0 e 1.');const unknown=Object.keys(values).filter(n=>!inspection.names.includes(n));if(unknown.length)throw Error('Morphs ausentes: '+unknown.join(', '));stopSweep();inspection.preset(values);syncFace();}catch(e){warn(e.message);}});
 on(action('sweep'),'click',()=>{if(facialR6||!inspection?.names.includes('E_Close'))return;stopSweep();sweep={index:0,previous:inspection.weights.E_Close??0};inspection.setMorph('E_Close',0);sweepLast=performance.now();syncFace();sync(true);status('Teste bilateral: 0, 0.25, 0.5, 0.75 e 1. Ao terminar, restaura o peso anterior.');});on(action('stopSweep'),'click',()=>stopSweep());
 async function importPrivateLibraries(files,source='local'){cancelPreparation('libraries-change');
 const token=++libraryGeneration;libraryLoader.cancel();invalidateComboCache(model);
 try{
  if(source==='local'){if(phase()!=='ready'||files.length>4)throw Error('Adicione até quatro bibliotecas locais em repouso.');}
  if((phase()!=='ready'&&source!=='r2')||files.length>12)throw Error('Adicione até quatro bibliotecas em repouso; interrompa a animação antes de carregar.');
  state.loading=true;sync(true);status('Lendo biblioteca local de animações…');
  for(const file of files){
   const result=await libraryLoader.load(file);if(!result)return;if(token!==libraryGeneration||disposed||state.contextLost){disposeObject(result.gltf.scene);return;}
   try{const clips=result.json.asset?.extras?.skCombatLibrary==='2.1-c'?validateCombatLibrary(T,model,result):validateOriginalLibrary(T,model,result);director?.dispose();director=null;inspection.restore();const originalBursts=clips.filter(c=>BURST_ORIGINAL_IDS.includes(c.name));const rebased=originalBursts.map(c=>createRebasedBurstClip(T,model,c));const rootOwned=originalBursts.map(c=>createBindRootBurstClip(T,model,c));const allClips=[...clips,...rebased.map(row=>row.clip),...rootOwned.map(row=>row.clip)];for(const row of rebased)log('CL.1 QA · '+row.diagnostic.source+' · Root delta '+row.diagnostic.bindDeltaDegrees+'° · reancorada disponível.','warning');for(const row of rootOwned)log('CL.1.1 QA · '+row.diagnostic.source+' · Root no bind · variante opcional para A/B, sem aprovação visual.','warning');const incoming=new Set(allClips.map(c=>c.name));model.userData.skClips=[...model.userData.skClips.filter(c=>!incoming.has(c.name)),...allClips];if(!animationLibraries.some(x=>x.sha256===result.sha256))animationLibraries.push({file:file.name,sha256:result.sha256,clips:allClips.map(c=>c.name)});if(animationLibraries.length>9)animationLibraries.shift();if(control('originalIdle').value==='legacy'){const ids=control('presentationMode').value==='combat'?COMBAT_CLIP_IDS:ORIGINAL_IDLE_IDS;control('originalIdle').value=ids.find(id=>model.userData.skClips.some(c=>c.name===id))??'legacy';}buildDirector();}
   finally{disposeObject(result.gltf.scene);}
  }
  const available=ORIGINAL_IDLE_IDS.filter(id=>findOriginalClip(model.userData.skClips,id));$('[data-original-availability]').textContent='Disponíveis: '+available.join(', ')+'. Arquivos lidos localmente; QA visual pendente.';status('Bibliotecas privadas adicionadas. Habilidades aéreas e ataques longos podem deslocar a personagem: mantenha câmera aberta e avalie a recuperação. QA visual pendente.');sync(true);
 }catch(err){if(token===libraryGeneration){warn(err.message);if(!director&&model)buildDirector();}}finally{if(token===libraryGeneration){state.loading=false;sync(true);loop?.reconcile();}}
 }
 async function recheckR2AndLoad(){
  if(disposed||!state.webgl||state.contextLost||state.loading||r2Checking||(model&&phase()!=='ready'))return;
  remoteAttempt?.abort();remoteAttempt=new AbortController();const signal=remoteAttempt.signal;
  r2Checking=true;r2Connection='checking';r2HttpStatus=null;syncR2LibraryPanel();
  try{
   const check=await inspectPrivateManifest({signal});
   if(disposed||signal.aborted)return;
   r2Connection=check.state;r2HttpStatus=check.httpStatus;r2Manifest=check.manifest;syncR2LibraryPanel();
   if(!check.manifest)return;
   const manifest=check.manifest;
   if(model&&metadata?.sha256!==manifest.model.sha256){
    privateStatus('Modelo local diferente do manifesto privado. Não será substituído automaticamente.');return;
   }
   if(!model){
    privateStatus('Baixando modelo canônico autenticado…');
    const file=await getPrivateFile(manifest.model,{signal});if(disposed||signal.aborted)return;
    await load(file,'r2');if(disposed||signal.aborted)return;
   }
   if(!model||metadata?.sha256!==manifest.model.sha256){
    privateStatus('Modelo privado não foi validado; bibliotecas não carregadas.');return;
   }
   if(phase()!=='ready'){
    privateStatus('Interrompa a animação antes de carregar bibliotecas privadas.');return;
   }
   const coverage=summarizePrivateCombat(manifest,model.userData.skClips);
   const required=new Set(manifest.libraries.filter(entry=>
     !animationLibraries.some(lib=>lib.sha256===entry.sha256)||
     coverage.rows.some(row=>row.id===entry.id&&!row.ready)
   ).map(entry=>entry.id));
   const files=[];
   for(const entry of manifest.libraries){
    if(disposed||signal.aborted)return;
    if(!required.has(entry.id))continue;
    privateStatus('Validando biblioteca privada '+entry.id+'…');
    try{files.push(await getPrivateFile(entry,{kind:'library',signal}));}
    catch(e){if(!signal.aborted)log('R2 · '+entry.id+': '+e.message,'warning');}
   }
   if(files.length&&!disposed&&!signal.aborted)await importPrivateLibraries(files,'r2');
   if(disposed||signal.aborted)return;
   const final=summarizePrivateCombat(manifest,model?.userData.skClips);
   privateStatus(final.allLoaded?'Acervo privado verificado: 10/10 animações originais disponíveis.':'R2 conferido. Disponíveis '+final.loaded+'/'+final.total+' clipes; confira as bibliotecas faltantes.');
  }catch(e){
   if(!signal.aborted&&!disposed){
    log('R2: '+e.message,'warning');
    privateStatus('Não foi possível validar o acervo privado. Acesso e arquivos existentes não foram modificados.');
   }
  }finally{r2Checking=false;if(!disposed){syncR2LibraryPanel();sync(true);loop?.reconcile();}}
 }
 on($('[data-r2-recheck]'),'click',()=>{void recheckR2AndLoad();});
 on($('[data-r2-audit]'),'click',async()=>{
  const button=$('[data-r2-audit]'),state=$('[data-r2-audit-status]'),container=$('[data-r2-audit-results]');
  if(button.disabled)return;
  button.disabled=true;state.textContent='Conferindo Access, binding, manifesto e objetos…';container.replaceChildren();
  try{
   const response=await fetch('/api/shorekeeper/diagnostics',{
    credentials:'same-origin',cache:'no-store',headers:{Accept:'application/json'},signal:lifetime.signal
   });
   let data=null;try{data=await response.json();}catch{}
   const code=data?.state;
   let message;
   if(response.status===403){
    const reasons=Object.freeze({
     token_missing:'403: a Function não recebeu o token Access. Confira se esta URL de prévia está protegida pela própria aplicação Access e se o navegador está usando a mesma origem autenticada.',
     audience_mismatch:'403: AUD diferente. Em Zero Trust → Access → Applications, abra a aplicação que protege ESTA prévia, copie o Application Audience (AUD) Tag e confira o valor de SK_ACCESS_AUD no Pages Preview.',
     issuer_mismatch:'403: domínio de equipe divergente. Confira SK_ACCESS_TEAM_DOMAIN; use o endereço completo https://sua-equipe.cloudflareaccess.com sem barra final.',
     token_expired:'403: a sessão Access expirou. Faça login novamente na prévia e tente outra vez.',
     token_not_yet_valid:'403: o token ainda não é válido. Verifique a configuração Access e tente autenticar novamente.',
     team_domain_format_invalid:'403: SK_ACCESS_TEAM_DOMAIN está em formato inválido. Em Pages → Settings → Variables and secrets → Preview, use https://sua-equipe.cloudflareaccess.com (sem aspas, espaços ou barra final).',
     audience_format_invalid:'403: SK_ACCESS_AUD está em formato inválido. Copie somente o Application Audience (AUD) Tag da aplicação Access desta prévia; não use o nome da policy, ID de conta, aspas ou prefixos.',
     access_configuration_invalid:'403: formato inválido de SK_ACCESS_TEAM_DOMAIN ou SK_ACCESS_AUD na configuração do Pages Preview.',
     token_unreadable:'403: token Access ausente ou incompatível com JWT. Reabra a prévia pela URL protegida e autentique-se novamente.',
     signature_or_public_key_failed:'403: verificação criptográfica falhou. Tente o diagnóstico mais recente; a assinatura continua obrigatória.',
     certificates_fetch_failed:'403: o Pages não conseguiu consultar os certificados públicos do Cloudflare Access. Confira a disponibilidade do Team Domain e o endpoint /cdn-cgi/access/certs.',
     certificates_endpoint_unavailable:'403: o servidor de certificados da equipe não respondeu com sucesso. Abra no navegador o Team Domain seguido de /cdn-cgi/access/certs, sem compartilhar o conteúdo.',
     certificates_response_invalid:'403: o endpoint do Cloudflare Access não retornou a lista de chaves públicas esperada. Confira o Team Domain da equipe.',
     signing_key_not_found:'403: a chave pública correspondente ao token não foi encontrada. Pode haver rotação de chaves ou token de outra equipe; saia e entre novamente na aplicação Access desta prévia.',
     signing_key_invalid:'403: o certificado encontrado não é uma chave RSA válida para este verificador. Confira a aplicação e o domínio da equipe.',
     public_key_import_failed:'403: a chave pública foi encontrada, mas não pôde ser importada no runtime. O problema é provavelmente técnico, não do R2.',
     signature_invalid:'403: a assinatura não corresponde à chave pública encontrada. Autentique-se novamente na aplicação Access que protege esta prévia; não desative a validação.',
     signature_verification_failed:'403: o runtime falhou ao executar a verificação RS256. Necessária correção técnica do verificador.',
     signature_valid_but_primary_check_failed:'403: o diagnóstico conseguiu verificar a assinatura; o verificador principal rejeitou o mesmo token. Problema técnico interno, não configuração do R2.',
     signing_diagnostic_unavailable:'403: não foi possível concluir o diagnóstico criptográfico. Confira o Team Domain e o AUD.',
     token_header_invalid:'403: cabeçalho do token incompatível com assinatura RS256 do Cloudflare Access.',
    });
    message=reasons[data?.reason]??'403: a Function rejeitou a autorização. Confira o AUD e o Team Domain da aplicação Access desta prévia.';
   }
   else if(code==='private_access_config_unavailable')message='503: falta SK_ACCESS_TEAM_DOMAIN ou SK_ACCESS_AUD na configuração do Pages desta prévia.';
   else if(code==='pages_r2_binding_missing')message='503: falta o binding SHOREKEEPER_ASSETS_R2 no ambiente Preview do projeto Pages kaue.';
   else if(code==='manifest_invalid_or_r2_error')message='503: falha ao ler/validar o manifesto R2. Confira JSON, esquema e integridade do bucket.';
   else if(!response.ok)message='HTTP '+response.status+': o diagnóstico não conseguiu consultar o R2. Confira a implantação atual.';
   else if(code!=='verified'||!data.inspection)message='Resposta do diagnóstico incompatível. Confira o deploy mais recente.';
   else if(data.inspection.state==='manifest_missing')message='404 no R2: falta characters/shorekeeper/manifests/current.json no bucket configurado.';
   else if(data.inspection.allPresent)message='R2: manifesto e quatro objetos presentes, com tamanhos correspondentes. Falta validar o carregamento e a reprodução.';
   else message='Manifesto encontrado; pelo menos um GLB está ausente ou tem tamanho divergente no caminho esperado.';
   state.textContent=message;
   if(data?.inspection?.state!=='manifest_missing'&&data?.inspection&&Array.isArray(data.inspection.libraries)){
    const x=data.inspection;
    const entries=[{label:'Modelo canônico',state:x.model},...x.libraries.map(item=>({label:'Biblioteca '+item.id,state:item.state}))];
    for(const entry of entries){
     const paragraph=document.createElement('p');paragraph.className='sk-help';paragraph.setAttribute('role','listitem');
     const title=document.createElement('strong');title.textContent=entry.label;
     const label=entry.state==='present'?'encontrado':entry.state==='missing'?'ausente':entry.state==='size_mismatch'?'tamanho divergente':'não conferido';
     paragraph.append(title,document.createTextNode(' — '+label));container.append(paragraph);
    }
   }
  }catch(e){if(!lifetime.signal.aborted)state.textContent='Falha de rede ao acessar o diagnóstico privado. Tente novamente após autenticar-se no Access.';}
  finally{if(!disposed)button.disabled=false;}
 });
 for(const button of all('[data-r2-quick-burst]'))on(button,'click',()=>{
  if(button.disabled||!model||metadata?.sha256!==SHOREKEEPER_CANONICAL.sha256)return;
  if(phase()==='animating'&&control('presentationMode').value==='contemplation'){
   scheduler?.setEnabled(false);control('actingAuto').checked=false;
   director?.dispose();director=null;face?.reset();
  }
  if(phase()!=='ready')return;
  const id=button.dataset.r2QuickBurst;
  if(!['SK_BURST_01_ORIGINAL','SK_BURST_02_ORIGINAL'].includes(id)||!model.userData.skClips.some(c=>c.name===id))return;
  cancelPreparation('manual-burst');narrative?.stop();scheduler?.setEnabled(false);control('actingAuto').checked=false;
  control('presentationMode').value='combat';control('presentationMode').dispatchEvent(new Event('change'));
  control('originalIdle').value=id;control('originalIdle').dispatchEvent(new Event('change'));
  if(director){status(id+' · animação original sem sincronização VFX automática.');run();}
  sync(true);
 });
 on($('[data-original-file]'),'change',e=>{const files=[...(e.target.files??[])];e.target.value='';void importPrivateLibraries(files);});
 on(control('presentationMode'),'change',()=>{cancelPreparation('mode-change');if(!director&&model)buildDirector();if(!inspection||phase()!=='ready')return;const combat=control('presentationMode').value==='combat';scheduler?.setEnabled(false);control('actingAuto').checked=false;control('originalMode').value=combat?'reference':'expressive';face?.reset();const ids=combat?COMBAT_CLIP_IDS:ORIGINAL_IDLE_IDS;control('originalIdle').value=ids.find(id=>model.userData.skClips.some(c=>c.name===id))??'legacy';control('originalIdle').dispatchEvent(new Event('change'));status(combat?'Combate experimental: selecione as bibliotecas privadas para testar os ataques.':'Contemplação selecionada.');sync(true);});
 for(const c of ['originalIdle','originalLayer'])on(control(c),'change',()=>{if(!inspection||phase()!=='ready')return;stopSweep();scheduler?.setEnabled(false);control('actingAuto').checked=false;director?.dispose();director=null;inspection.restore();if(control('originalMode').value==='reference'){face?.reset();if(!facialR6)inspection.preset({});syncFace();}buildDirector();showBone();sync(true);status(director?(control('originalIdle').value==='legacy'?'Gesto F1.6 selecionado.':(control('originalMode').value==='expressive'?'Expressive Acting selecionado.':'Reference QA: reprodução sem atuação facial adicional.')): 'Animação selecionada indisponível neste arquivo.');});
 on(control('originalMode'),'change',()=>{cancelPreparation('mode-change');if(!director&&model)buildDirector();comboCamera?.stop();narrative?.stop();if(!inspection||!permissions(phase()).inspect)return;stopSweep();scheduler?.setEnabled(false);control('actingAuto').checked=false;face?.reset();if(!facialR6)inspection.preset({});syncFace();status(control('originalMode').value==='reference'?'Reference QA: rosto neutro; o movimento corporal continua.':'Expressive Acting: escolha uma expressão ou ative a contemplação.');sync(true);diagnostics();});
 on(control('actingAuto'),'change',()=>{if(!inspection||control('originalMode').value!=='expressive')return;scheduler?.setEnabled(!facialR6&&control('actingAuto').checked&&!motion.matches);sync(true);});
 for(const b of all('[data-facial-candidate]'))on(b,'click',()=>{
  if(b.disabled||!inspection||control('presentationMode').value!=='contemplation'||control('originalMode').value!=='expressive')return;
  const id=b.dataset.facialCandidate;
  if(face?.triggerQA(id)){
   const label=id==='NEUTRAL'?'Retornando ao neutro':id.replaceAll('_',' ')+' · teste visual manual, não aprovado';
   $('[data-facial-state]').textContent=label;
   status(label);
   sync(true);
  }
 });
 for(const b of all('[data-facial-camera]'))on(b,'click',()=>{
  if(!b.disabled&&stage){stopCameraOwners();stage.view(b.dataset.facialCamera);}
 });
 on($('[data-facial-capture]'),'click',async()=>{
  if(!model||!stage)return;
  try{save(await stage.capture(),'shorekeeper-facial-test-PRIVATE.png','image/png');}
  catch(e){warn(e.message);}
 });
 on($('[data-mouth-geometry]'),'change',e=>{if(mouthAllowed()){setMouthGeometry(e.target.value);sync(true);}});
 const sourceReviewEnabled=new URLSearchParams(location.search).get('sourceQA')==='1';
 $('[data-source-review]').hidden=!sourceReviewEnabled;
 on($('[data-source-play]'),'click',()=>{
  if(!sourceReviewEnabled||!model||metadata?.sha256!==SHOREKEEPER_CANONICAL.sha256||state.loading||state.contextLost||preparation)return;
  const id=$('[data-source-id]').value,variant=$('[data-source-variant]').value;
  const original=model.userData.skClips.find(c=>c.name===id);
  if(!original){status('Fonte ausente. Carregue as bibliotecas privadas autenticadas.');return;}
  if(variant!=='ORIGINAL'&&!BURST_ORIGINAL_IDS.includes(id)){status('A/B/C disponível apenas para Bursts; selecione ORIGINAL neste candidato.');return;}
  try{
   cancelPreparation('source-review');stopCameraOwners();stopSweep();scheduler?.setEnabled(false);control('actingAuto').checked=false;
   director?.dispose();director=null;face?.reset();inspection.restore();vfx?.setState('OFF');
   const clip=variant==='ORIGINAL'?original:variant==='REBASED'?createRebasedBurstClip(T,model,original).clip:createBindRootBurstClip(T,model,original).clip;
   control('presentationMode').value='combat';control('originalMode').value='reference';control('originalIdle').value=id;
   director=createSourceReviewDirector(T,model,clip,{onEvent:e=>{face?.onAnimationEvent(e);scheduler?.onEvent(e);}});
   presentationClock.reset();userPaused=false;director.start();setSourceReviewVfxIsolation(vfx,true);
   status(id+' · '+variant+' · QA manual, identidade canônica pendente. Câmera mantida; VFX OFF; endpoint original sem pouso sintetizado.');
   sync(true);stage.invalidate();
  }catch(e){warn(e.message);if(!director)buildDirector();}
 });
 on($('[data-source-seek]'),'input',e=>{
  if(director?.state.mode!=='SOURCE_REVIEW')return;
  const t=Number(e.target.value)*director.state.duration;director.seek(t);presentationClock.seek(t);last=0;stage.invalidate();
 });

 // R6.1: opt-in authorial cinematic presentation; no invented PSA markers.
 const r61Enabled=new URLSearchParams(location.search).get('r61')==='1';
 $('[data-r61-preview]').hidden=!r61Enabled;
 on($('[data-r61-start]'),'click',()=>{
  if(!r61Enabled||!model||!stage||metadata?.sha256!==SHOREKEEPER_CANONICAL.sha256||
     state.loading||state.contextLost||preparation)return;
  try{
   cancelPreparation('r61-stage');stopCameraOwners();stopSweep();
   scheduler?.setEnabled(false);control('actingAuto').checked=false;
   director?.dispose();director=null;setSourceReviewVfxIsolation(vfx,false);
   face?.reset();inspection.restore();narrative?.stop();
   const wantCamera=$('[data-r61-camera]').checked&&!motion.matches;
   director=createR61Director(T,model,model.userData.skClips??[],stage,{
    getVfx:()=>vfx,camera:wantCamera,
    onEvent:e=>{face?.onAnimationEvent(e);scheduler?.onEvent(e);}
   });
   control('presentationMode').value='combat';control('originalMode').value='reference';
   control('originalIdle').value='SK_BURST_02_ORIGINAL';
   presentationClock.reset();presentationClock.setSpeed(Number(control('speed').value));
   userPaused=false;director.start();
   status('R6.1 experimental: 3 BA → candidato HA → candidato RS → Burst02 → campo Outer autoral → Idle. B1 não certificada.');
   $('[data-r61-time]').textContent='Ciclo iniciado · fonte original, cinematografia autoral · sourceFrame PSA indisponível.';
   sync(true);stage.invalidate();
  }catch(e){warn('R6.1: '+e.message);director?.dispose();director=null;if(model)buildDirector();sync(true);}
 });
 on($('[data-r61-seek]'),'input',e=>{
  if(director?.state.mode!=='R61_EXPERIMENTAL'||state.contextLost)return;
  try{
   const t=Number(e.target.value)*director.state.duration;
   director.seek(t);presentationClock.seek(t);last=0;stage.invalidate();
  }catch(error){warn('Seek R6.1: '+error.message);}
 });
 $('[data-combo-qa]').hidden=new URLSearchParams(location.search).get('comboQA')!=='1';
 $('[data-vfx-r2]').hidden=new URLSearchParams(location.search).get('vfxQA')!=='1';
 $('[data-mouth-qa]').hidden=!mouthQA||facialR6;
 $('[data-facial-qa]').hidden=!facialQA||mouthQA;
 const mouthAllowed=()=>mouthQA&&!!mouthIsolation&&!state.contextLost&&!state.loading&&control('presentationMode').value==='contemplation'&&control('originalMode').value==='expressive'&&!userPaused;
 for(const b of all('[data-mouth-probe]'))on(b,'click',()=>{
  if(facialR6||!mouthAllowed())return;const amount=Number($('[data-mouth-weight]').value),id=b.dataset.mouthProbe;
  if(id==='NEUTRAL'||amount===0)face.triggerQA('NEUTRAL');else{face.setIntensity(amount);face.triggerQA(id);}
  $('[data-mouth-state]').textContent=id+' · '+amount+' · controle de base, sem aprovação visual';sync(true);
 });
 for(const el of all('[data-mouth-component], [data-mouth-flat]'))on(el,'change',()=>{if(!mouthAllowed())return;try{mouthIsolation.select($('[data-mouth-component]').value,{flat:$('[data-mouth-flat]').checked});}catch(e){warn(e.message);}});
 for(const b of all('[data-mouth-view]'))on(b,'click',()=>{
  if(!mouthAllowed())return;stopCameraOwners();mouthIsolation.restore();$('[data-mouth-component]').value='all';$('[data-mouth-flat]').checked=false;
  const m=model.getObjectByName('Shorekeeper_Face'),g=m.geometry,p=g.attributes.position,ids=mouthIsolation.components[mouthIsolation.contour],box=new T.Box3();
  if(b.dataset.mouthView.startsWith('mouth')&&ids){box.min.fromArray(ids.bounds.min);box.max.fromArray(ids.bounds.max);}else box.setFromBufferAttribute(p);
  const target=box.getCenter(new T.Vector3());m.localToWorld(target);const quarter=b.dataset.mouthView.endsWith('quarter'),profile=b.dataset.mouthView.endsWith('profile'),distance=b.dataset.mouthView.startsWith('mouth')?.09:.34,a=profile?Math.PI/2:quarter?Math.PI/4:0;
  stage.orbit.minDistance=.025;stage.restoreCamera({position:[target.x+Math.sin(a)*distance,target.y,target.z+Math.cos(a)*distance],target:target.toArray(),preset:'mouth-qa-'+b.dataset.mouthView});
 });
 on($('[data-mouth-restore]'),'click',()=>{mouthIsolation?.restore();$('[data-mouth-component]').value='all';$('[data-mouth-flat]').checked=false;face?.triggerQA('NEUTRAL');});
 on($('[data-mouth-export]'),'click',()=>{if(!mouthAllowed())return;save({model:metadata,inventory:facialGeometryInventory(model),isolation:mouthIsolation.mode,weld:mouthWeld?{report:mouthWeld.report,lift:mouthWeld.lift,linerVertices:mouthWeld.linerVertices}:null,face:face.state,camera:stage.cameraConfig(),renderer:stage.info(),visualQA:'B_VISUAL_QA_PENDING'},'shorekeeper-mouth-forensics-PRIVATE.json');});
 on($('[data-mouth-reference]'),'change',e=>{const f=e.target.files?.[0];if(referenceUrl)URL.revokeObjectURL(referenceUrl);referenceUrl=null;if(f?.type==='image/gif'){referenceUrl=URL.createObjectURL(f);$('[data-mouth-reference-image]').src=referenceUrl;$('[data-mouth-reference-image]').hidden=false;}});
 on($('[data-mouth-capture]'),'click',async()=>{if(!mouthAllowed())return;try{save(await stage.capture(),'shorekeeper-mouth-PRIVATE.png','image/png');}catch(e){warn(e.message);}});
 on($('[data-approved-geometry]'),'change',e=>{
  if(!model||metadata?.sha256!==SHOREKEEPER_CANONICAL.sha256||mouthQA||state.contextLost||userPaused||control('presentationMode').value==='combat')return;
  const mode=e.target.value;if(!['canonical','r4','r5'].includes(mode))return;
  try{
   face?.reset();scheduler?.setEnabled(false);control('actingAuto').checked=false;
   setMouthGeometry(mode);
   const url=new URL(location.href);if(mode==='canonical')url.searchParams.delete('approvedGeometry');else url.searchParams.set('approvedGeometry',mode);
   history.replaceState(null,'',url);
   $('[data-approved-status]').textContent='Contorno '+mode+' selecionado · confira a fidelidade dos sorrisos.';
   sync(true);loop?.wake();
  }catch(err){warn(err.message);}
 });
 for(const button of all('[data-approved-expression]'))on(button,'click',()=>{
  if(button.disabled||!model||!face||metadata?.sha256!==SHOREKEEPER_CANONICAL.sha256||mouthQA||control('presentationMode').value==='combat'||userPaused)return;
  const id=button.dataset.approvedExpression;
  if(id!=='NEUTRAL'&&!isApprovedManualGesture(id))return;
  scheduler?.setEnabled(false);control('actingAuto').checked=false;
  if(id!=='NEUTRAL'){face.setIntensity(1);control('expressionIntensity').value='1';$('[data-value="expressionIntensity"]').textContent='100%';}
  const ok=face.triggerQA(id);
  const message=ok?(id==='NEUTRAL'?'Retorno ao repouso facial.':'Expressão manual '+button.textContent+' · retorno ao neutro; verificar perfil geométrico.'):'Expressão não suportada por este GLB.';
  $('[data-approved-status]').textContent=message;status(message);sync(true);loop?.wake();
 });
 bindExpressionButtons(all('[data-expression]'),{face:()=>face,allowed:()=>!facialR6&&!!inspection&&permissions(phase()).inspect&&control('originalMode').value==='expressive',signal:lifetime.signal,onTrigger:id=>{status(id==='blink'?'Piscada bilateral.':EXPRESSION_LIBRARY[id].label+' · retorno automático ao repouso.');diagnostics();sync(true);}});
 on(control('expressionIntensity'),'input',()=>{const v=Number(control('expressionIntensity').value);face?.setIntensity(v);$('[data-value="expressionIntensity"]').textContent=Math.round(v*100)+'%';});
 for(const a of ['play','repeat'])on(action(a),'click',run);
 on(action('interrupt'),'click',()=>{cancelPreparation('interrupt');if(!director&&model)buildDirector();comboCamera?.stop();if(!inspection)return;scheduler?.setEnabled(false);control('actingAuto').checked=false;face?.trigger('neutral');userPaused=false;director?.setPaused(false);face?.setPaused(false);scheduler?.setPaused(false);director?.interrupt();sync(true);});
 on(action('pause'),'click',()=>{if(!inspection)return;userPaused=!userPaused;last=0;metricsStart=0;frames=0;frameMs=0;renderFrameMs=0;observed={fps:null,frameTimeMs:null};director?.setPaused(userPaused||document.hidden);face?.setPaused(userPaused||document.hidden);scheduler?.setPaused(userPaused||document.hidden);sync(true);});
 for(const k of ['enter','transfer','exit'])on(control(k),'input',()=>{$('[data-value="'+k+'"]').textContent=control(k).value;director?.configure(settings());status(director?.state.phase==='idle'?'Tempos atualizados.':'Novos tempos agendados para o próximo gesto.');});
 on(control('speed'),'input',()=>{presentationClock.setSpeed(Number(control('speed').value));director?.setSpeed(1);$('[data-value="speed"]').textContent=control('speed').value+'×';});
 on(action('capture'),'click',async()=>{try{if(!permissions(phase()).inspect)return;save(await stage.capture(),'shorekeeper-local.png','image/png');status('PNG salvo localmente.');}catch(e){warn(e.message);}});
 on(action('report'),'click',()=>save(report(),'shorekeeper-local-diagnostics.json'));on(action('config'),'click',()=>save(config(),'shorekeeper-test-config.json'));on(action('errors'),'click',()=>save({errors,warnings,flags,notes:$('[data-notes]').value},'shorekeeper-errors.json'));
 on(action('copy'),'click',async()=>{try{await navigator.clipboard.writeText(JSON.stringify(report(),null,2));status('Diagnóstico copiado.');}catch{save(report(),'shorekeeper-local-diagnostics.json');}});
 on(action('flag'),'click',()=>{if(!inspection)return;flags.push({camera:stage.cameraConfig(),morphs:{...inspection.weights},animation:director?.state??null,time:new Date().toISOString()});if(flags.length>30)flags.shift();status('Estado marcado. Descreva o problema em Diagnóstico e exporte o relatório.');$('[data-notes]').closest('details').open=true;$('[data-notes]').focus();});
 on($('[data-config-file]'),'change',async e=>{try{if(phase()!=='ready')return;const file=e.target.files?.[0];if(!file||file.size>1000000)throw Error('Configuração inválida ou maior que 1 MB.');const c=JSON.parse(await file.text());if(c.schema!=='shorekeeper-inspection/1.8')throw Error('Versão da configuração não suportada.');if(Object.values(c.morphs??{}).some(x=>!Number.isFinite(x)||x<0||x>1))throw Error('Pesos inválidos.');for(const [k,v] of Object.entries(c.animation??{})){if(!['enter','transfer','exit'].includes(k)||!Number.isFinite(v)||v<.2||v>1.5)throw Error('Tempos inválidos.');}for(const xyz of Object.values(c.bones??{}))if(!Array.isArray(xyz)||xyz.length!==3||xyz.some(x=>!Number.isFinite(x)||Math.abs(x)>45))throw Error('Offsets inválidos.');
 stopSweep();director?.dispose();director=null;inspection.restore();if(!facialR6)inspection.preset(c.morphs??{});else face?.reset();for(const [name,xyz] of Object.entries(c.bones??{})){const bone=inspection.bones.find(b=>b.name===name);if(bone)inspection.rotate(bone,xyz);}for(const [k,v] of Object.entries(c.animation??{})){control(k).value=v;$('[data-value="'+k+'"]').textContent=v;}if(Number.isFinite(c.speed)&&c.speed>=.25&&c.speed<=2)control('speed').value=c.speed;
 for(const [k,v] of Object.entries(c.visuals??{})){if(!['materials','background','light','dpr','fps'].includes(k))continue;const el=control(k);if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===String(v)))continue;if(k==='light'&&(!Number.isFinite(Number(v))||Number(v)<.3||Number(v)>3))continue;el.value=v;}
 for(const k of ['wireframe','skeleton','axes','culling'])if(typeof c.overlays?.[k]==='boolean')control(k).checked=c.overlays[k];buildDirector();visuals();if(c.camera)stage.restoreCamera(c.camera);syncFace();showBone();sync(true);status(c.modelSha256!==metadata.sha256?'Configuração aplicada a um modelo de hash diferente; confira capacidades.':'Configuração aplicada.');
 }catch(err){warn(err.message);}finally{e.target.value='';}});

 $('[data-combo-landing]').checked=['landingR4','landingR5'].some(k=>new URLSearchParams(location.search).get(k)==='1');$('[data-combo-recovery]').value=new URLSearchParams(location.search).get('landingR5')==='1'?'r5':'r4';
 on($('[data-combo-root]'),'change',()=>{cancelPreparation('root-change');if(model&&!director)buildDirector();syncPreparation();});
 on($('[data-combo-cancel]'),'click',()=>{cancelPreparation('user-cancel');if(model&&!director)buildDirector();status('Preparação cancelada.');syncPreparation();});
 function syncPreparation(){const busy=!!preparation;$('[data-combo-cancel]').hidden=!busy;$('[data-combo-start]').disabled=busy||!model||state.loading||state.contextLost||phase()!=='ready';root.dataset.comboPreparing=String(busy);$('[data-combo-qa]').setAttribute('aria-busy',String(busy));}
 on($('[data-combo-start]'),'click',async()=>{
  if(!model||phase()!=='ready'||preparation)return;comboCamera?.stop();narrative?.stop();scheduler?.setEnabled(false);control('actingAuto').checked=false;face?.reset();director?.dispose();director=null;inspection.restore();
  const subject=model,library=model.userData.skClips,variant=$('[data-combo-root]').value,landing=$('[data-combo-landing]').checked?($('[data-combo-recovery]').value==='r5'?'r5':true):false,controller=new AbortController(),sequence=++preparationSequence;let progressAt=-Infinity;
  preparation=controller;preparationReport={status:'PREPARING',variant,landing};status('Preparando combo…');syncPreparation();
  try{const result=await prepareInspectableCombo(subject,library,{variant,landing,signal:controller.signal,sourceKey:metadata.sha256+':'+animationLibraries.map(x=>x.sha256).sort().join(':'),budgetMs:matchMedia('(pointer:coarse)').matches?4:6,onProgress:p=>{if(sequence===preparationSequence){preparationReport={...preparationReport,...p};if(performance.now()-progressAt<150)return;progressAt=performance.now();$('[data-combo-progress]').textContent='Preparando · '+p.phase+' · etapa '+p.slices;}}});
   if(disposed||controller.signal.aborted||sequence!==preparationSequence||model!==subject||model.userData.skClips!==library)return;
   const plan=result.value;preparationReport={status:'READY',variant,landing,...result.metrics};director=createComboDirector(T,model,plan.clips,plan.schedule,{entry:landing?.35:0,onEvent:e=>{face?.onAnimationEvent(e);scheduler?.onEvent(e);}});
   control('presentationMode').value='combat';control('originalMode').value='reference';userPaused=false;face?.setPaused(false);director.start();
   if($('[data-combo-camera]').checked){comboCamera=createComboCamera(stage,{center:vfx.center.toArray(),height:vfx.scale});comboCamera.start();}
   status((plan.missing.length?'Fallback explícito · ausentes: '+plan.missing.join(', '):'BasicAttack1–4 → Skill01 → Burst02')+' → '+(landing?'Landing experimental':'recuperação')+' → Idle01 · rotação e identidade da Ult ainda sem validação');sync(true);stage.invalidate();
  }catch(e){if(e.name!=='AbortError'&&sequence===preparationSequence){preparationReport={status:'FAILED',error:e.message};comboCamera?.stop();warn(e.message);director?.dispose();director=null;if(model)buildDirector();}}
  finally{if(preparation===controller){preparation=null;$('[data-combo-progress]').textContent='';syncPreparation();}}
 });
 on($('[data-combo-seek]'),'input',e=>{if(director?.seek){const t=Number(e.target.value)*director.state.duration;director.seek(t);presentationClock.seek(t);last=0;diagnostics();}});
 function exemplar(){if(!vfx||!stage)return;stopCameraOwners();const flap=$('[data-vfx-exemplar]').value;
  if(flap==='swarm'){vfx.qaButterfly(null);if(exemplarCamera)stage.restoreCamera(exemplarCamera);exemplarCamera=null;return;}
  if(!exemplarCamera)exemplarCamera=stage.cameraConfig();narrative?.stop();
  vfx.qaButterfly({pos:[0,.1,.8],fwd:[0,1,0],flap:Number(flap),bank:Number($('[data-vfx-exemplar-angle]').value),scale:.18});vfx.setState('AMBIENT');
  const c=vfx.center,h=vfx.scale;stage.restoreCamera({position:[c.x,c.y+.1*h,c.z+1.5*h],target:[c.x,c.y+.1*h,c.z+.8*h],preset:'butterfly-exemplar'});
 }
 on($('[data-vfx-exemplar]'),'change',exemplar);on($('[data-vfx-exemplar-angle]'),'change',exemplar);
 on($('[data-vfx-story]'),'click',()=>{if(director?.state.mode==='R61_EXPERIMENTAL'&&director.state.presentationActive){status('Encerre R6.1 antes de iniciar narrativa VFX independente.');return;}if(motion.matches){status('Movimento reduzido: selecione uma fase estática.');return;}try{comboCamera?.stop();narrative?.start({camera:$('[data-vfx-story-camera]').checked});}catch(e){warn(e.message);}});
 on($('[data-vfx-next]'),'click',()=>{narrative?.stop();vfx?.next();syncVfx();});
 on($('[data-vfx-profile]'),'change',e=>{if(director?.state.mode==='R61_EXPERIMENTAL'){director.dispose();director=null;if(model)buildDirector();status('R6.1 encerrada ao trocar perfil VFX; inicie novamente para comparar.');}setVfxProfile(e.target.value);stage?.invalidate();syncVfx();});
 on($('[data-vfx-story-stop]'),'click',()=>narrative?.stop());
 for(const button of all('[data-vfx-celestial-view]'))on(button,'click',()=>{if(!stage||!vfx)return;stopCameraOwners();if(vfx.r4){stage.restoreCamera((vfx?.r5?celestialCameraFitR5:celestialCameraFit)({center:vfx.center.toArray(),height:vfx.scale,aspect:stage.camera.aspect,azimuth:button.dataset.vfxCelestialView==='quarter'?Math.PI/4:0}));return;}const c=vfx.center,h=vfx.scale;stage.restoreCamera({position:[c.x+h*1.8,c.y+h*1.05,c.z+h*4.5],target:[c.x,c.y+h*.35,c.z],preset:'celestial-wide'});});
 function syncVfx(){
 const report=vfx?{state:vfx.state,reducedMotion:vfx.reducedMotion,suspended:vfx.suspended}:null;
 $('[data-empty]').hidden=!!model||!!vfx&&(vfx.state!=='OFF'||vfx.root.visible||vfx.environment?.root.visible);
 for(const b of all('[data-vfx-state]')){b.disabled=!vfx||state.contextLost;b.setAttribute('aria-pressed',String(b.dataset.vfxState===report?.state));}
 $('[data-vfx-status]').textContent=!report?'Efeitos indisponíveis.':report.state+' · '+(report.reducedMotion?'movimento reduzido · estático':report.suspended?'pausado':'inspeção manual')+' · QA visual pendente';
 for(const el of all('[data-vfx-system], [data-vfx-pause], [data-vfx-view], [data-vfx-capture], [data-vfx-context], [data-vfx-celestial-view], [data-vfx-story], [data-vfx-story-stop], [data-combo-start], [data-vfx-r2-mode], [data-vfx-r2-stage], [data-vfx-exemplar], [data-vfx-exemplar-angle], [data-vfx-next]'))el.disabled=!vfx||state.contextLost;
 $('[data-vfx-pause]').textContent=vfxPaused?'Retomar efeitos':'Pausar efeitos';$('[data-vfx-profile]').disabled=state.loading||state.contextLost||!!preparation||!['ready','empty'].includes(phase());syncPreparation();
 }
 for(const b of all('[data-vfx-state]'))on(b,'click',()=>{narrative?.stop();vfx?.setState(b.dataset.vfxState);if(!model&&!vfxDemoCameraSet){stage?.restoreCamera({position:[0,1,8],target:[0,1,0],preset:'vfx-front'});vfxDemoCameraSet=true;}syncVfx();});
 for(const el of all('[data-vfx-system]'))on(el,'change',()=>vfx?.setEnabled(el.dataset.vfxSystem,el.checked));
 on($('[data-vfx-r2-mode]'),'change',e=>{if(vfx?.setMode)vfx.setMode(e.target.value);syncVfx();});on($('[data-vfx-r2-stage]'),'change',e=>{if(vfx?.setStage)vfx.setStage(e.target.value);syncVfx();});
 on($('[data-vfx-pause]'),'click',()=>{vfxPaused=!vfxPaused;vfx?.setSuspended(vfxPaused||userPaused);syncVfx();});
 for(const b of all('[data-vfx-view]'))on(b,'click',()=>{stopCameraOwners();vfxDemoCameraSet=true;if(model)stage.view(b.dataset.vfxView);else stage?.restoreCamera({position:b.dataset.vfxView==='front'?[0,1,8]:[5.66,1,5.66],target:[0,1,0],preset:'vfx-'+b.dataset.vfxView});});
 on($('[data-vfx-capture]'),'click',async()=>{try{if(stage&&!state.contextLost)save(await stage.capture(),'shorekeeper-vfx-'+(vfx?.state??'off').toLowerCase()+'.png','image/png');}catch(e){warn(e.message);}});
 on($('[data-vfx-report]'),'click',()=>save({vfx:vfx?.report(),renderer:stage?.info(),camera:stage?.cameraConfig(),observed,browser:navigator.userAgent},'shorekeeper-vfx-metrics.json'));
 on($('[data-vfx-context]'),'click',()=>{const ext=stage?.renderer.getContext().getExtension('WEBGL_lose_context');if(!ext){status('Simulação de contexto indisponível.');return;}ext.loseContext();setTimeout(()=>{if(!disposed)ext.restoreContext();},1000);});
 const resetClock=()=>{presentationClock.reanchor();frameMetrics.reset();renderMetrics.reset();last=0;metricsStart=0;frames=0;frameMs=0;renderFrameMs=0;loop?.reconcile();};
 on(document,'visibilitychange',()=>{sync(true);director?.setPaused(userPaused||document.hidden||suspended||outOfView);face?.setPaused(userPaused||document.hidden||suspended||outOfView);scheduler?.setPaused(userPaused||document.hidden||suspended||outOfView);resetClock();if(sweep)sweepLast=performance.now();});
 const updateMotionPolicy=()=>{vfx?.setReducedMotion(motion.matches);if(motion.matches){comboCamera?.stop();narrative?.stop();}scheduler?.setReducedMotion(motion.matches);if(motion.matches){control('actingAuto').checked=false;scheduler?.setEnabled(false);}if(motion.matches){cancelPreparation('reduced-motion');userPaused=true;director?.setPaused(true);face?.setPaused(true);scheduler?.setPaused(true);stopSweep();}sync(true);$('[data-motion-policy]').textContent=motion.matches?'Movimento reduzido: nenhuma atuação automática. Use Reproduzir para iniciar explicitamente.':'Reference QA é manual; Expressive Acting pode usar alternância automática.';};
 // Reconcile media preference before the existing frame sleeps after suspension.
 motion.addEventListener('change',updateMotionPolicy);
 $('[data-motion-policy]').textContent=motion.matches?'Movimento reduzido ativo. Atuação começa apenas por comando.':'Reference QA é manual; Expressive Acting pode usar alternância automática.';
 $('[data-r5-tools]').hidden=!['mouthR5','landingR5'].some(k=>new URLSearchParams(location.search).get(k)==='1')&&new URLSearchParams(location.search).get('vfx')!=='r5';
 on($('[data-r5-rollback]'),'click',()=>{cancelPreparation('rollback');stopCameraOwners();director?.dispose();director=null;face?.reset();inspection?.restore();if(mouthQA&&model)setMouthGeometry('r4');setVfxProfile('r4');$('[data-combo-recovery]').value='r4';control('presentationMode').value='contemplation';control('originalMode').value='expressive';if(model)buildDirector();const u=new URL(location.href);u.searchParams.delete('mouthR5');u.searchParams.delete('landingR5');u.searchParams.set('vfx','r4');if(mouthQA)u.searchParams.set('mouthR4','1');if($('[data-combo-landing]').checked)u.searchParams.set('landingR4','1');history.replaceState(null,'',u);status('Perfil R4 restaurado. Modelo privado mantido.');sync(true);syncVfx();stage.invalidate();});
 function frame(now){if(disposed)return false;if(vfx&&vfx.reducedMotion!==motion.matches)updateMotionPolicy();if(document.hidden||suspended||outOfView||state.contextLost||state.loading||!stage){vfx?.setSuspended(true);presentationClock.reanchor();last=0;return false;}if(!last){last=now;presentationClock.reanchor();presentationClock.tick(now);return true;}const delta=now-last,target=1000/Number(control('fps').value);if(delta<target-1)return;last=now;presentationClock.setPaused(userPaused);const dt=presentationClock.tick(now);const start=performance.now();director?.advance(dt);if(comboCamera?.active){const d=director?.state;comboCamera.sample(d?.progress??0);if(!d||d.phase==='idle')comboCamera.stop();}face?.advance(dt,{writeFacial:control('originalMode').value==='expressive'&&control('presentationMode').value!=='combat'});if(control('originalMode').value==='expressive')scheduler?.advance(dt,{advanceFace:false});
 if(sweep&&now-sweepLast>=900){sweepLast=now;sweep.index++;if(sweep.index>4)stopSweep();else{inspection.setMorph('E_Close',sweep.index*.25);syncFace();}}
 const sourceIsolated=director?.state.mode==='SOURCE_REVIEW';
 vfx?.setSuspended(vfxPaused||userPaused||sourceIsolated);
 if(sourceIsolated)setSourceReviewVfxIsolation(vfx,true);
 else{setSourceReviewVfxIsolation(vfx,false);if(!vfxPaused&&!userPaused)narrative?.advance(dt);vfx?.update(dt,stage.renderer.getPixelRatio());}
 const continuous=needsContinuousFrame({paused:userPaused,body:!!director&&director.state.phase!=='idle',face:!!face?.state.busy&&!face?.state.frozen,scheduler:!!scheduler?.state.enabled,sweep:!!sweep,narrative:!sourceIsolated&&!vfxPaused&&!!narrative?.state.running,vfx:!sourceIsolated&&!vfxPaused&&!!vfx?.needsContinuousFrame,camera:!!comboCamera?.active});const renderStart=performance.now();const drew=stage.draw({onlyIfDirty:!continuous});const renderCpuMs=Math.max(0,performance.now()-renderStart);if(drew)frames++;frameMs+=performance.now()-start;if(drew)renderFrameMs+=renderCpuMs;if(!metricsStart){metricsStart=now;frames=0;frameMs=0;renderFrameMs=0;}
 const current=director?.state.phase??'idle';if(current==='idle'&&lastDirectorPhase!=='idle'&&inspection){restError=inspection.restError();$('[data-rest-check]').textContent=(director?.state.mode==='SOURCE_REVIEW'?'Endpoint original · diferença ao repouso (não é teste de pouso): ':'Retorno à referência · maior diferença: ')+restError.toExponential(2)+(restError<1e-5?' · PASS numérico':' · verificar');}lastDirectorPhase=current;sync();
 if(now-summaryAt>=750){const duration=now-metricsStart;if(duration>0&&frames>0)observed={fps:Number((frames*1000/duration).toFixed(1)),frameTimeMs:Number((duration/frames).toFixed(2)),cpuTotalMs:Number((frameMs/frames).toFixed(2)),cpuRenderMs:Number((renderFrameMs/frames).toFixed(2))};summaryAt=now;metricsStart=now;frames=0;frameMs=0;renderFrameMs=0;diagnostics();const d=director?.state;$('[data-timeline]').value=d?.progress??0;if(d?.mode==='SOURCE_REVIEW'){$('[data-source-seek]').value=d.progress;$('[data-source-time]').textContent='clipTime '+d.clock.toFixed(6)+' s / '+d.duration.toFixed(6)+' s · presentationTime '+presentationClock.state.presentationTime.toFixed(6)+' s · sourceFrame PSA desconhecido';}if(d?.mode==='R61_EXPERIMENTAL'){$('[data-r61-seek]').value=d.progress;$('[data-r61-time]').textContent=d.cue+' · '+d.clock.toFixed(2)+' / '+d.duration.toFixed(2)+' s · '+d.vfxCue+' · sourceFrame indisponível · cinematografia autoral';}$('[data-acting-state]').textContent=d?`${d.phase} · ${d.clock.toFixed(2)} / ${d.duration.toFixed(2)} s · ${presentationClock.state.speed}×${d.queued?' · repetição agendada':''}${d.pending?'\nNovos tempos: próximo ciclo':''}`:'Clipes de atuação indisponíveis.';}
 if(drew){const cpuMs=Math.max(0,performance.now()-start);frameMetrics.add(delta,cpuMs);renderMetrics.add(delta,renderCpuMs);stage.observeFrame(renderCpuMs,now,1000/Math.min(60,Number(control('fps').value)));}
 return continuous||drew;
 }
 const viewportObserver=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{outOfView=!entries[0].isIntersecting;const paused=userPaused||document.hidden||suspended||outOfView;director?.setPaused(paused);face?.setPaused(paused);scheduler?.setPaused(paused);resetClock();sync(true);},{threshold:0});viewportObserver?.observe(host);
 const destroy=()=>{if(disposed)return;disposed=true;remoteAttempt?.abort();loadId++;loader.cancel();libraryLoader.cancel();lifetime.abort();if(referenceUrl)URL.revokeObjectURL(referenceUrl);viewportObserver?.disconnect();motion.removeEventListener('change',updateMotionPolicy);loop?.dispose();release();vfx?.dispose();vfx=null;stage?.dispose();root._skDispose=null;};
 on(window,'pagehide',e=>{if(e.persisted){suspended=true;director?.setPaused(true);face?.setPaused(true);scheduler?.setPaused(true);resetClock();sync(true);}else destroy();});
 on(window,'pageshow',e=>{if(e.persisted){suspended=false;director?.setPaused(userPaused||document.hidden);face?.setPaused(userPaused||document.hidden);scheduler?.setPaused(userPaused||document.hidden);resetClock();if(sweep)sweepLast=performance.now();stage?.resize();sync(true);status(model?'Sessão restaurada do cache; confira a cena.':'Sessão restaurada. Selecione seu GLB local.');}});
 for(const type of ['input','change','click'])on(root,type,()=>{if(!loop?.state.pending){last=0;presentationClock.reanchor();}stage?.invalidate();});
 on(document,'astro:before-swap',destroy);root._skDispose=destroy;initializeStage();syncVfx();loop=createRenderLoop({request:cb=>requestAnimationFrame(cb),cancel:id=>cancelAnimationFrame(id),eligible:()=>!disposed&&!!stage&&state.webgl&&!document.hidden&&!suspended&&!outOfView&&!state.contextLost&&!state.loading,tick:frame});loop.wake();
 if(state.webgl)void (async()=>{
  remoteAttempt=new AbortController();
  const signal=remoteAttempt.signal;
  let cached=null;
  try{cached=await readPrivateModel();if(cached)cachedPrivateSha=cached.sha256;}catch(e){log('Cache local: '+e.message,'warning');}
  if(disposed||state.contextLost||manualFileChosen||signal.aborted)return;
  const inspection=await inspectPrivateManifest({signal});
  if(disposed||state.contextLost||manualFileChosen||signal.aborted)return;
  r2Connection=inspection.state;r2HttpStatus=inspection.httpStatus;r2Manifest=inspection.manifest;syncR2LibraryPanel();
  const manifest=inspection.manifest;
  let loadedFromRemote=false;
  if(manifest&&(!cached||cached.sha256!==manifest.model.sha256)){
   try{
    privateStatus('Buscando modelo autenticado no R2…');
    const file=await getPrivateFile(manifest.model,{signal});
    if(disposed||state.contextLost||manualFileChosen||signal.aborted)return;
    await load(file,'r2');
    loadedFromRemote=!!model&&metadata?.sha256===manifest.model.sha256;
   }catch(e){if(!signal.aborted)log('R2: '+e.message,'warning');}
  }
  if(!loadedFromRemote&&cached&&!disposed&&!manualFileChosen&&!signal.aborted){
   privateStatus('Abrindo cópia guardada neste navegador…');syncPrivateButtons();
   await load(cached.file,'cache');
  }
  if(disposed||state.contextLost||manualFileChosen||signal.aborted)return;
  if(!model){privateStatus('Sem modelo remoto autorizado ou cópia local. Selecione o GLB e, se desejar, guarde-o neste navegador.');return;}
  if(manifest&&metadata?.sha256===manifest.model.sha256&&manifest.libraries.length){
   const libraries=[];
   for(const lib of manifest.libraries){
    if(disposed||state.contextLost||manualFileChosen||signal.aborted)return;
    try{libraries.push(await getPrivateFile(lib,{kind:'library',signal}));}
    catch(e){if(!signal.aborted)log('Biblioteca R2 '+lib.id+': '+e.message,'warning');}
   }
   if(libraries.length&&!disposed&&!manualFileChosen&&!signal.aborted)await importPrivateLibraries(libraries,'r2');
  }
  if(!disposed&&!manualFileChosen&&metadata?.origin==='r2')
   privateStatus('GLB carregado de armazenamento R2 autenticado, com SHA-256 conferido. Você também pode guardar uma cópia neste navegador.');
 })();
 return {dispose:destroy,...(mouthQA||new URLSearchParams(location.search).has('comboQA')||new URLSearchParams(location.search).has('vfxQA')?{inspect:report}:{})};
}
