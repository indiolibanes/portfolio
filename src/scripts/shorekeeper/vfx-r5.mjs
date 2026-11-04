import * as T from 'three';import {ShorekeeperVfxR4Director} from './vfx-r4.mjs';import {renderWingAtlas} from './vfx-r2.mjs';import {CelestialEnvironmentR5} from './celestial-environment-r5.mjs';import {patchShader,shaderSignature} from './shader-patch.mjs';
/** R5 opt-in: same pool/counts/clock/owners; no new mesh draw or postprocessing. */
export class ShorekeeperVfxR5Director extends ShorekeeperVfxR4Director {
 constructor(scene,options={}){
  super(scene,{...options,environmentClass:CelestialEnvironmentR5});this.r5=true;this._r5Pelvis=new T.Vector3();this.pelvisAnchor=null;
  this.atlas.image.data=renderWingAtlas(256,7,{crystalline:true,delicate:true});this.atlas.needsUpdate=true;
  this.field.material.fragmentShader=patchShader(this.field.material.fragmentShader,'a+=.2*pow(1.-r,1.6)+.16*exp(-r*r*7.);','a+=.055*pow(1.-r,1.6)+.025*exp(-r*r*7.);','R5 transparent field centre');
  this.rings.material.fragmentShader=patchShader(this.rings.material.fragmentShader,'mix(uTint*.72,vec3(1.),.04)','mix(mix(uTint*.72,vec3(.45,.32,.74),.10+.06*sin(vAng*2.-uTime*.2)),vec3(1.),.07)','R5 canopy chromatic rim');
  this.coreFlare.material.fragmentShader=patchShader(this.coreFlare.material.fragmentShader,'core*.12+halo*.16+ray*.10','core*.10+halo*.13+ray*.07','R5 core contrast');
  this.field.material.needsUpdate=this.rings.material.needsUpdate=this.coreFlare.material.needsUpdate=true;
  this.ringBase.forEach((r,i)=>{if(i>0){r[1]*=2;r[2]*=1.6;}});
  const pos=this.coreCrystal.geometry.attributes.position,colors=new Float32Array(pos.count*3);for(let i=0;i<pos.count;i++){const k=.7+.3*Math.abs(pos.getY(i));colors.set([.45*k,.8*k,1],i*3);}this.coreCrystal.geometry.setAttribute('color',new T.BufferAttribute(colors,3));this.coreCrystal.material.vertexColors=true;this.coreCrystal.material.needsUpdate=true;
  this.shaderSignatures={};for(const [name,material]of Object.entries({wing:this.wingMaterial,field:this.field.material,ring:this.rings.material,dome:this.dome.material,core:this.coreParticles.material,flare:this.coreFlare.material,sky:this.environment.sky.material,stone:this.environment.ruins.material})){this.shaderSignatures[name]={vertex:shaderSignature(material.vertexShader),fragment:shaderSignature(material.fragmentShader)};}
 }
 bindModel(model){super.bindModel(model);this.pelvisAnchor=model?.getObjectByName('Bip001Pelvis')??null;}
 renderPose(){if(this.r5&&this.pelvisAnchor)this.pelvisAnchor.getWorldPosition(this._r5Pelvis).sub(this.center).divideScalar(this.scale);super.renderPose();}
 _pathAt(i,t,out){super._pathAt(i,t,out);if(!this.r5||!this.pelvisAnchor)return;const p=this._r5Pelvis,r=.30+this.flight[i*14+10];if(out[1]<p.y-.4||out[1]>p.y+.25)return;const dx=out[0]-p.x,dz=out[2]-p.z,d=Math.hypot(dx,dz);if(d<r){const k=r/Math.max(d,1e-6);out[0]=p.x+(d<1e-6?r:dx*k);out[2]=p.z+dz*k;}}
 report(){return {...super.report(),revision:'R5_ARTISTIC_CANDIDATE',shaderSignatures:this.shaderSignatures??null,collisionModel:'READ_ONLY_APPROXIMATE_VOLUMES',visualQA:'VISUAL_QA_PENDING'};}
}
