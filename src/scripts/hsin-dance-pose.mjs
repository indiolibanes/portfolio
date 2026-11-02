/** Compact baked playback and inertial recovery. No allocations of Quaternion/Vector3 in apply/recover. */
const smooth=t=>t*t*t*(t*(t*6-15)+10);
export function createDancePose({THREE:T,data,bones}){
 const by=new Map(bones.map(b=>[b.name,b])),chain=data.names.map(n=>by.get(n)),size=chain.length*4;
 const a=new T.Quaternion(),b=new T.Quaternion(),c=new T.Quaternion(),d=new T.Quaternion(),from=new Float64Array(size),prior=new Float64Array(size),current=new Float64Array(size),rotation=new Float64Array(chain.length*3),velocity=new Float64Array(chain.length*3);let lastDt=1/30;
 const ready=chain.length>0&&chain.every(Boolean)&&data.rest.length===size&&Object.values(data.phrases).every(p=>p.frames.length>=2&&p.frames.every(f=>f.length===size));
 const read=q=>{for(let i=0;i<chain.length;i++)chain[i].quaternion.toArray(q,i*4);};read(current);prior.set(current);
 function restore(){if(!ready)return;for(let i=0;i<chain.length;i++){chain[i].quaternion.fromArray(data.rest,i*4);chain[i].updateMatrix();}current.set(data.rest);prior.set(data.rest);}
 function log(q,out,i,scale=1){if(q.w<0)q.set(-q.x,-q.y,-q.z,-q.w);const s=Math.hypot(q.x,q.y,q.z),k=s>1e-10?2*Math.atan2(s,q.w)/s*scale:2*scale;out[i]=q.x*k;out[i+1]=q.y*k;out[i+2]=q.z*k;}
 return {ready,duration:name=>data.phrases[name]?.seconds??9,
  apply(name,t,weight=1,amplitude=1,dt=1/30){if(!ready)return;const p=data.phrases[name];if(!p)return;lastDt=dt>0?dt:lastDt;prior.set(current);t=Math.max(0,Math.min(1,t));const x=t*(p.frames.length-1),i=Math.min(p.frames.length-2,Math.floor(x)),mix=x-i,amount=Math.max(0,Math.min(1,weight*amplitude));
   for(let k=0;k<chain.length;k++){a.fromArray(p.frames[i],k*4).normalize();b.fromArray(p.frames[i+1],k*4).normalize();c.fromArray(data.rest,k*4);a.slerp(b,mix);c.slerp(a,amount);chain[k].quaternion.copy(c);chain[k].updateMatrix();c.toArray(current,k*4);}
  },
  beginRecovery(){read(from);for(let k=0;k<chain.length;k++){a.fromArray(from,k*4).normalize();b.fromArray(data.rest,k*4).normalize();c.copy(a).invert().multiply(b).normalize();log(c,rotation,k*3);c.fromArray(prior,k*4).normalize().invert().multiply(a).normalize();log(c,velocity,k*3,1/Math.max(.01,lastDt));}},
  recover(t){if(t>=1){restore();return;}t=Math.max(0,t);const h=t-2*t*t+t*t*t,s=3*t*t-2*t*t*t;
   for(let k=0;k<chain.length;k++){const j=k*3,x=velocity[j]*2.4*h+rotation[j]*s,y=velocity[j+1]*2.4*h+rotation[j+1]*s,z=velocity[j+2]*2.4*h+rotation[j+2]*s,len=Math.hypot(x,y,z),f=len>1e-10?Math.sin(len/2)/len:.5;a.set(x*f,y*f,z*f,Math.cos(len/2));b.fromArray(from,k*4).multiply(a).normalize();chain[k].quaternion.copy(b);chain[k].updateMatrix();}
  },restore,
  atReference:()=>ready&&chain.every((bone,i)=>Math.abs(bone.quaternion.x-data.rest[i*4])+Math.abs(bone.quaternion.y-data.rest[i*4+1])+Math.abs(bone.quaternion.z-data.rest[i*4+2])+Math.abs(bone.quaternion.w-data.rest[i*4+3])<2e-6),
  bufferBytes:()=>from.byteLength+prior.byteLength+current.byteLength+rotation.byteLength+velocity.byteLength,
 };
}
