/**
 * Hsin Combat R2.1 effects: pooled, pre-allocated, driven by the combat clock (never by accumulated dt), so pause,
 * restart and interruption cannot desynchronise them from the choreography.
 *
 * Budget: 7 meshes, 4 geometries, 5 materials, no textures, no render targets, no custom shaders, no bloom pass.
 * Everything is additive MeshBasicMaterial; the ribbon fades per vertex through vertex colours.
 * Effect transforms are world-space and come from the baked hands, never from the camera. Billboarded pieces (the
 * ribbon width, the impact and energy rings) only orient their faces towards the camera at draw time.
 */
const tris=g=>(g.index?g.index.count:g.attributes.position.count)/3;
const clamp01=v=>Math.max(0,Math.min(1,v));
const smoother=u=>u*u*u*(u*(u*6-15)+10);
const RIBBON_POINTS=20,RIBBON_LIFE=.5,PALM_OFFSET=.085,SPHERE_HZ=2.2;
export function createCombatVfx({T,scene,camera,by}){
 const group=new T.Group();group.name='Hsin combat R2.1 pooled effects';scene.add(group);
 const additive={transparent:true,depthWrite:false,blending:T.AdditiveBlending};
 const ringMaterial=new T.MeshBasicMaterial({color:0xffd592,opacity:0,...additive});
 const impactMaterial=ringMaterial.clone();
 const ribbonMaterial=new T.MeshBasicMaterial({vertexColors:true,side:T.DoubleSide,...additive});
 const coreMaterial=new T.MeshBasicMaterial({color:0xffe2a8,opacity:0,...additive});
 const shellMaterial=new T.MeshBasicMaterial({color:0xff9a6b,opacity:0,...additive});
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
 const hands={R:bone('ORG-Bip001HandR'),L:bone('ORG-Bip001HandL')},forearms={R:bone('ORG-Bip001ForearmR'),L:bone('ORG-Bip001ForearmL')},shoulderR=bone('ORG-Bip001UpperArmR');
 if(!hands.R||!hands.L||!forearms.R||!forearms.L||!shoulderR)throw Error('Combat VFX bones missing');
 const v1=new T.Vector3(),v2=new T.Vector3(),v3=new T.Vector3(),v4=new T.Vector3(),palmR=new T.Vector3(),palmL=new T.Vector3(),center=new T.Vector3(),axis=new T.Vector3(),launch=new T.Vector3(),direction=new T.Vector3(),finish=new T.Vector3();
 const q1=new T.Quaternion(),q2=new T.Quaternion(),z=new T.Vector3(0,0,1),colorGold=new T.Color(0xffd9a0),colorRose=new T.Color(0xff8a94),colorComet=new T.Color(0xfff0c8);
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
 function drawRibbon(time,color,width){
  let alive=0;
  for(let k=0;k<RIBBON_POINTS;k++){
   const live=k<ribbonCount,i=Math.min(k,ribbonCount-1);
   if(ribbonCount===0){ribbonPositions.fill(0,k*6,k*6+6);ribbonColors.fill(0,k*6,k*6+6);continue;}
   const age=live?time-ribbonBirth[i]:RIBBON_LIFE,a=clamp01(1-age/RIBBON_LIFE),s=ribbonCount>1?i/(ribbonCount-1):1;
   if(live&&a>.01)alive++;
   const p0=Math.max(0,i-1),p1=Math.min(ribbonCount-1,i+1);
   v1.set(ribbonPoints[i*3],ribbonPoints[i*3+1],ribbonPoints[i*3+2]);
   v2.set(ribbonPoints[p1*3]-ribbonPoints[p0*3],ribbonPoints[p1*3+1]-ribbonPoints[p0*3+1],ribbonPoints[p1*3+2]-ribbonPoints[p0*3+2]);
   v3.copy(camera.position).sub(v1);v2.cross(v3);
   if(v2.lengthSq()<1e-12)v2.set(0,1,0);v2.normalize();
   const w=width*(.12+.88*s)*a;
   ribbonPositions[k*6]=v1.x-v2.x*w;ribbonPositions[k*6+1]=v1.y-v2.y*w;ribbonPositions[k*6+2]=v1.z-v2.z*w;
   ribbonPositions[k*6+3]=v1.x+v2.x*w;ribbonPositions[k*6+4]=v1.y+v2.y*w;ribbonPositions[k*6+5]=v1.z+v2.z*w;
   const c=a*a*(live?1:0)*.9;
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
  return Math.max(.02,Math.min(gap*.36,gap/2-.035));
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
    if(u>=0&&u<1){palm('R',v1);ring.position.copy(v1);ring.quaternion.copy(camera.quaternion);ring.scale.setScalar(.45+u*.35);ringMaterial.opacity=(1-u)*.7;ring.visible=true;}
   }
   // Basic trails: the crescent follows the palm that carries the strike
   if(state.trail){
    if(time>=state.trailEnd)state.trail='';
    else if(time>=state.trailStart){
     if(advancing){palm(state.trail,v1);addPoint(v1,time);}
     tint=state.trail==='R'?colorGold:colorRose;tintWidth=.026;
    }
   }
   // impact accent where the strike peaked
   if(state.impact>=0){
    const u=(time-state.impact)/.42;
    if(u>=0&&u<1){impact.position.copy(finish);impact.quaternion.copy(camera.quaternion);impact.scale.setScalar(1+u*3.2);impactMaterial.color.set(state.impactSide==='R'?0xffd592:0xff747e);impactMaterial.opacity=(1-u)*1.1;impact.visible=true;}
   }
   // Skill: the sphere between the hands
   if(state.charge>=0&&(state.release<0||time<state.release)){
    const age=time-state.charge;
    if(age>=0){
     const grow=smoother(clamp01(age/.95)),r=sphereGeometryNow()*grow,beat=Math.sin(2*Math.PI*SPHERE_HZ*age);
     core.position.copy(center);core.scale.setScalar(Math.max(1e-4,r*(1+.05*beat*grow)));coreMaterial.opacity=.9*grow;core.visible=true;
     shell.position.copy(center);shell.scale.setScalar(Math.max(1e-4,r*(1.4-.06*beat*grow)));shellMaterial.opacity=.3*grow;shell.visible=true;
     // a halo around the sphere, perpendicular to the line between the palms (independent of the camera)
     ring.position.copy(center);q1.setFromUnitVectors(z,axis);ring.quaternion.copy(q1).multiply(q2.setFromAxisAngle(z,age*1.4));
     ring.scale.setScalar(Math.max(1e-4,r*2.1/.19));ringMaterial.opacity=.42*grow;ring.visible=true;
    }
   }
   // Release: the sphere leaves along the dominant forearm; the shockwave faces the travel direction; the shell lingers
   if(state.release>=0&&time>=state.release){
    const age=time-state.release,u=clamp01(age/.5),s=1-(1-u)*(1-u)*(1-u);
    v1.copy(launch).addScaledVector(direction,1.5*s);
    if(age<.55){
     const fade=1-smoother(clamp01((age-.36)/.19));
     core.position.copy(v1);core.scale.setScalar(Math.max(1e-4,state.radius0*(1-.4*u)));coreMaterial.opacity=.95*fade;core.visible=true;
     if(advancing&&age<.5)addPoint(v1,time);
     tint=colorComet;tintWidth=Math.max(.012,state.radius0*.7);
     q1.setFromUnitVectors(z,direction);
     ring.position.copy(launch).addScaledVector(direction,.8*s);ring.quaternion.copy(q1);ring.scale.setScalar(.55+age*2.6);ringMaterial.opacity=(1-clamp01(age/.5))*.85;ring.visible=true;
     for(const [echo,k] of [[echoA,1],[echoB,2]]){echo.position.copy(launch).addScaledVector(direction,.8*s-.12*k);echo.quaternion.copy(q1);echo.scale.setScalar((.8+age*1.2)*k*.7);echo.visible=true;}
    }
    if(age>=.4&&age<.85){const w=(age-.4)/.45;finish.copy(launch).addScaledVector(direction,1.5);impact.position.copy(finish);impact.quaternion.copy(camera.quaternion);impact.scale.setScalar(1+w*4.5);impactMaterial.color.set(0xfff0c8);impactMaterial.opacity=(1-w)*1.2;impact.visible=true;}
    // afterglow: a faint remnant between the hands that drifts up and dissipates while the body recovers
    const glow=clamp01(age/1.3);
    if(glow<1){
     sphereGeometryNow();shell.position.copy(center);shell.position.y+=.05*glow;shell.scale.setScalar(Math.max(1e-4,state.radius0*(1.4+.5*glow)));shellMaterial.opacity=.3*(1-glow)*(1-glow);shell.visible=true;
    }
   }
   if(ribbonCount>0){const alive=drawRibbon(time,tint,tintWidth);ribbon.visible=alive;if(!alive&&ribbonCount>=2)clearRibbon();}
  },
  clear(){resetState();hide();},
  visibleDrawCalls:()=>meshes.reduce((n,m)=>n+(m.visible?1:0),0),
  budget:{meshes:meshes.length,geometries:4,materials:5,textures:0,renderTargets:0,customShaders:0,
   triangles:tris(ringGeometry)*3+tris(impactGeometry)+tris(sphereGeometry)*2+(RIBBON_POINTS-1)*2},
  dispose(){resetState();hide();scene.remove(group);ringGeometry.dispose();impactGeometry.dispose();sphereGeometry.dispose();ribbonGeometry.dispose();ringMaterial.dispose();impactMaterial.dispose();ribbonMaterial.dispose();coreMaterial.dispose();shellMaterial.dispose();},
 };
 hide();
 return api;
}
