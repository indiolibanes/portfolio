/**
 * Hsin Combat R2.1 effects: pooled, pre-allocated, driven by the combat clock (never by accumulated dt), so pause,
 * restart and interruption cannot desynchronise them from the choreography.
 *
 * Budget: 7 meshes, 4 geometries, 5 materials, no textures, no render targets, no custom shaders, no bloom pass.
 * Everything is additive MeshBasicMaterial; the ribbon fades per vertex through vertex colours.
 * R2.1.1 presentation pass: the additive layers used to sum to white, so the sphere is a warm gold core (opacity <= .62) under a
 * faint shell; the energy reads in five stages (spark, concentration, accumulation, emission, dissipation); the release is a short
 * thin streak that leaves the dominant palm and the afterglow stays on that palm, never on a point detached from Hsin.
 * Effect transforms are world-space and come from the baked hands, never from the camera. Billboarded pieces (the
 * ribbon width, the impact and energy rings) only orient their faces towards the camera at draw time.
 */
const tris=g=>(g.index?g.index.count:g.attributes.position.count)/3;
const clamp01=v=>Math.max(0,Math.min(1,v));
const smoother=u=>u*u*u*(u*(u*6-15)+10);
const RIBBON_POINTS=20,RIBBON_LIFE=.45,PALM_OFFSET=.085,SPHERE_HZ=2.2,TRAVEL=.8,COMET_LIFE=.26;
const CORE_GOLD=0xffc66e,SHELL_AMBER=0xff9a5e;
export function createCombatVfx({T,scene,camera,by}){
 const group=new T.Group();group.name='Hsin combat R2.1 pooled effects';scene.add(group);
 const additive={transparent:true,depthWrite:false,blending:T.AdditiveBlending};
 const ringMaterial=new T.MeshBasicMaterial({color:0xffd592,opacity:0,...additive});
 const impactMaterial=ringMaterial.clone();
 const ribbonMaterial=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,...additive});
 const coreMaterial=new T.MeshBasicMaterial({color:CORE_GOLD,opacity:0,...additive});
 const shellMaterial=new T.MeshBasicMaterial({color:SHELL_AMBER,opacity:0,...additive});
 const ringGeometry=new T.TorusGeometry(.19,.009,5,48),impactGeometry=new T.RingGeometry(.015,.07,24),sphereGeometry=new T.IcosahedronGeometry(1,2);
 const ribbonGeometry=new T.BufferGeometry(),ribbonPositions=new Float32Array(RIBBON_POINTS*2*3),ribbonColors=new Float32Array(RIBBON_POINTS*2*3);
 const index=[];for(let k=0;k<RIBBON_POINTS-1;k++){const a=2*k;index.push(a,a+1,a+2,a+1,a+3,a+2);}
 ribbonGeometry.setIndex(index);ribbonGeometry.setAttribute('position',new T.BufferAttribute(ribbonPositions,3).setUsage(T.DynamicDrawUsage));ribbonGeometry.setAttribute('color',new T.BufferAttribute(ribbonColors,3).setUsage(T.DynamicDrawUsage));
 const mk=(geometry,material,name)=>{const mesh=new T.Mesh(geometry,material);mesh.name=name;mesh.visible=false;mesh.frustumCulled=false;group.add(mesh);return mesh;};
 const ring=mk(ringGeometry,ringMaterial,'combat ring'),echoA=mk(ringGeometry,ringMaterial,'combat echo A'),echoB=mk(ringGeometry,ringMaterial,'combat echo B');
 const impact=mk(impactGeometry,impactMaterial,'combat impact'),ribbon=mk(ribbonGeometry,ribbonMaterial,'combat ribbon');
 const core=mk(sphereGeometry,coreMaterial,'combat core'),shell=mk(sphereGeometry,shellMaterial,'combat shell');
 const meshes=[ring,echoA,echoB,impact,ribbon,core,shell];
 const bone=name=>by.get(name);
 const hands={R:bone('ORG-Bip001HandR'),L:bone('ORG-Bip001HandL')},forearms={R:bone('ORG-Bip001ForearmR'),L:bone('ORG-Bip001ForearmL')},shoulderR=bone('ORG-Bip001UpperArmR'),shoulderL=bone('ORG-Bip001UpperArmL');
 if(!hands.R||!hands.L||!forearms.R||!forearms.L||!shoulderR||!shoulderL)throw Error('Combat VFX bones missing');
 const v1=new T.Vector3(),v2=new T.Vector3(),v3=new T.Vector3(),v4=new T.Vector3(),palmR=new T.Vector3(),palmL=new T.Vector3(),center=new T.Vector3(),axis=new T.Vector3(),launch=new T.Vector3(),direction=new T.Vector3(),finish=new T.Vector3();
 const q1=new T.Quaternion(),q2=new T.Quaternion(),z=new T.Vector3(0,0,1),colorGold=new T.Color(0xffd9a0),colorRose=new T.Color(0xff8a94),colorComet=new T.Color(0xffd89a);
 const state={energy:-1,trail:'',trailStart:0,trailEnd:0,impact:-1,impactSide:'R',charge:-1,release:-1,radius0:.05,lastTime:-1};
 let tint=colorGold,tintWidth=.022;
 const ribbonPoints=new Float32Array(RIBBON_POINTS*3),ribbonBirth=new Float64Array(RIBBON_POINTS);let ribbonCount=0,lastPoint=-1;
 /** Palm centre: wrist plus a fixed offset along the forearm direction. */
 function palm(side,out){
  hands[side].updateWorldMatrix(true,false);forearms[side].updateWorldMatrix(true,false);
  hands[side].getWorldPosition(out);forearms[side].getWorldPosition(v4);v4.sub(out).negate();
  return out.addScaledVector(v4.normalize(),PALM_OFFSET);
 }
 function addPoint(position,time,minGap=1/60){
  if(lastPoint>=0&&time-lastPoint<minGap&&time>=lastPoint)return;
  if(ribbonCount===RIBBON_POINTS){ribbonPoints.copyWithin(0,3);ribbonBirth.copyWithin(0,1);ribbonCount--;}
  position.toArray(ribbonPoints,ribbonCount*3);ribbonBirth[ribbonCount]=time;ribbonCount++;lastPoint=time;
 }
 function drawRibbon(time,color,width,life=RIBBON_LIFE){
  let alive=0;
  for(let k=0;k<RIBBON_POINTS;k++){
   const live=k<ribbonCount,i=Math.min(k,ribbonCount-1);
   if(ribbonCount===0){ribbonPositions.fill(0,k*6,k*6+6);ribbonColors.fill(0,k*6,k*6+6);continue;}
   const age=live?time-ribbonBirth[i]:life,a=clamp01(1-age/life),s=ribbonCount>1?i/(ribbonCount-1):1;
   if(live&&a>.01)alive++;
   const p0=Math.max(0,i-1),p1=Math.min(ribbonCount-1,i+1);
   v1.set(ribbonPoints[i*3],ribbonPoints[i*3+1],ribbonPoints[i*3+2]);
   v2.set(ribbonPoints[p1*3]-ribbonPoints[p0*3],ribbonPoints[p1*3+1]-ribbonPoints[p0*3+1],ribbonPoints[p1*3+2]-ribbonPoints[p0*3+2]);
   v3.copy(camera.position).sub(v1);v2.cross(v3);
   if(v2.lengthSq()<1e-12)v2.set(0,1,0);v2.normalize();
   const w=width*(.12+.88*s)*a;
   ribbonPositions[k*6]=v1.x-v2.x*w;ribbonPositions[k*6+1]=v1.y-v2.y*w;ribbonPositions[k*6+2]=v1.z-v2.z*w;
   ribbonPositions[k*6+3]=v1.x+v2.x*w;ribbonPositions[k*6+4]=v1.y+v2.y*w;ribbonPositions[k*6+5]=v1.z+v2.z*w;
   const c=a*a*(live?1:0)*.45;
   ribbonColors[k*6]=ribbonColors[k*6+3]=color.r*c;ribbonColors[k*6+1]=ribbonColors[k*6+4]=color.g*c;ribbonColors[k*6+2]=ribbonColors[k*6+5]=color.b*c;
  }
  ribbonGeometry.attributes.position.needsUpdate=true;ribbonGeometry.attributes.color.needsUpdate=true;
  return alive>1;
 }
 function clearRibbon(){ribbonCount=0;lastPoint=-1;ribbon.visible=false;}
 function hide(){for(const mesh of meshes)mesh.visible=false;ringMaterial.opacity=impactMaterial.opacity=coreMaterial.opacity=shellMaterial.opacity=0;}
 function resetState(){state.energy=-1;state.trail='';state.impact=-1;state.charge=-1;state.release=-1;state.lastTime=-1;clearRibbon();}
 function sphereGeometryNow(){
  palm('R',palmR);palm('L',palmL);center.copy(palmR).add(palmL).multiplyScalar(.5);axis.copy(palmL).sub(palmR);
  const gap=axis.length();if(gap>1e-6)axis.multiplyScalar(1/gap);else axis.set(1,0,0);
  // Sized by the space the hands actually form, never larger than the gap minus the palms' thickness.
  return Math.max(.02,Math.min(gap*.3,gap/2-.04));
 }
 const api={
  /** Marker events from the combat director. `time` is the combat clock at the marker. */
  event(name,time){
   if(name==='clear'){resetState();hide();return;}
   if(name==='energy'){state.energy=time;}
   else if(name==='trail'||name==='trail-left'){state.trail=name==='trail'?'R':'L';state.trailStart=time;state.trailEnd=time+.62;clearRibbon();}
   else if(name==='arc'||name==='arc-left'){state.impact=time;state.impactSide=name==='arc'?'R':'L';palm(state.impactSide,finish);}
   else if(name==='charge'){state.charge=time;}
   else if(name==='ring'){
    if(state.charge<0)state.charge=time-1;
    state.radius0=sphereGeometryNow();
    launch.copy(center);
    hands.R.updateWorldMatrix(true,false);shoulderR.updateWorldMatrix(true,false);hands.R.getWorldPosition(direction);shoulderR.getWorldPosition(v1);
    direction.sub(v1);direction.y*=.35;direction.normalize();
    // lean the launch towards Hsin's own forward (her left-right axis x up) so the energy stays in front of her instead of leaving the frame sideways
    shoulderL.updateWorldMatrix(true,false);shoulderL.getWorldPosition(v2);v2.sub(v1);v2.y=0;
    if(v2.lengthSq()>1e-8){v2.normalize();v3.set(0,1,0);v3.crossVectors(v2,v3);direction.multiplyScalar(.4).addScaledVector(v3,.6).normalize();}
    state.release=time;clearRibbon();
   }
  },
  /** Advance to the combat clock `time`. Paused time (same value) does not add ribbon points. */
  update(time){
   const advancing=time!==state.lastTime;state.lastTime=time;
   ring.visible=echoA.visible=echoB.visible=impact.visible=core.visible=shell.visible=false;
   // energy glint at the right palm
   if(state.energy>=0){
    const u=(time-state.energy)/.55;
    if(u>=0&&u<1){palm('R',v1);ring.position.copy(v1);ring.quaternion.copy(camera.quaternion);ring.scale.setScalar(.45+u*.35);ringMaterial.opacity=(1-u)*.5;ring.visible=true;}
   }
   // Basic trails: the crescent follows the palm that carries the strike
   if(state.trail){
    if(time>=state.trailEnd)state.trail='';
    else if(time>=state.trailStart){
     if(advancing){palm(state.trail,v1);addPoint(v1,time);}
     tint=state.trail==='R'?colorGold:colorRose;tintWidth=.016;
    }
   }
   // impact accent where the strike peaked
   if(state.impact>=0){
    const u=(time-state.impact)/.42;
    if(u>=0&&u<1){impact.position.copy(finish);impact.quaternion.copy(camera.quaternion);impact.scale.setScalar(1+u*2.6);impactMaterial.color.set(state.impactSide==='R'?0xffd592:0xff747e);impactMaterial.opacity=(1-u)*.85;impact.visible=true;}
   }
   // Skill: the sphere between the hands. Stages by age since the charge marker (3.95 s):
   // spark (0-.4 s) -> concentration (the halo closes in on the core) -> accumulation (brighter, quicker pulse, never white).
   if(state.charge>=0&&(state.release<0||time<state.release)){
    const age=time-state.charge;
    if(age>=0){
     const grow=smoother(clamp01(age/1.1)),build=smoother(clamp01((age-.4)/1.1)),r=sphereGeometryNow()*grow;
     const phase=2*Math.PI*(SPHERE_HZ*age+.4*age*age),beat=Math.sin(phase);
     core.position.copy(center);core.scale.setScalar(Math.max(1e-4,r*(1+(.04+.04*build)*beat*grow)));coreMaterial.opacity=(.3+.32*build)*grow;core.visible=true;
     shell.position.copy(center);shell.scale.setScalar(Math.max(1e-4,r*(1.32-.05*beat*grow)));shellMaterial.opacity=(.07+.08*build)*grow;shell.visible=true;
     // a thin halo perpendicular to the line between the palms (independent of the camera) that closes in on the core
     const closing=smoother(clamp01((age-.2)/1.2));
     ring.position.copy(center);q1.setFromUnitVectors(z,axis);ring.quaternion.copy(q1).multiply(q2.setFromAxisAngle(z,age*1.4));
     ring.scale.setScalar(Math.max(1e-4,r*(2.9-1.1*closing)/.19));ringMaterial.opacity=(.3-.14*closing)*grow;ring.visible=true;
    }
   }
   // Release (emission): a short streak leaves the dominant palm; the shockwave faces the travel direction; the glow stays on the palm.
   if(state.release>=0&&time>=state.release){
    const age=time-state.release,u=clamp01(age/.5),s=1-(1-u)*(1-u)*(1-u),pull=smoother(clamp01(age/.2));
    palm('R',v2);
    v1.copy(launch).lerp(v2,pull).addScaledVector(direction,TRAVEL*s);
    if(age<.55){
     const fade=1-smoother(clamp01((age-.24)/.2));
     core.position.copy(v1);core.scale.setScalar(Math.max(1e-4,state.radius0*(1-.7*u)));coreMaterial.opacity=.62*fade;core.visible=true;
     if(advancing&&age<.5)addPoint(v1,time);
     tint=colorComet;tintWidth=Math.max(.004,state.radius0*.1);
     q1.setFromUnitVectors(z,direction);
     ring.position.copy(v2).addScaledVector(direction,.3*TRAVEL*s);ring.quaternion.copy(q1);ring.scale.setScalar(.26+age*.75);ringMaterial.opacity=(1-clamp01(age/.5))*.35;ring.visible=true;
     for(const [echo,k] of [[echoA,1],[echoB,2]]){echo.position.copy(v2).addScaledVector(direction,.3*TRAVEL*s-.1*k);echo.quaternion.copy(q1);echo.scale.setScalar((.4+age*.6)*k*.42);echo.visible=true;}
    }
    if(age>=.4&&age<.85){const w=(age-.4)/.45;finish.copy(launch).addScaledVector(direction,TRAVEL);impact.position.copy(finish);impact.quaternion.copy(camera.quaternion);impact.scale.setScalar(1+w*2.2);impactMaterial.color.set(0xffd89a);impactMaterial.opacity=(1-w)*.55;impact.visible=true;}
    // dissipation: a faint amber remnant on the dominant palm that drifts up and fades while the body recovers
    const glow=clamp01(age/.95);
    if(glow<1){
     shell.position.copy(v2);shell.position.y+=.04*glow;shell.scale.setScalar(Math.max(1e-4,state.radius0*(.9+.4*glow)));shellMaterial.opacity=.11*(1-glow)*(1-glow);shell.visible=true;
    }
   }
   if(ribbonCount>0){const alive=drawRibbon(time,tint,tintWidth,tint===colorComet?COMET_LIFE:RIBBON_LIFE);ribbon.visible=alive;if(!alive&&ribbonCount>=2)clearRibbon();}
  },
  clear(){resetState();hide();},
  /** QA probe: world positions, radii and NDC of the pieces that carry the Skill read. Read-only, allocates, call from diagnostics only. */
  probe(){
   const ndc=p=>{const q=p.clone().project(camera);return [+q.x.toFixed(4),+q.y.toFixed(4)];};
   palm('R',v1);palm('L',v2);const mid=v1.clone().add(v2).multiplyScalar(.5);
   const piece=m=>({visible:m.visible,position:m.position.toArray().map(x=>+x.toFixed(4)),scale:+m.scale.x.toFixed(4),ndc:m.visible?ndc(m.position):null});
   return {palmR:v1.toArray().map(x=>+x.toFixed(4)),palmL:v2.toArray().map(x=>+x.toFixed(4)),palmMid:mid.toArray().map(x=>+x.toFixed(4)),palmMidNdc:ndc(mid),palmRNdc:ndc(v1),palmLNdc:ndc(v2),
    core:piece(core),shell:piece(shell),ring:piece(ring),opacity:{core:+coreMaterial.opacity.toFixed(3),shell:+shellMaterial.opacity.toFixed(3),ring:+ringMaterial.opacity.toFixed(3)},ribbonVisible:ribbon.visible};
  },
  visibleDrawCalls:()=>meshes.reduce((n,m)=>n+(m.visible?1:0),0),
  budget:{meshes:meshes.length,geometries:4,materials:5,textures:0,renderTargets:0,customShaders:0,
   triangles:tris(ringGeometry)*3+tris(impactGeometry)+tris(sphereGeometry)*2+(RIBBON_POINTS-1)*2},
  dispose(){resetState();hide();scene.remove(group);ringGeometry.dispose();impactGeometry.dispose();sphereGeometry.dispose();ribbonGeometry.dispose();ringMaterial.dispose();impactMaterial.dispose();ribbonMaterial.dispose();coreMaterial.dispose();shellMaterial.dispose();},
 };
 hide();
 return api;
}
