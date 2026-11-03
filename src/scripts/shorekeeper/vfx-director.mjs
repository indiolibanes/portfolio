import * as T from 'three';
import {SK_VFX_PRESETS} from './vfx-presets.mjs';

export const VFX_STATES=Object.freeze(['OFF','AMBIENT','PREPARATION','STELLAREALM','RESONANCE_PEAK','RECOVERY']);
const LEVELS=Object.freeze({OFF:[0,0,0],AMBIENT:[.48,0,0],PREPARATION:[.65,.24,.28],STELLAREALM:[.8,.8,.45],RESONANCE_PEAK:[1,1,1],RECOVERY:[.48,0,0]});
const TAU=Math.PI*2, SAMPLES=128;
function seeded(seed){let a=seed>>>0;return()=>{a=(Math.imul(a,1664525)+1013904223)>>>0;return a/4294967296;};}
function wingGeometry(){
 // Original four-lobed silhouette, triangulated once; no game textures or shaders.
 const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(.22,.55,.72,.7,.69,.3);shape.bezierCurveTo(.7,.04,.36,.03,.16,-.03);shape.bezierCurveTo(.58,-.02,.48,-.52,.28,-.4);shape.bezierCurveTo(.13,-.3,.06,-.1,0,0);
 const g=new T.ShapeGeometry(shape,7),p=g.attributes.position,c=new Float32Array(p.count*3),color=new T.Color();
 for(let i=0;i<p.count;i++){const edge=Math.min(1,Math.abs(p.getX(i))/.7);color.setRGB(1-edge*.32,1-edge*.18,1);color.toArray(c,i*3);}
 g.setAttribute('color',new T.BufferAttribute(c,3));return g;
}
function pointsMaterial(size){return new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:T.NormalBlending,uniforms:{opacity:{value:0},clock:{value:0},size:{value:size},pixelRatio:{value:1}},vertexShader:`
 attribute float phase; attribute float life; attribute vec3 color; varying vec3 tint; varying float shimmer; varying float lifetime;
 uniform float clock; uniform float size; uniform float pixelRatio;
 void main(){ tint=color; lifetime=life; shimmer=.68+.32*sin(clock*.65+phase); vec4 mv=modelViewMatrix*vec4(position,1.); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(size*pixelRatio*(.8+.35*sin(phase))/max(.1,-mv.z),1.,32.); }`,fragmentShader:`
 uniform float opacity; varying vec3 tint; varying float shimmer; varying float lifetime;
 void main(){ vec2 p=gl_PointCoord-.5; float r=length(p)*2.; float halo=pow(max(0.,1.-r),3.); float cross=exp(-abs(p.x)*65.)*max(0.,1.-abs(p.y)*2.)+exp(-abs(p.y)*65.)*max(0.,1.-abs(p.x)*2.); float a=opacity*lifetime*shimmer*(halo*.7+cross*.18); if(a<.008)discard; gl_FragColor=vec4(tint,a);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});}
function pointGeometry(count,rng,energy=false){
 const p=new Float32Array(count*3),c=new Float32Array(count*3),ph=new Float32Array(count),color=new T.Color();
 for(let i=0;i<count;i++){const a=rng()*TAU,r=1.05+rng()*2.2;p.set([Math.cos(a)*r,(rng()-.42)*3.4,Math.sin(a)*r],i*3);color.set(energy?(i%3===0?0xd2bfff:0xc9f6ff):(i%5===0?0xc1bbf5:0xe2f8ff));color.toArray(c,i*3);ph[i]=rng()*TAU;}
 const g=new T.BufferGeometry();g.setAttribute('life',new T.BufferAttribute(new Float32Array(count).fill(1),1));g.setAttribute('position',new T.BufferAttribute(p,3));g.setAttribute('color',new T.BufferAttribute(c,3));g.setAttribute('phase',new T.BufferAttribute(ph,1));if(energy)p.fill(0);return g;
}
function arcGeometry(rng){
 const v=[];for(let ring=0;ring<3;ring++)for(let i=0;i<SK_VFX_PRESETS.stellarealm.ringSegments;i++)for(const j of [i,i+1]){const a=j/SK_VFX_PRESETS.stellarealm.ringSegments*TAU;v.push(Math.cos(a)*(1.5+ring*.32),Math.sin(a)*(.22+ring*.06)-.62+ring*.38,Math.sin(a)*(1.05+ring*.15));}
 // Sparse constellations behind the figure, kept out of the face plane.
 for(let cluster=0;cluster<4;cluster++){let x=(cluster-1.5)*.9,y=.65+rng()*.65,z=-1.35-rng();for(let i=0;i<3;i++){const nx=x+.15+rng()*.28,ny=y+(rng()-.5)*.5;v.push(x,y,z,nx,ny,z);x=nx;y=ny;}}
 return new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(v,3));
}

/** Owns only its own scene subtree. Never owns an AnimationMixer, bone or morph. */
export class ShorekeeperVfxDirector{
 constructor(scene,{mobile=false,reducedMotion=false,seed=0x5c311,now=()=>performance.now()}={}){
  this.scene=scene;this.now=now;this.mobile=mobile;this.reducedMotion=reducedMotion;this.state='OFF';this.time=0;this.suspended=false;this.disposed=false;
  this.levels=new Float64Array(3);this.from=new Float64Array(3);this.target=new Float64Array(3);this.transition=1;this.transitionSeconds=1.25;this.enabled={butterflies:true,stellarealm:true,collapsedCore:true};
  this.stats={samples:0,totalCpuMs:0,maxCpuMs:0,clockSeconds:0};this.cpuSamples=new Float64Array(2048);this.counts={butterflies:mobile?SK_VFX_PRESETS.butterflies.mobileCount:SK_VFX_PRESETS.butterflies.desktopCount,stars:mobile?SK_VFX_PRESETS.stellarealm.mobileStars:SK_VFX_PRESETS.stellarealm.desktopStars,energy:mobile?SK_VFX_PRESETS.collapsedCore.mobileParticles:SK_VFX_PRESETS.collapsedCore.desktopParticles};
  const rng=seeded(seed);this.root=new T.Group();this.root.name='ShorekeeperVfxDirector';this.root.visible=false;scene.add(this.root);
  this.wings=new T.InstancedMesh(wingGeometry(),new T.MeshBasicMaterial({color:0xffffff,vertexColors:true,side:T.DoubleSide,transparent:true,forceSinglePass:true,opacity:0,depthWrite:false}),this.counts.butterflies*2);this.wings.frustumCulled=false;this.root.add(this.wings);
  const color=new T.Color();this.flight=new Float32Array(this.counts.butterflies*8);
  for(let i=0;i<this.counts.butterflies;i++){this.flight.set([rng()*TAU,rng()*TAU,.08+rng()*.12,.9+rng()*.8,.04+rng()*.035,1+rng()*1.1,rng()*TAU,(rng()-.5)*.8],i*8);color.set([0xeaffff,0xaee5f5,0xc9bdf5][i%3]);this.wings.setColorAt(i*2,color);this.wings.setColorAt(i*2+1,color);}
  this.stars=new T.Points(pointGeometry(this.counts.stars,rng),pointsMaterial(17));this.root.add(this.stars);
  this.arcs=new T.LineSegments(arcGeometry(rng),new T.LineBasicMaterial({color:0xb2dff5,transparent:true,opacity:0,depthWrite:false}));this.root.add(this.arcs);
  const shellGeometry=new T.SphereGeometry(12,24,16),shellColors=new Float32Array(shellGeometry.attributes.position.count*3),night=new T.Color(0x101932),horizon=new T.Color(0x556a91),shade=new T.Color();
  for(let i=0;i<shellGeometry.attributes.position.count;i++){shade.copy(night).lerp(horizon,Math.max(0,-shellGeometry.attributes.position.getY(i)/12));shade.toArray(shellColors,i*3);}
  shellGeometry.setAttribute('color',new T.BufferAttribute(shellColors,3));this.shell=new T.Mesh(shellGeometry,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide,transparent:true,opacity:0,depthWrite:false}));this.shell.renderOrder=-10;this.root.add(this.shell);
  this.energy=new T.Points(pointGeometry(this.counts.energy,rng,true),pointsMaterial(23));this.energy.frustumCulled=false;this.root.add(this.energy);
  this.paths=new Float32Array(this.counts.energy*SAMPLES*3);this.energyPhase=new Float32Array(this.counts.energy);
  for(let i=0;i<this.counts.energy;i++){this.energyPhase[i]=rng();for(let j=0;j<SAMPLES;j++){const u=j/(SAMPLES-1),a=u*TAU*1.3+i*2.39996,r=.025+Math.sin(u*Math.PI)*.16;const k=(i*SAMPLES+j)*3;this.paths[k]=Math.cos(a)*r;this.paths[k+1]=u*.24-.1;this.paths[k+2]=Math.sin(a)*r;}}
  this.dummy=new T.Object3D();this.hand=new T.Vector3();this.head=new T.Vector3();this.center=new T.Vector3();this.anchor=null;this.headAnchor=null;this.scale=1;
  this.renderPose();
 }
 setState(state){if(this.disposed)return false;if(!VFX_STATES.includes(state))throw Error('Estado VFX inválido: '+state);this.state=state;this.from.set(this.levels);this.target.set(LEVELS[state]);this.transition=0;return true;}
 next(){const i=VFX_STATES.indexOf(this.state);return this.setState(i===VFX_STATES.length-1?'AMBIENT':VFX_STATES[i+1]);}
 setEnabled(system,value){if(!(system in this.enabled))throw Error('Sistema VFX inválido');this.enabled[system]=!!value;this.renderPose();}
 setReducedMotion(value){this.reducedMotion=!!value;this.renderPose();}
 setSuspended(value){this.suspended=!!value;}
 /** Read-only bounds/anchors: never reparent or assign transforms on the character. */
 bindModel(model){
  this.anchor=null;this.headAnchor=null;
  if(!model){this.center.set(0,1,0);this.scale=2;}
  else{model.updateMatrixWorld(true);const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());this.center.copy(box.getCenter(new T.Vector3()));this.scale=Math.max(.1,size.y);this.anchor=model.getObjectByName('Bip001RHand')??null;this.headAnchor=model.getObjectByName('Bip001Head')??null;}
  this.root.position.copy(this.center);this.root.scale.setScalar(this.scale);this.renderPose();
 }
 update(dt,pixelRatio=1){
  if(this.disposed||this.suspended||!Number.isFinite(dt)||dt<=0)return;
  const start=this.now(),step=Math.min(.1,dt);this.transition=Math.min(1,this.transition+step/this.transitionSeconds);const u=this.transition*this.transition*(3-2*this.transition);
  for(let i=0;i<3;i++)this.levels[i]=this.from[i]+(this.target[i]-this.from[i])*u;
  if(!this.reducedMotion)this.time+=step;
  this.stars.material.uniforms.pixelRatio.value=pixelRatio;this.energy.material.uniforms.pixelRatio.value=pixelRatio;this.renderPose();
  const cpu=Math.max(0,this.now()-start),s=this.stats;this.cpuSamples[s.samples%this.cpuSamples.length]=cpu;s.samples++;s.totalCpuMs+=cpu;s.maxCpuMs=Math.max(s.maxCpuMs,cpu);s.clockSeconds+=step;
 }
 renderPose(){
  const t=this.reducedMotion?0:this.time,b=this.enabled.butterflies?this.levels[0]:0,star=this.enabled.stellarealm?this.levels[1]:0,core=this.reducedMotion||!this.enabled.collapsedCore?0:this.levels[2];
  this.root.visible=b+star+core>.0001;
  this.wings.visible=b>.001;this.wings.material.opacity=b*.76;
  const d=this.dummy,f=this.flight;
  for(let i=0;i<this.counts.butterflies;i++){const k=i*8,a=f[k]+t*f[k+2],r=f[k+3],x=Math.cos(a)*r,y=f[k+7]+Math.sin(a*.7+f[k+1])*.34,z=Math.sin(a)*r*.65;
   const flap=this.reducedMotion?.4:.2+Math.sin(t*TAU*f[k+5]+f[k+6])*.78;
   for(let side=0;side<2;side++){d.position.set(x,y,z);d.rotation.set(.14*Math.sin(a+f[k+1]),side===0?Math.PI+flap:-flap,-.22*Math.sin(a));d.scale.setScalar(f[k+4]);d.updateMatrix();this.wings.setMatrixAt(i*2+side,d.matrix);}
  }
  this.wings.instanceMatrix.needsUpdate=true;
  this.stars.visible=star>.001;this.stars.material.uniforms.opacity.value=star*.88;this.stars.material.uniforms.clock.value=t;this.stars.rotation.y=t*.008;
  this.shell.visible=star>.001;this.shell.material.opacity=star*.94;
  this.arcs.visible=star>.001;this.arcs.material.opacity=star*.22;this.arcs.rotation.y=t*.018;
  this.energy.visible=core>.001;this.energy.material.uniforms.opacity.value=core*.8;this.energy.material.uniforms.clock.value=t;
  if(this.anchor)this.anchor.getWorldPosition(this.hand).sub(this.center).divideScalar(this.scale);else this.hand.set(.38,-.15,.12);
  if(this.headAnchor)this.headAnchor.getWorldPosition(this.head).sub(this.center).divideScalar(this.scale);else this.head.set(0,.4,0);
  const p=this.energy.geometry.attributes.position,arr=p.array,life=this.energy.geometry.attributes.life;
  for(let i=0;i<this.counts.energy;i++){const u=(t*.24+this.energyPhase[i])%1,pos=u*(SAMPLES-1),j=Math.floor(pos),blend=pos-j,a=(i*SAMPLES+j)*3,b=(i*SAMPLES+Math.min(SAMPLES-1,j+1))*3,k=i*3;
   life.array[i]=Math.sin(u*Math.PI)**2;
   arr[k]=this.hand.x+this.paths[a]+(this.paths[b]-this.paths[a])*blend;arr[k+1]=this.hand.y+this.paths[a+1]+(this.paths[b+1]-this.paths[a+1])*blend;arr[k+2]=this.hand.z+this.paths[a+2]+(this.paths[b+2]-this.paths[a+2])*blend;
   // Keep the face clear, including when the hand rises during an imported clip.
   const dx=arr[k]-this.head.x,dy=arr[k+1]-this.head.y,dz=arr[k+2]-this.head.z;if(dx*dx+dy*dy+dz*dz<.035)arr[k+2]=this.head.z-.24;
  }p.needsUpdate=true;life.needsUpdate=true;
 }
 report(){const s=this.stats,n=Math.min(s.samples,this.cpuSamples.length),sorted=Array.from(this.cpuSamples.subarray(0,n)).sort((a,b)=>a-b);return {state:this.state,manualOnly:true,visualQA:'VISUAL_QA_PENDING',profile:this.mobile?'mobile':'desktop',counts:{...this.counts},reducedMotion:this.reducedMotion,suspended:this.suspended,seconds:s.clockSeconds,samples:s.samples,cpuMeanMs:s.samples?s.totalCpuMs/s.samples:null,cpuP95RecentMs:n?sorted[Math.floor((n-1)*.95)]:null,cpuMaxMs:s.maxCpuMs,estimatedAdditionalDrawCalls:[this.wings,this.stars,this.arcs,this.energy,this.shell].filter(o=>this.root.visible&&o.visible).length,maxAdditionalDrawCalls:5,gpuTiming:'NOT_MEASURED'};}
 dispose(){if(this.disposed)return;this.disposed=true;this.root.removeFromParent();for(const o of [this.wings,this.stars,this.arcs,this.energy,this.shell]){o.geometry.dispose();o.material.dispose();if(o===this.wings)o.dispose();}this.anchor=null;this.headAnchor=null;this.root.clear();}
}
