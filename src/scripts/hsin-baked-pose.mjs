/** Playback only: no IK, skin sampling, vertex traversal, or geometry audit. */
export function createBakedPose({THREE,data,bones}){
 const map=new Map(bones.map(b=>[b.name,b])),chain=data?.names.map(n=>map.get(n))??[];
 const ready=!!data&&chain.length===6&&chain.every(Boolean),a=new THREE.Quaternion(),b=new THREE.Quaternion(),c=new THREE.Quaternion(),d=new THREE.Quaternion();
 let active='plain';
 const restore=()=>{if(!ready)return;for(let i=0;i<chain.length;i++){chain[i].quaternion.fromArray(data.rest,i*4);chain[i].updateMatrix();}};
 return {
  apply(t,{breath=0}={}){
   if(!ready||!Number.isFinite(t))return false;t=Math.max(0,Math.min(1,t));if(t===0){restore();return true;}
   const position=t*(data.frames.length-1),lo=Math.min(data.frames.length-2,Math.floor(position)),mix=position-lo;
   const secondary=breath<0?data.negative:data.positive,amount=Math.min(1,Math.abs(breath));
   for(let i=0;i<chain.length;i++){
    a.fromArray(data.frames[lo],i*4);b.fromArray(data.frames[lo+1],i*4);a.slerp(b,mix);
    if(secondary&&amount){c.fromArray(secondary[lo],i*4);d.fromArray(secondary[lo+1],i*4);c.slerp(d,mix);a.slerp(c,amount);}
    chain[i].quaternion.copy(a);chain[i].updateMatrix();
   }return true;
  },restore,
  atBaseline:()=>ready&&chain.every((bone,i)=>bone.quaternion.toArray().every((v,k)=>Math.abs(v-data.rest[i*4+k])<1e-7)),
  select(label){active=label;return label==='plain';},
  diagnostics:()=>({ready,activeVariant:active,method:'BAKED_PLAYBACK'}),
 };
}
/** Both left variants share one actor and one bone-chain owner. */
export function createBakedChest({THREE,profile,bones}){
 const plain=createBakedPose({THREE,data:profile.chest,bones}),composed=createBakedPose({THREE,data:profile.composition,bones});let active=plain;
 return {apply:(...args)=>active.apply(...args),restore(){plain.restore();},atBaseline:()=>plain.atBaseline(),select(label){active=label==='composed'&&composed.diagnostics().ready?composed:plain;return label==='plain'||active===composed;},diagnostics:()=>({ready:plain.diagnostics().ready,composition:composed.diagnostics().ready})};
}
