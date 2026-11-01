import { auditFacialMorphs } from './hsin-face-morph-audit.mjs';
import { createFacialActing } from './hsin-face-acting.mjs';
import { snapshotFace, restoreFace, calibratePupils, cursorHeadOffset, projectGazeOffset, createFaceBinding, measuredGazeAxes } from './hsin-face-rig.mjs';

/** A browser-local session. One owner for controlled facial targets, no bone/material writes. */
export function createFacialSession({THREE, meshes, head, camera, canvas, invalidate, onStatus=()=>{},
  requestFrame=requestAnimationFrame, cancelFrame=cancelAnimationFrame, reducedMotion=false, seed=2718,
  canAttend=()=>true, pass='a', intensity=.55, attentionMode='auto'}) {
  const baseline=snapshotFace(meshes), calibration=calibratePupils(THREE,meshes,head);
  let audit=null,profile=pass,settings={intensity,attentionMode},flags={},bodyCue='gesture:release';
  const ensureAudit=()=>{if(!audit)audit=auditFacialMorphs(THREE,meshes,head,calibration);};
  if(profile!=='a')ensureAudit();
  let binding=createFaceBinding(meshes,baseline,calibration,audit??{limits:{}});
  const makeActing=()=>createFacialActing({seed,pass:profile,...settings,enabled:flags,morphLimits:audit?.limits??{},gazeAxes:measuredGazeAxes(THREE,calibration)});
  let acting=makeActing();
  let running=false, visible=true, reduced=!!reducedMotion, disposed=false, frame=0,last=null, pointer=null, touchUntil=0;
  let comparison=null, showingBaseline=false;
  function schedule(){if(running&&visible&&!reduced&&!disposed&&!frame)frame=requestFrame(tick);}
  function tick(now){
    frame=0;if(!running||!visible||reduced||disposed){last=null;return;}
    const dt=last===null?0:Math.max(0,Math.min(.05,(now-last)/1000));last=now;
    const time=acting.sample().clock;
    if(pointer&&calibration.ready&&canAttend()&&(!pointer.touch||time<touchUntil)){
      const ndc=new THREE.Vector2(pointer.x,pointer.y);
      const offset=cursorHeadOffset(THREE,ndc,camera,head,calibration.radius,calibration.focusCenter);
      acting.attention(projectGazeOffset(THREE,offset,calibration),pointer.touch?Math.max(0,touchUntil-time):1.3);
    }else if(pointer?.touch&&time>=touchUntil){pointer=null;acting.clearAttention();}
    binding.apply(acting.advance(dt));invalidate();schedule();
  }
  function pointerInput(event){
    if(!canAttend())return;
    const touch=event.pointerType==='touch';
    if(touch&&event.type!=='pointerdown')return;
    const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    pointer={x:(event.clientX-rect.left)/rect.width*2-1,y:1-(event.clientY-rect.top)/rect.height*2,touch};
    if(touch)touchUntil=acting.sample().clock+(profile==='presentation'?4.2:1.3);
  }
  function leave(event){if(event.pointerType!=='touch'){pointer=null;acting.clearAttention();}}
  canvas.addEventListener('pointermove',pointerInput,{passive:true});
  canvas.addEventListener('pointerdown',pointerInput,{passive:true});
  canvas.addEventListener('pointerleave',leave,{passive:true});
  const pause=()=>{running=false;last=null;if(frame)cancelFrame(frame);frame=0;};
  return {
    start(){
      if(disposed)return false;
      if(showingBaseline&&comparison){restoreFace(comparison);showingBaseline=false;}
      if(reduced){onStatus('Movimento reduzido: expressão preservada; ciclo facial suspenso.');return false;}
      running=true;last=null;schedule();onStatus('Atuação facial experimental ativa. '+calibration.reason);return true;
    },
    pause(){pause();onStatus('Atuação pausada no estado atual.');},
    setVisible(value){visible=!!value;last=null;if(!visible&&frame){cancelFrame(frame);frame=0;}else schedule();},
    setReduced(value){reduced=!!value;last=null;if(reduced&&frame){cancelFrame(frame);frame=0;}else schedule();},
    test(kind){
      const required=kind==='wink-left'?['E_Close_L']:kind==='blink'?['E_Close_R','E_Close_L']:['E_Close_R'];
      if(reduced||disposed||required.some(name=>!binding.channels.includes(name)))return false;
      return acting.trigger(kind);
    },
    configure(next){
      const {intensity,attentionMode,...channels}=next;flags={...flags,...channels};
      if(Number.isFinite(intensity))settings.intensity=Math.max(0,Math.min(1,intensity));
      if(['auto','cursor','neutral'].includes(attentionMode))settings.attentionMode=attentionMode;
      acting.configure({...flags,...settings});
    },
    setPass(next){
      if(!['a','b','presentation'].includes(next)||disposed)return false;
      const wasRunning=running;pause();binding.restore();profile=next;if(profile!=='a')ensureAudit();
      binding=createFaceBinding(meshes,baseline,calibration,audit??{limits:{}});acting=makeActing();acting.signal(bodyCue);
      showingBaseline=false;comparison?.clear();comparison=null;touchUntil=0;pointer=null;
      if(wasRunning){running=true;schedule();}invalidate();return true;
    },
    signal(event){bodyCue=event;acting.signal(event);},
    testMorph(name){return !reduced&&!disposed&&acting.testMorph(name);},
    testBeat(kind){return !reduced&&!disposed&&acting.testBeat(kind);},
    compare(){
      pause();
      if(!showingBaseline){comparison=snapshotFace(meshes);restoreFace(baseline);showingBaseline=true;}
      else{restoreFace(comparison);showingBaseline=false;}
      invalidate();return showingBaseline?'baseline':'candidate';
    },
    diagnostics(){return {running,visible,reduced,showingBaseline,channels:binding.channels,calibration,profile,audit,acting:acting.diagnostics()};},
    dispose({restore=false}={}){
      pause();disposed=true;
      canvas.removeEventListener('pointermove',pointerInput);canvas.removeEventListener('pointerdown',pointerInput);canvas.removeEventListener('pointerleave',leave);
      if(restore)binding.restore();baseline.clear();comparison?.clear();invalidate();
    },
  };
}
