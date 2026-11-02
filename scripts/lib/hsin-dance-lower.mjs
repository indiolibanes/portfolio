/** Offline two-bone support solve on the actual rig. Never imported by the stage. */
export function createLowerSolver(r){
 const {T}=r,V=()=>new T.Vector3(),Q=()=>new T.Quaternion();
 const P=n=>r.by.get(n).getWorldPosition(V()),W=n=>r.by.get(n).getWorldQuaternion(Q()).normalize();
 const root=r.model.getObjectByName('RIG-R2T1XinMd10011_LOD0_Skeleton');
 if(!root||root.isBone)throw Error('Expected common skeleton Object3D');
 const state=r.bones.map(b=>({b,p:b.position.clone(),q:b.quaternion.clone()}));
 const rootRest=root.position.clone(),rootWorld=root.getWorldPosition(V());
 const world=new Map(r.bones.map(b=>[b.name,{p:P(b.name),q:W(b.name)}]));
 const axes={lateral:P('ORG-Bip001ThighL').sub(P('ORG-Bip001ThighR')).setY(0).normalize(),up:new T.Vector3(0,1,0)};
 axes.forward=axes.lateral.clone().cross(axes.up).normalize();
 function reset(){for(const x of state){x.b.position.copy(x.p);x.b.quaternion.copy(x.q);x.b.updateMatrix();}root.position.copy(rootRest);root.updateMatrix();r.model.updateMatrixWorld(true);}
 function setRootWorldDelta(delta){root.position.copy(root.parent.worldToLocal(rootWorld.clone().add(delta)));root.updateMatrix();r.model.updateMatrixWorld(true);}
 function setWorldQ(b,q){b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(q)).normalize();b.updateMatrix();r.model.updateMatrixWorld(true);}
 function solve(side,target,footWorldQ=world.get('ORG-Bip001Foot'+side).q){
  const names=['Thigh','Calf','Foot'].map(a=>'ORG-Bip001'+a+side),[th,ca,fo]=names.map(n=>r.by.get(n));
  const h=P(names[0]),h0=world.get(names[0]).p,k0=world.get(names[1]).p,a0=world.get(names[2]).p;
  const l1=h0.distanceTo(k0),l2=k0.distanceTo(a0),e=target.clone().sub(h),d=e.length();
  if(d>=l1+l2-1e-6||d<=Math.abs(l1-l2)+1e-6)throw Error('Outside safe two-bone reach '+side+': '+d);
  e.divideScalar(d);const x=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-x*x));
  const restLine=a0.clone().sub(h0).normalize();
  const pole=k0.clone().sub(h0).addScaledVector(restLine,-k0.clone().sub(h0).dot(restLine));
  pole.addScaledVector(e,-pole.dot(e));
  if(pole.lengthSq()<1e-10)throw Error('Degenerate knee pole '+side);
  pole.normalize();const knee=h.clone().addScaledVector(e,x).addScaledVector(pole,height);
  const tq=Q().setFromUnitVectors(k0.clone().sub(h0).normalize(),knee.clone().sub(h).normalize()).multiply(world.get(names[0]).q);
  const cq=Q().setFromUnitVectors(a0.clone().sub(k0).normalize(),target.clone().sub(knee).normalize()).multiply(world.get(names[1]).q);
  setWorldQ(th,tq);setWorldQ(ca,cq);setWorldQ(fo,footWorldQ);
  // Split 001 local reference quaternions are left unchanged, preserving half-segment offsets.
  for(const part of ['Thigh','Calf','Foot','Toe0']){
   const n='ORG-Bip001'+part+side,dn='DEF-Bip001'+part+side;
   const desired=W(n).multiply(world.get(n).q.clone().invert()).multiply(world.get(dn).q);
   setWorldQ(r.by.get(dn),desired);
  }
  return {distance:d,knee:knee.toArray(),targetError:P(names[2]).distanceTo(target),gap:Math.max(...['Thigh','Calf','Foot','Toe0'].map(p=>P('ORG-Bip001'+p+side).distanceTo(P('DEF-Bip001'+p+side))))};
 }
 return {axes,root,world,state,reset,setRootWorldDelta,solve};
}
