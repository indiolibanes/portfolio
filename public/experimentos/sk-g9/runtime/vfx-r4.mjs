import {patchShader} from './shader-patch.mjs';
import * as T from 'three';
import {ShorekeeperVfxR3Director} from './vfx-r3.mjs';
import {CelestialEnvironmentR4} from './celestial-environment-r4.mjs';
/** Opt-in R4; one inherited clock/buffer pool, no postprocessing or character writes. */
export class ShorekeeperVfxR4Director extends ShorekeeperVfxR3Director {
 constructor(scene,options={}){
  super(scene,{...options,environmentClass:options.environmentClass??CelestialEnvironmentR4,wingSegments:options.mobile?2:4});
  this.camera=options.camera??null;this._r4Camera=new T.Vector3();this._r4Hand=new T.Vector3();this._r4Left=new T.Vector3();this.r4=true;
  this.ringBase.forEach((r,i)=>{r[0]=i<6?[2.7,2.43,2.15,1.88,1.62,1.35][i]:2.2+(i-6)*.12;r[3]=1.52-i*.023;r[8]=i===0?.022:r[8]*.72;});
  this.wingMaterial.vertexShader=patchShader(this.wingMaterial.vertexShader,'f*((uv.y-.52)*1.0)','f*((uv.y-.52)*1.0)+u2*(sin(uv.x*3.14159)*sin(uv.y*3.14159)*.065)','vfx-r4.mjs:this.wingMaterial.vertexShader');
  this.rings.material.fragmentShader=patchShader(patchShader(this.rings.material.fragmentShader,'uTint*1.2','uTint*.72','vfx-r4.mjs:this.rings.material.fragmentShader'),'vec3(1.),.12','vec3(1.),.04','vfx-r4.mjs:this.rings.material.fragmentShader:second');
  this.dome.material.fragmentShader=patchShader(patchShader(this.dome.material.fragmentShader,'*.55','*.18','vfx-r4.mjs:this.dome.material.fragmentShader'),'.16*pow(r,2.)','.045*pow(r,2.)','vfx-r4.mjs:this.dome.material.fragmentShader:second');
  this.field.material.fragmentShader=patchShader(this.field.material.fragmentShader,'uTint*1.15','uTint*.78','vfx-r4.mjs:this.field.material.fragmentShader');
  this.wingMaterial.needsUpdate=this.rings.material.needsUpdate=this.dome.material.needsUpdate=this.field.material.needsUpdate=true;
  const positions=this.stars.geometry.attributes.position;let seed=0x513f09;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<positions.count;i++){const a=i*2.3999632297,r=8+rng()*6;positions.setXYZ(i,Math.cos(a)*r,.35+rng()*3.2,Math.sin(a)*r);}positions.needsUpdate=true;
  const links=[];for(let c=0;c<3;c++){let from=c*61+12;for(let j=0;j<4;j++){let best=-1,distance=Infinity;for(let k=from+1;k<positions.count;k++){const d=(positions.getX(k)-positions.getX(from))**2+(positions.getY(k)-positions.getY(from))**2+(positions.getZ(k)-positions.getZ(from))**2;if(d<distance){distance=d;best=k;}}if(best<0||distance>14)break;for(const k of [from,best])links.push(positions.getX(k),positions.getY(k),positions.getZ(k));from=best;}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(links,3));this.constellations=new T.LineSegments(g,new T.LineBasicMaterial({color:0x7ea9d9,transparent:true,opacity:.16,depthWrite:false}));this.root.add(this.constellations);
  this.stars.material.vertexShader=patchShader(this.stars.material.vertexShader,'30.*uPixelRatio','55.*uPixelRatio','vfx-r4.mjs:this.stars.material.vertexShader');this.stars.material.needsUpdate=true;this.scoreStarGate=null;this.scoreStarCanopy=null;this.renderPose();
 }
 _pathAt(i,t,out){
  super._pathAt(i,t,out);if(!this.r4)return;const size=this.flight[i*14+10],clear=.13+size;
  for(let j=0;j<3;j++){if(j===1&&!this.anchorL||j===2&&!this.camera)continue;const c=j===0?this._r4Hand:j===1?this._r4Left:this._r4Camera,dx=out[0]-c.x,dy=out[1]-c.y,dz=out[2]-c.z,d=Math.hypot(dx,dy,dz);if(d<clear){const f=clear/Math.max(d,1e-6);out[0]=c.x+(d<1e-6?clear:dx*f);out[1]=c.y+dy*f;out[2]=c.z+dz*f;}}
  if(out[1]>-.5&&out[1]<.42){const dx=out[0]-this.head.x,dz=out[2]-this.head.z,d=Math.hypot(dx,dz),r=.24+size;if(d<r){const f=r/Math.max(d,1e-6);out[0]=this.head.x+(d<1e-6?r:dx*f);out[2]=this.head.z+dz*f;}}
  const dx=out[0]-this.head.x,dy=out[1]-this.head.y,dz=out[2]-this.head.z,d=Math.hypot(dx,dy,dz);if(d<.4){const f=.4/Math.max(d,1e-6);out[0]=this.head.x+(d<1e-6?.4:dx*f);out[1]=this.head.y+dy*f;out[2]=this.head.z+dz*f;}
 }
 renderPose(){
  if(this.r4){if(this.camera)this.camera.getWorldPosition(this._r4Camera).sub(this.center).divideScalar(this.scale);if(this.anchor)this.anchor.getWorldPosition(this._r4Hand).sub(this.center).divideScalar(this.scale);else this._r4Hand.copy(this.hand);if(this.anchorL)this.anchorL.getWorldPosition(this._r4Left).sub(this.center).divideScalar(this.scale);}
  super.renderPose();if(!this.r4)return;const canopy=this.enabled.canopy&&this.mode!=='FIELD_GAMEPLAY'?this.levels[3]:0;
  // Manual/legacy profile (gate null): unchanged, the star dome is always shown. R6.2 S3 opt-in score
  // mode sets scoreStarGate in [0,1]: stars/constellations then appear ONLY with the Liberation canopy.
  const gate=this.scoreStarGate??null;
  if(gate===null){this.root.visible=true;this.stars.visible=true;this.starUniforms.uOpacity.value=.32+.5*canopy;}
  else{const g=Math.max(0,Math.min(1,gate)),c=this.scoreStarCanopy??canopy;this.stars.visible=g>.001;this.starUniforms.uOpacity.value=(.32+.5*c)*g;this.root.visible=this.root.visible||this.stars.visible;}
  if(this.constellations){this.constellations.visible=gate===null||this.stars.visible;this.constellations.material.opacity=(.08+.10*(gate===null?canopy:(this.scoreStarCanopy??canopy)))*(gate===null?1:Math.max(0,Math.min(1,gate)));this.constellations.rotation.y=this.stars.rotation.y;}
  this.corePoint.y=Math.min(this.corePoint.y,this.head.y-.18);this.coreUniforms.uCenter.value.copy(this.corePoint);this.coreCrystal.position.copy(this.corePoint);this.coreCage.position.copy(this.corePoint);this.coreCrystal.scale.multiplyScalar(.62);this.coreCage.scale.multiplyScalar(.62);
  this.domeUniforms.uOpacity.value*=.6;this.rings.material.uniforms.uOpacity.value*=.85;
 }
 /** R6.2 S3 opt-in only: null restores the manual profile; gate in [0,1] multiplies the star dome and
  *  canopy (optional, [0,1]) replaces the legacy canopy level for its brightness (null = legacy level). */
 setScoreStarGate(v,canopy=null){const ok=x=>Number.isFinite(x)&&x>=0&&x<=1;if((v!==null&&!ok(v))||(canopy!==null&&!ok(canopy)))throw Error('Invalid star gate');this.scoreStarGate=v;this.scoreStarCanopy=v===null?null:canopy;if(!this.disposed)this.renderPose();}
 dispose(){if(this.disposed)return;if(this.constellations){this.constellations.geometry.dispose();this.constellations.material.dispose();}super.dispose();}
 report(){const r=super.report();return {...r,estimatedAdditionalDrawCalls:r.estimatedAdditionalDrawCalls+1,maxAdditionalDrawCalls:14,revision:'R4_CANDIDATE',butterflyIdentity:'UNRESOLVED',visualQA:'VISUAL_QA_PENDING'};}
}
