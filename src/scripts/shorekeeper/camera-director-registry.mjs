/** Logical directors share ONE rendered camera and the caller's frame loop. */
export function createCameraDirectorRegistry(T,{camera,orbit,apply,transitionSeconds=.6}){
 const directors=new Map();let mode='auto',owner=null,transition=null,disposed=false,queued=null;
 const snapshot=()=>({position:camera.position.toArray(),target:orbit.target.toArray(),fov:camera.fov});
 const ready=id=>{const d=directors.get(id);return !!d&&(typeof d.ready==='function'?d.ready():d.ready===true);};
 const authority=()=>mode==='free'?null:mode==='auto'?(ready('shorekeeper')&&directors.get('shorekeeper').active?.()?'shorekeeper':'hsin'):mode;
 return {
  register(d){if(disposed||!d?.id||directors.has(d.id))throw Error('Duplicate or invalid camera director');if(!d.constraints||!Number.isFinite(d.priority))throw Error('Camera contract required');directors.set(d.id,d);return ()=>{if(directors.get(d.id)===d){directors.delete(d.id);d.dispose?.();}};},
  select(id){if(disposed||!['auto','free',...directors.keys()].includes(id))return false;if(!['auto','free'].includes(id)&&!ready(id))return false;mode=id;owner=null;transition=null;queued=null;return true;},
  submit(id,pose){if(disposed||authority()!==id||!ready(id))return false;queued={id,pose};return true;},
  step(dt){if(disposed)return false;const id=authority();if(!id||!ready(id)){owner=null;return false;}
   const d=directors.get(id);const pose=queued?.id===id?queued.pose:d.pose?.({camera,orbit,dt});queued=null;if(!pose)return false;
   if(owner!==id){owner=id;transition={from:snapshot(),t:0};}
   let output=pose;
   if(transition){transition.t+=Math.max(0,dt);const u=Math.min(1,transition.t/transitionSeconds),s=u*u*(3-2*u),lerp=(a,b)=>a.map((v,i)=>v+(b[i]-v)*s);output={...pose,position:lerp(transition.from.position,pose.position),target:lerp(transition.from.target,pose.target),fov:transition.from.fov+(pose.fov-transition.from.fov)*s};if(u===1)transition=null;}
   apply(output);return true;
  },
  get state(){return {mode,owner,transitioning:!!transition,directors:[...directors.values()].map(d=>({id:d.id,ready:ready(d.id),priority:d.priority,constraints:d.constraints}))};},
  dispose(){if(disposed)return;disposed=true;for(const d of directors.values())d.dispose?.();directors.clear();queued=null;transition=null;owner=null;}
 };
}
/** Bone anchor follower: keeps the user offset; exponentially smooths moving anchors. */
export function createAnchorCamera(T,getAnchor){let anchor=null;
 return ({camera,orbit,dt})=>{const next=getAnchor();if(!next)return null;if(!anchor)anchor=orbit.target.clone();anchor.lerp(next,1-Math.exp(-Math.max(0,dt)*8));const delta=anchor.clone().sub(orbit.target);return {position:camera.position.clone().add(delta).toArray(),target:anchor.toArray(),fov:camera.fov};};
}
