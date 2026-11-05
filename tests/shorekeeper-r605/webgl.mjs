import * as T from 'three';
import {makeAuditFixture} from './fixture.mjs';
import {createStage} from '../../src/scripts/shorekeeper/stage.mjs';
import {ShorekeeperVfxR5Director} from '../../src/scripts/shorekeeper/vfx-r5.mjs';
import {createOriginalIdleDirector} from '../../src/scripts/shorekeeper/original-idle-director.mjs';
import {createAnatomicalFaceDirector} from '../../src/scripts/shorekeeper/anatomical-face.mjs';
import {createInspection} from '../../src/scripts/shorekeeper/inspection.mjs';
import {createRenderLoop} from '../../src/scripts/shorekeeper/render-loop.mjs';
import {createFrameMetrics} from '../../src/scripts/shorekeeper/frame-metrics.mjs';
import {disposeObject} from '../../src/scripts/shorekeeper/local-model.mjs';
import golden from '../../docs/characters/shorekeeper-r6-baseline-golden.json';
const result=document.querySelector('#result'),host=document.querySelector('#host'),checks=[],shaderErrors=[];
const check=(name,value)=>{checks.push({name,status:value?'PASS':'FAIL'});if(!value)throw Error(name);};
async function run(){
 let stage,model,face,body,vfx;
 try{
  stage=createStage(host,{gpuTiming:true,adaptiveDpr:true});stage.renderer.debug.onShaderError=()=>shaderErrors.push('shader compilation failed');stage.quality(1);
  const gl=stage.renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info'),renderer=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
  const fixture=makeAuditFixture();model=fixture.model;
  for(const [row,m] of golden.meshes.entries()){
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([-.12,0,0,.12,0,0,0,.2,0],3));g.computeVertexNormals();
   g.morphAttributes.position=Object.keys(m.morphTargetDictionary).map((name,i)=>{const a=new T.Float32BufferAttribute([0,0,0,0,0,0,0,(i+1)*.0001,0],3);a.name=name;return a;});g.morphTargetsRelative=true;
   const mesh=new T.Mesh(g,new T.MeshBasicMaterial({color:row?0xe0d480:0x91cfff,side:T.DoubleSide}));mesh.name=m.name;mesh.position.set(row*.3,1.2,.15);model.add(mesh);
  }
  stage.adopt(model);const inspection=createInspection(model);face=createAnatomicalFaceDirector(inspection);vfx=new ShorekeeperVfxR5Director(stage.scene,{camera:stage.camera,mobile:true});vfx.bindModel(model);vfx.setState('STELLAREALM');
  body=createOriginalIdleDirector(T,model,fixture.clip,{enter:.1,exit:.1,onEvent:e=>face.onAnimationEvent(e)});
  const metrics=createFrameMetrics();let cycles=0,frames=0,hidden=false,last=null,wallStart=performance.now(),afterStopCallbacks=null;
  const loop=createRenderLoop({request:cb=>requestAnimationFrame(cb),cancel:id=>cancelAnimationFrame(id),eligible:()=>!hidden,tick:now=>{
   const interval=last===null?null:now-last;last=now;const started=performance.now();
   if(body.state.phase==='idle'){if(cycles===3)return false;cycles++;body.start();}
   body.advance(.2);face.advance(.2);vfx.update(.2,stage.renderer.getPixelRatio());stage.invalidate();stage.draw();if(interval>0)metrics.add(interval,performance.now()-started);frames++;
   if(frames===8){host.style.width='390px';host.style.height='640px';stage.resize();check('portrait aspect 390x640',Math.abs(stage.camera.aspect-390/640)<.001);}
   if(frames===16){host.style.width='640px';host.style.height='360px';stage.resize();check('landscape aspect 16:9',Math.abs(stage.camera.aspect-16/9)<.001);}
   if(frames===24){hidden=true;loop.reconcile();check('offscreen gate cancels pending RAF',!loop.state.pending);hidden=false;loop.wake();}
   return true;
  }});
  loop.wake();
  await new Promise((resolve,reject)=>{const poll=setInterval(()=>{if(cycles===3&&body.state.phase==='idle'&&!loop.state.pending){clearInterval(poll);resolve();}else if(performance.now()-wallStart>30000){clearInterval(poll);loop.dispose();reject(Error('Synthetic frame watchdog'));}},50);});
  afterStopCallbacks=loop.state.callbacks;loop.dispose();check('three fixture cycles completed',cycles===3);check('one loop disposed',!loop.state.pending);check('R6 returns from combat',!face.report().combat);
  check('no shader compilation errors',shaderErrors.length===0);const before=stage.info(),gpu=before.gpuTiming;
  body.dispose();body=null;face.dispose();face=null;vfx.dispose();vfx=null;stage.detach(model);disposeObject(model);model=null;stage.renderer.renderLists.dispose();stage.invalidate();stage.draw();
  const after=stage.info();check('textures released',after.textures===0);check('geometries released',after.geometries===0);
  // WebGL lose/restore is exercised without a game model or private session.
  const ext=gl.getExtension('WEBGL_lose_context');let restored=false;
  if(ext){await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Context restore watchdog')),4000);stage.canvas.addEventListener('webglcontextrestored',()=>{clearTimeout(timer);restored=true;resolve();},{once:true});stage.canvas.addEventListener('webglcontextlost',()=>setTimeout(()=>ext.restoreContext(),30),{once:true});ext.loseContext();});stage.invalidate();stage.draw();check('WebGL restored with instrumentation reset',restored);}
  result.textContent=JSON.stringify({status:'PASS_SYNTHETIC_WEBGL',checks,renderer,frames,cycles,wallSeconds:(performance.now()-wallStart)/1000,callbacks:afterStopCallbacks,metrics:metrics.report(),gpu,before,after,contextRestore:ext?restored:'UNSUPPORTED',canonicalAssets:'AUTHENTICATED_R2_UNAVAILABLE',physicalGpu:'NOT_VALIDATED',samsung600s:'NOT_TESTED'},null,2);
 }catch(e){result.textContent=JSON.stringify({status:'FAIL_OR_ENVIRONMENT_BLOCKED',message:e.message,checks,shaderErrors},null,2);}
 finally{body?.dispose();face?.dispose();vfx?.dispose();if(model){stage?.detach(model);disposeObject(model);}stage?.dispose();}
}
run();
