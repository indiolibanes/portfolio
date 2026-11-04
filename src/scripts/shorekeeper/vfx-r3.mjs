import {patchShader} from './shader-patch.mjs';
import * as T from 'three';
import {ShorekeeperVfxR2Director,VFX_R2_STATES,renderWingAtlas} from './vfx-r2.mjs';
import {CelestialEnvironment} from './celestial-environment.mjs';
export * from './vfx-r2.mjs';
const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
/** R3 art profile shares the R2 clock, buffers, disposal and manual state contract. */
export class ShorekeeperVfxR3Director extends ShorekeeperVfxR2Director {
 constructor(scene,options={}){
  super(scene,options);
  this.root.name='ShorekeeperVfxR3';this.atlas.image.data=renderWingAtlas(256,7,{crystalline:true});this.atlas.needsUpdate=true;this.environment=new(options.environmentClass??CelestialEnvironment)(scene,options);this.environment.bindModel(null);
  // Mirrored horizontal axes, same upward wing fold on BOTH wings; never roll one wing down artificially.
  this.wingMaterial.vertexShader=patchShader(this.wingMaterial.vertexShader,'iMisc.z*(r2*cos(fl)+u2*sin(fl))','iMisc.z*r2*cos(fl)+u2*sin(fl)','vfx-r3.mjs:this.wingMaterial.vertexShader');
  this.wingMaterial.fragmentShader=patchShader(this.wingMaterial.fragmentShader,'mix(t.rgb,tinted,.8)*vShade*1.12','mix(t.rgb,tinted,.32)*vShade','vfx-r3.mjs:this.wingMaterial.fragmentShader');
  this.wingMaterial.blending=T.NormalBlending;this.wingMaterial.needsUpdate=true;
  this.coreUniforms.uSize.value=5;
  this.coreParticles.material.fragmentShader=patchShader(this.coreParticles.material.fragmentShader,'mix(uTint,vec3(1.),.25+.6*vH)','mix(uTint,vec3(.8,.88,1.),.12+.12*vH)','vfx-r3.mjs:this.coreParticles.material.fragmentShader');
  this.coreFlare.material.fragmentShader=patchShader(patchShader(this.coreFlare.material.fragmentShader,'core*.95+halo*.5+ray*.12','core*.12+halo*.16+ray*.10','vfx-r3.mjs:this.coreFlare.material.fragmentShader'),'mix(uTint,vec3(1.),.5+.45*core)','mix(uTint,vec3(.7,.82,1.),.15*core)','vfx-r3.mjs:this.coreFlare.material.fragmentShader:second');
  this.coreFlare.material.depthTest=true;
  this.coreCrystal=new T.Mesh(new T.OctahedronGeometry(1),new T.MeshBasicMaterial({color:0x6dbde9,transparent:true,opacity:.8,depthWrite:false}));
  this.coreCage=new T.Mesh(new T.IcosahedronGeometry(1),new T.MeshBasicMaterial({color:0xc8a8ff,wireframe:true,transparent:true,opacity:.55,depthWrite:false}));
  this.root.add(this.coreCrystal,this.coreCage);
  // Monumental but framed with the character and field in the standard celestial view.
  this.ringBase.forEach((r,i)=>{r[0]=i<6?[3.8,3.35,2.9,2.5,2.12,1.76][i]:2.4+(i-6)*.22;r[1]*=.16;r[2]*=.25;r[3]=1.65-i*.025;});
  this.renderPose();
 }
 bindModel(model){super.bindModel(model);this.environment.bindModel(model);}
 next(){return super.next();}
 renderPose(){
  super.renderPose();if(!this.environment)return;
  const t=this.reducedMotion?0:this.time,ph=this.corePhase;
  const core=this.reducedMotion||!this.enabled.collapsedCore?0:this.levels[2],e=smooth(ph/.22)*(1-smooth((ph-.9)/.1));
  this.coreCrystal.visible=this.coreCage.visible=core>.001&&e>.001;
  this.coreCrystal.position.copy(this.corePoint);this.coreCage.position.copy(this.corePoint);
  const radius=.024+.035*smooth((ph-.22)/.34);
  this.coreCrystal.scale.setScalar(radius*e);this.coreCage.scale.setScalar(radius*1.65*e);
  this.coreCrystal.rotation.set(t*.13,t*.27,t*.08);this.coreCage.rotation.set(-t*.18,t*.09,.4);
  this.coreCrystal.material.opacity=core*.76;this.coreCage.material.opacity=core*.55;
  this.flareUniforms.uWorld.value=.18; // parent already supplies the character scale
  for(let i=1;i<this.bMisc.length;i+=4)this.bMisc[i]=Math.max(.03,Math.min(1.48,this.bMisc[i]));
  this.wings.geometry.attributes.iMisc.needsUpdate=true;this.environment.update(t);
 }
 report(){const r=super.report();return {...r,revision:'R3_ART_CANDIDATE',environmentVisible:this.environment?.root.visible??false,estimatedAdditionalDrawCalls:r.estimatedAdditionalDrawCalls+(this.coreCrystal?.visible?2:0)+(this.environment?.root.visible?3:0),maxAdditionalDrawCalls:13};}
 dispose(){if(this.disposed)return;this.environment.dispose();for(const o of [this.coreCrystal,this.coreCage]){o.geometry.dispose();o.material.dispose();}super.dispose();}
}
