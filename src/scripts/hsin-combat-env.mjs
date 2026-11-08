import {createEnvSim,CAPACITY,GEOMETRY_TRIANGLES,WORST_CASE_TRIANGLES} from './hsin-combat-env-sim.mjs';
/**
 * Hsin Combat R2.2: environmental effects (opt-in extension of the combat lab).
 *
 * Owns only the THREE objects: three InstancedMeshes (seal rings and floor ripples, diamond shards, four-point star glints)
 * that share ONE additive vertex-coloured material, so the whole layer is at most 3 draw calls, 1 material, 3 geometries,
 * no textures, no render targets, no custom shaders. All instance buffers are allocated once; `update` allocates nothing.
 * What exists and where is decided by the pure simulation (hsin-combat-env-sim.mjs) as a function of the combat clock, fed
 * with the real skeleton: the same palm centres as the R2.1 effects, the real foot/toe heights (planted test) and the real pelvis
 * lateral shift over the feet (weight transfer). It never starts a loop of its own: the lab and the acceptance harness call `update(time)`.
 */
const FOOT=['ORG-Bip001FootR','ORG-Bip001FootL'],TOE=['ORG-Bip001Toe0R','ORG-Bip001Toe0L'];
const PLANT_TOE=.03,PLANT_FOOT=.045,FALLBACK_TOE=.06,FALLBACK_FOOT=.09,GROUND_SLACK=.12;
export function createCombatEnv({T,scene,camera,by,vfx,density=1}){
 const group=new T.Group();group.name='Hsin combat R2.2 environment effects';group.visible=false;scene.add(group);
 // --- shared geometries (unit size; the simulation scales them per instance) ---
 const ringGeometry=(()=>{ // soft line: three radial rows, 48 segments, plus 12 short ticks so the slow spin reads
  const seg=48,rows=[[.935,0],[.985,1],[1.035,0]],pos=[],col=[],idx=[];
  for(const [r,c] of rows)for(let i=0;i<seg;i++){const a=i/seg*Math.PI*2;pos.push(Math.cos(a)*r,0,-Math.sin(a)*r);col.push(c,c,c);}
  for(let row=0;row<2;row++)for(let i=0;i<seg;i++){const a=row*seg+i,b=row*seg+(i+1)%seg,c=(row+1)*seg+i,d=(row+1)*seg+(i+1)%seg;idx.push(a,c,b,b,c,d);}
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,w=.05,base=pos.length/3;
   pos.push(Math.cos(a-w)*1.035,0,-Math.sin(a-w)*1.035,Math.cos(a+w)*1.035,0,-Math.sin(a+w)*1.035,Math.cos(a)*(i%3?1.09:1.17),0,-Math.sin(a)*(i%3?1.09:1.17));
   col.push(.5,.5,.5,.5,.5,.5,0,0,0);idx.push(base,base+1,base+2);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);return g;
 })();
 const shardGeometry=(()=>{ // two crossed flat kites (long axis +Y): 4 triangles, one layer wherever it is seen from, so brightness is not doubled by back faces
  const pos=[0,1,0,1,0,0,0,-1,0,-1,0,0,0,0,1,0,0,-1],col=[.55,.55,.55,1,1,1,.55,.55,.55,1,1,1,1,1,1,1,1,1];
  const idx=[0,1,3,2,3,1,0,4,5,2,5,4];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);return g;
 })();
 const glintGeometry=(()=>{ // four long spikes with short diagonals, facing +Z
  const pos=[0,0,0],col=[1,1,1];
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,r=i%2?.2:1;pos.push(Math.cos(a)*r,Math.sin(a)*r,0);const c=i%2?.5:.3;col.push(c,c,c);}
  const idx=[];for(let i=0;i<8;i++)idx.push(0,1+i,1+(i+1)%8);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('color',new T.Float32BufferAttribute(col,3));g.setIndex(idx);return g;
 })();
 const material=new T.MeshBasicMaterial({vertexColors:true,transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,forceSinglePass:true}); // additive: order-independent, so one pass (a double-sided transparent material would be drawn twice)
 const make=(geometry,count,name)=>{
  const mesh=new T.InstancedMesh(geometry,material,count);mesh.name=name;mesh.frustumCulled=false;mesh.count=0;mesh.visible=false;
  mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
  mesh.instanceColor=new T.InstancedBufferAttribute(new Float32Array(count*3),3);mesh.instanceColor.setUsage(T.DynamicDrawUsage);
  group.add(mesh);return mesh;
 };
 const rings=make(ringGeometry,CAPACITY.rings,'env seal rings'),shards=make(shardGeometry,CAPACITY.shards,'env shards'),glints=make(glintGeometry,CAPACITY.glints,'env glints');
 const meshes=[rings,shards,glints];
 const out={ringM:rings.instanceMatrix.array,ringC:rings.instanceColor.array,shardM:shards.instanceMatrix.array,shardC:shards.instanceColor.array,glintM:glints.instanceMatrix.array,glintC:glints.instanceColor.array,rings:0,shards:0,glints:0};
 // --- skeleton access ---
 const bone=name=>by.get(name);
 const pelvis=bone('ORG-Bip001Pelvis'),shoulderR=bone('ORG-Bip001UpperArmR'),shoulderL=bone('ORG-Bip001UpperArmL');
 const feet=FOOT.map(bone),toes=TOE.map(bone);
 if(!pelvis||!shoulderR||!shoulderL||feet.some(b=>!b)||toes.some(b=>!b))throw Error('Combat environment bones missing');
 let sim=createEnvSim({density}),density0=density;
 const pr=new T.Vector3(),pl=new T.Vector3(),a=new T.Vector3(),b=new T.Vector3(),left=new T.Vector3(),fwd=new T.Vector3(),launchDir=new T.Vector3(),up=new T.Vector3(0,1,0),qv=new T.Vector3();
 const ex={pr:[0,0,0],pl:[0,0,0],vr:[0,0,0],vl:[0,0,0],c:[0,0,0],s:0,mid:[0,0,0]};
 const pose={pr:[0,0,0],pl:[0,0,0],c:[0,0,0],s:0,gap:.24,footX:[0,0],footZ:[0,0],planted:[1,1],mid:[0,0,0],rd:[0,0,1]};
 const view={rx:1,ry:0,rz:0,ux:0,uy:1,uz:0,fx:0,fy:0,fz:1};
 const prev={pr:[0,0,0],pl:[0,0,0],t:-1},hf=[0,0],ht=[0,0];
 const base={toe:[FALLBACK_TOE,FALLBACK_TOE],foot:[FALLBACK_FOOT,FALLBACK_FOOT],s:0,set:false};
 let lastTime=-1,drawn=0,disposed=false;
 function wp(o,v){o.updateWorldMatrix(true,false);return o.getWorldPosition(v);}
 /** Fill `pose` from the live skeleton. Pure reads, no allocation. */
 function sample(t){
  vfx.palms(pr,pl);
  wp(shoulderR,a);wp(shoulderL,left);left.sub(a);left.y=0;if(left.lengthSq()>1e-8)left.normalize();else left.set(1,0,0);
  fwd.crossVectors(left,up); // Hsin's forward
  let mx=0,mz=0;
  for(let f=0;f<2;f++){
   wp(feet[f],a);wp(toes[f],b);
   pose.footX[f]=(a.x+b.x)*.5;pose.footZ[f]=(a.z+b.z)*.5;mx+=pose.footX[f]*.5;mz+=pose.footZ[f]*.5;
   hf[f]=a.y;ht[f]=b.y;
   if(!base.set&&t<.5){base.toe[f]=Math.min(b.y,FALLBACK_TOE*4);base.foot[f]=Math.min(a.y,FALLBACK_FOOT*4);}
  }
  // A foot is planted when its toe and ankle are no higher than the other foot's by more than a step's worth, and the lower foot is on the rest contact height
  // (relative test: robust to any uniform vertical offset the stage applies to the whole body; the rest heights are measured, not assumed).
  const lowToe=Math.min(ht[0],ht[1]),lowFoot=Math.min(hf[0],hf[1]),groundOk=lowToe-Math.min(base.toe[0],base.toe[1])<GROUND_SLACK;
  for(let f=0;f<2;f++)pose.planted[f]=groundOk&&(ht[f]-lowToe)<PLANT_TOE&&(hf[f]-lowFoot)<PLANT_FOOT?1:0;
  pose.mid[0]=mx;pose.mid[1]=0;pose.mid[2]=mz;
  wp(pelvis,a);const raw=(a.x-mx)*left.x+(a.z-mz)*left.z;
  if(!base.set&&t<.5){base.s=raw;base.set=true;}
  pose.s=raw-base.s;
  pose.pr[0]=pr.x;pose.pr[1]=pr.y;pose.pr[2]=pr.z;pose.pl[0]=pl.x;pose.pl[1]=pl.y;pose.pl[2]=pl.z;
  pose.c[0]=(pr.x+pl.x)*.5;pose.c[1]=(pr.y+pl.y)*.5;pose.c[2]=(pr.z+pl.z)*.5;
  pose.gap=Math.hypot(pr.x-pl.x,pr.y-pl.y,pr.z-pl.z);
  // before the release the fan direction is Hsin's forward leaning towards the dominant arm; the 'ring' marker replaces it with the R2.1 launch
  pose.rd[0]=fwd.x;pose.rd[1]=.1;pose.rd[2]=fwd.z;
 }
 function cameraView(){
  qv.set(1,0,0).applyQuaternion(camera.quaternion);view.rx=qv.x;view.ry=qv.y;view.rz=qv.z;
  qv.set(0,1,0).applyQuaternion(camera.quaternion);view.ux=qv.x;view.uy=qv.y;view.uz=qv.z;
  qv.set(0,0,1).applyQuaternion(camera.quaternion);view.fx=qv.x;view.fy=qv.y;view.fz=qv.z;
 }
 const api={
  /** Marker events from the combat director (call after vfx.event so the R2.1 launch direction is known). */
  event(name,time){
   if(disposed)return;
   if(name==='clear'){api.clear();return;}
   sample(time);
   if(name==='ring'){vfx.launch(launchDir);pose.rd[0]=launchDir.x;pose.rd[1]=launchDir.y;pose.rd[2]=launchDir.z;sim.inp.rd.set(pose.rd);}
   const dt=prev.t>=0&&time>prev.t?time-prev.t:0;
   for(let i=0;i<3;i++){ex.vr[i]=dt?(pose.pr[i]-prev.pr[i])/dt:0;ex.vl[i]=dt?(pose.pl[i]-prev.pl[i])/dt:0;}
   ex.pr=pose.pr;ex.pl=pose.pl;ex.c=pose.c;ex.s=pose.s;ex.mid=pose.mid;
   sim.event(name,time,ex);
  },
  /** Advance to the combat clock `time`. Same value (pause) re-draws the same frame; a smaller value restarts the effects. */
  update(time){
   if(disposed)return;
   if(time<lastTime-1e-9){sim.reset();prev.t=-1;}
   sample(time);
   sim.update(time,pose);
   prev.pr[0]=pose.pr[0];prev.pr[1]=pose.pr[1];prev.pr[2]=pose.pr[2];prev.pl[0]=pose.pl[0];prev.pl[1]=pose.pl[1];prev.pl[2]=pose.pl[2];prev.t=time;lastTime=time;
   if(!sim.active(time)){api.hide();return;}
   cameraView();sim.write(time,view,out);
   const n=[out.rings,out.shards,out.glints];
   for(let i=0;i<3;i++){
    const mesh=meshes[i];mesh.count=n[i];mesh.visible=n[i]>0;
    if(n[i]>0){mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;}
   }
   drawn=n[0]*GEOMETRY_TRIANGLES.ring+n[1]*GEOMETRY_TRIANGLES.shard+n[2]*GEOMETRY_TRIANGLES.glint;
   group.visible=drawn>0;
  },
  hide(){for(const m of meshes){m.count=0;m.visible=false;}group.visible=false;drawn=0;},
  clear(){sim.reset();prev.t=-1;lastTime=-1;api.hide();},
  /** Reduce (or restore) the density of the small fragments. Restarts the effect field; never touches the body animation. */
  setDensity(value){const d=Math.max(.2,Math.min(1,value));if(d===density0)return;density0=d;sim=createEnvSim({density:d});prev.t=-1;lastTime=-1;api.hide();},
  get density(){return density0;},
  visibleDrawCalls:()=>group.visible?meshes.reduce((n,m)=>n+(m.visible&&m.count>0?1:0),0):0,
  /** QA probe (allocates; diagnostics only). */
  probe(){return {instances:{rings:rings.count,shards:shards.count,glints:glints.count},triangles:drawn,stats:{...sim.state.stats},baseline:{toe:[...base.toe],foot:[...base.foot],shift:+base.s.toFixed(4),measured:base.set},planted:[...pose.planted],heights:{toe:ht.map(x=>+x.toFixed(4)),foot:hf.map(x=>+x.toFixed(4))},pelvisShift:+pose.s.toFixed(4),density:density0};},
  budget:{meshes:3,geometries:3,materials:1,textures:0,renderTargets:0,customShaders:0,capacity:{...CAPACITY},triangles:WORST_CASE_TRIANGLES,maxDrawCalls:3},
  group,
  dispose(){
   if(disposed)return;disposed=true;api.hide();scene.remove(group);
   for(const m of meshes){group.remove(m);m.dispose();}
   ringGeometry.dispose();shardGeometry.dispose();glintGeometry.dispose();material.dispose();
  },
 };
 return api;
}
