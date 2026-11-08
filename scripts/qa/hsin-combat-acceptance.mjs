/** QA-only manual rendering. No RAF, input widgets or production entry point. */
import './hsin-harness.mjs';
import * as T from 'three';
import {decodeCombatData} from '/src/scripts/hsin-combat-data.mjs';
import {createCombatPose} from '/src/scripts/hsin-combat-pose.mjs';
import {createCombatVfx} from '/src/scripts/hsin-combat-vfx.mjs';
import {faceCue} from '/src/scripts/hsin-combat-r21.mjs';
import {createFacialActing} from '/src/scripts/hsin-face-acting.mjs';
import {snapshotFace,createFaceBinding} from '/src/scripts/hsin-face-binding.mjs';

const h=window.hsinHarness;
await h.load({faceSkin:true});
const {scene,model,meshes,bones,profile,camera,renderer,moonlit}=h.state;
const by=new Map(bones.map(bone=>[bone.name,bone]));
const binding=createFaceBinding(meshes,snapshotFace(meshes),profile.calibration,{limits:profile.limits});
const vfx=createCombatVfx({T,scene,camera,by});
const left=by.get('ORG-Bip001UpperArmL').getWorldPosition(new T.Vector3());
const right=by.get('ORG-Bip001UpperArmR').getWorldPosition(new T.Vector3());
const facing=left.sub(right).setY(0).normalize().cross(new T.Vector3(0,1,0));
const baseYaw=Math.atan2(facing.x,facing.z);
let data,pose;
async function loadAsset(url){
 pose?.restore();vfx.clear();
 data=decodeCombatData(await fetch(url).then(response=>response.json()));
 pose=createCombatPose({T,data,bones,model});
}
function seek({time,yaw=40,detail=false,width=720,height=720,effects=true}){
 if(!pose||time<0||time>data.seconds)throw Error('Invalid acceptance time');
 pose.restore();vfx.clear();
 const times=new Set([0,time]);
 for(let frame=1;frame/30<time;frame++)times.add(frame/30);
 for(const [,at] of data.sequence.markers)if(at<=time)times.add(at);
 const events=[];
 for(const at of [...times].sort((a,b)=>a-b)){
  pose.apply(at/data.seconds);model.updateMatrixWorld(true);
  for(const [name,marker] of data.sequence.markers)if(marker===at){vfx.event(name,marker);events.push({name,time:marker});}
  vfx.update(at);
 }
 const actor=createFacialActing({seed:211,pass:'auto-b1',autonomous:true,intensity:.75,morphLimits:profile.limits,gazeAxes:profile.gazeAxes});
 for(let at=0;at<time;at+=1/30)actor.advance(Math.min(1/30,time-at));
 const state=actor.sample(),cue=faceCue(time,{});
 state.overlays={E_Squint_R:cue.squint,E_Squint_L:cue.squint,M_Squint_R:cue.mouthSquint,M_Squint_L:cue.mouthSquint,B_Up_Add_R:cue.brow,B_Up_Add_L:cue.brow};
 const gain=time>=6?(8.4-time)/2.4:1;
 state.smileL=(state.smileL??0)*(1-cue.smileCut*gain)+cue.smileAdd*gain;
 state.smileR=(state.smileR??0)*(1-cue.smileCut*gain)+cue.smileAdd*gain;
 state.closeL=Math.max(state.closeL??0,cue.close*gain);state.closeR=Math.max(state.closeR??0,cue.close*gain);
 // Same recovery gain as the lab.
 for(const key of Object.keys(state.overlays))state.overlays[key]*=gain;
 binding.apply(state);
 camera.aspect=width/height;camera.updateProjectionMatrix();
 const target=detail?by.get('ORG-Bip001Head').getWorldPosition(new T.Vector3()).add(new T.Vector3(0,-.03,0)):new T.Vector3(0,.9,0);
 const distance=detail?.65:Math.max(3.5,1.65/(2*Math.tan(camera.fov*Math.PI/360)*camera.aspect));
 const angle=baseYaw+yaw*Math.PI/180;
 camera.position.set(target.x+Math.sin(angle)*distance,target.y+(detail?.025:.18),target.z+Math.cos(angle)*distance);
 camera.lookAt(target);camera.updateMatrixWorld();vfx.update(time);
 if(!effects)scene.getObjectByName('Hsin combat R2.1 pooled effects').visible=false;
 else scene.getObjectByName('Hsin combat R2.1 pooled effects').visible=true;
 renderer.setSize(width,height,false);renderer.setPixelRatio(1);
 renderer.domElement.style.width=width+'px';renderer.domElement.style.height=height+'px';
 moonlit.frameSky(camera,target);scene.updateMatrixWorld(true);renderer.render(scene,camera);
 return {time,events,cue,visibleVfx:vfx.visibleDrawCalls(),budget:vfx.budget,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,
  influences:meshes.filter(mesh=>mesh.morphTargetDictionary).map(mesh=>({name:mesh.name,weights:mesh.morphTargetInfluences}))};
}
window.hsinAcceptance={loadAsset,seek};
window.hsinAcceptanceReady=true;
