import {createBakedPose} from './hsin-baked-pose.mjs';
/** Serialized local quaternion and support-position tracks. All IK stays offline. */
export function createCombatPose({T,data,bones,model}){
 const baked=createBakedPose({THREE:T,data,bones}),by=new Map(bones.map(b=>[b.name,b]));
 const chain=data.names.map(name=>by.get(name));
 const positions=(data.positionNames??[]).map(name=>model.getObjectByName(name));
 if(!baked.diagnostics().ready||positions.some(node=>!node))throw Error('Combat binding mismatch');
 const from=new Float64Array(data.rest.length),positionFrom=new Float64Array(positions.length*3);
 const a=new T.Quaternion(),b=new T.Quaternion(),c=new T.Quaternion(),d=new T.Quaternion();
 let phase=0,recoveryPhase=0;
 const lower=data.recovery?.names.map(name=>by.get(name))??[];
 const lowerSet=new Set(lower);
 const upper=chain.map((bone,i)=>({bone,i})).filter(({bone})=>!lowerSet.has(bone));
 function restore(){
  baked.restore();
  positions.forEach((node,i)=>{node.position.fromArray(data.positionRest,i*3);node.updateMatrix();});
 }
 return {
  apply(t){
   phase=t;baked.apply(t);
   if(!positions.length)return;
   const f=Math.min(data.frameCount-2,Math.floor(t*(data.frameCount-1))),mix=t*(data.frameCount-1)-f;
   positions.forEach((node,i)=>{
    const p=data.positionFrames[f],q=data.positionFrames[f+1];
    node.position.set(p[i*3]+(q[i*3]-p[i*3])*mix,p[i*3+1]+(q[i*3+1]-p[i*3+1])*mix,p[i*3+2]+(q[i*3+2]-p[i*3+2])*mix);node.updateMatrix();
   });
  },
  restore,
  beginRecovery(){
   recoveryPhase=phase;chain.forEach((bone,i)=>bone.quaternion.toArray(from,i*4));
   positions.forEach((node,i)=>node.position.toArray(positionFrom,i*3));
  },
  recover(t){
   if(t===1){restore();return;}
   const u=t*t*t*(t*(t*6-15)+10);
   upper.forEach(({bone,i})=>{a.fromArray(from,i*4);b.fromArray(data.rest,i*4);bone.quaternion.copy(a.slerp(b,u));bone.updateMatrix();});
   positions.forEach((node,i)=>{node.position.set(positionFrom[i*3]+(data.positionRest[i*3]-positionFrom[i*3])*u,positionFrom[i*3+1]+(data.positionRest[i*3+1]-positionFrom[i*3+1])*u,positionFrom[i*3+2]+(data.positionRest[i*3+2]-positionFrom[i*3+2])*u);node.updateMatrix();});
   if(data.recovery&&t<1){
    const bank=data.recovery,frame=recoveryPhase*(data.frameCount-1),f=Math.min(data.frameCount-2,Math.floor(frame)),fm=frame-f;
    const step=u*(bank.steps-1),s=Math.min(bank.steps-2,Math.floor(step)),sm=step-s,stride=lower.length*4;
    lower.forEach((bone,i)=>{
     a.fromArray(bank.values,((f*bank.steps+s)*stride)+i*4).normalize();b.fromArray(bank.values,((f*bank.steps+s+1)*stride)+i*4).normalize();a.slerp(b,sm);
     c.fromArray(bank.values,(((f+1)*bank.steps+s)*stride)+i*4).normalize();d.fromArray(bank.values,(((f+1)*bank.steps+s+1)*stride)+i*4).normalize();c.slerp(d,sm);
     bone.quaternion.copy(a.slerp(c,fm));bone.updateMatrix();
    });
   }
   if(t===1)restore();
  },
  atBaseline:()=>chain.every((bone,i)=>bone.quaternion.toArray().every((value,k)=>Math.abs(value-data.rest[i*4+k])<2e-5))&&positions.every((node,i)=>node.position.toArray().every((value,k)=>Math.abs(value-data.positionRest[i*3+k])<1e-7)),
  bufferBytes:from.byteLength+positionFrom.byteLength,
 };
}
