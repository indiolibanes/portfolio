/** Five real velocity-oriented wing pairs + five ribbons sampled from the SAME target flight.
 * Experimental QA_TARGET only; all timing/beam/impact details are AUTHORIAL_VISUAL_CANDIDATE. */
import {renderWingAtlas} from './vfx-r2.mjs';
import {planTargetFlight,sampleTargetFlight} from './qa-target.mjs';
import {trailPosition,TRAIL_POINTS} from './combat-vfx-trails.mjs';
const N=5,S=24;
const WVS=`attribute vec3 iPos,iFwd; attribute vec4 iMisc; attribute float iAlpha;
varying vec2 vUv; varying float vA;
void main(){vec3 f=normalize(iFwd+vec3(0.,0.,.000001));vec3 r=cross(f,vec3(0.,1.,0.));if(length(r)<.01)r=vec3(1.,0.,0.);r=normalize(r);vec3 u=normalize(cross(r,f));
vec3 wing=r*iMisc.z*cos(iMisc.y)+u*sin(iMisc.y);vec3 wp=iPos+iMisc.x*(wing*uv.x+f*(uv.y-.52));
vUv=uv;vA=iAlpha;gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}`;
const WFS=`uniform sampler2D atlas;varying vec2 vUv;varying float vA;
void main(){vec4 tex=texture2D(atlas,vec2(vUv.x,1.-vUv.y));if(tex.a*vA<.006)discard;float lum=dot(tex.rgb,vec3(.3,.55,.15));vec3 c=mix(vec3(.04,.5,1.),vec3(.8,.97,1.),lum);gl_FragColor=vec4(c,tex.a*vA);}`;
const RVS=`attribute float edge,alpha;varying float vEdge,vAlpha;void main(){vEdge=edge;vAlpha=alpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const RFS=`varying float vEdge,vAlpha;void main(){float hot=exp(-vEdge*vEdge*12.);float a=vAlpha*(.3+.7*hot);if(a<.003)discard;vec3 c=mix(vec3(.18,.04,.7),vec3(.02,.55,1.),.55);gl_FragColor=vec4(mix(c,vec3(.8,.97,1.),hot),a);}`;
export function createTargetedSkill(T,{parent,h,bundle,target,wingAtlas=null}){
 if(!target?.at||!target?.events)throw TypeError('QA_TARGET track required');
 const root=new T.Group();root.name='SKILL_TARGETING_STUDY';parent.add(root);let disposed=false,history=null,cachedKey=null,plans=[],last=null;
 const geo=[],mat=[],textures=[];const material=(vs,fs,uniforms={})=>{const m=new T.ShaderMaterial({uniforms,vertexShader:vs,fragmentShader:fs,transparent:true,side:T.DoubleSide,blending:T.AdditiveBlending,depthWrite:false,depthTest:true,toneMapped:false});mat.push(m);return m;};
 const quad=new T.PlaneGeometry(1,1);const wg=new T.InstancedBufferGeometry();wg.index=quad.index;wg.setAttribute('position',quad.attributes.position);wg.setAttribute('uv',quad.attributes.uv);wg.instanceCount=10;quad.dispose();geo.push(wg);
 const wPos=new Float32Array(30),wFwd=new Float32Array(30),wMisc=new Float32Array(40),wAlpha=new Float32Array(10);
 for(const [key,a,size]of [['iPos',wPos,3],['iFwd',wFwd,3],['iMisc',wMisc,4],['iAlpha',wAlpha,1]])wg.setAttribute(key,new T.InstancedBufferAttribute(a,size).setUsage(T.DynamicDrawUsage));
 const atlas=wingAtlas??new T.DataTexture(renderWingAtlas(128,7,{crystalline:true,delicate:true}),128,128,T.RGBAFormat);if(!wingAtlas){atlas.needsUpdate=true;atlas.colorSpace=T.SRGBColorSpace;textures.push(atlas);}
 const wings=new T.Mesh(wg,material(WVS,WFS,{atlas:{value:atlas}}));wings.frustumCulled=false;wings.name='qaTargetFiveButterflies';root.add(wings);
 const rg=new T.BufferGeometry(),positions=new Float32Array(N*S*2*3),alphas=new Float32Array(N*S*2),edges=new Float32Array(N*S*2),indices=[];
 for(let i=0;i<N;i++)for(let s=0;s<S;s++){const b=(i*S+s)*2;edges[b]=-1;edges[b+1]=1;if(s<S-1)indices.push(b,b+1,b+2,b+1,b+3,b+2);}
 rg.setAttribute('position',new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));rg.setAttribute('alpha',new T.BufferAttribute(alphas,1).setUsage(T.DynamicDrawUsage));rg.setAttribute('edge',new T.BufferAttribute(edges,1));rg.setIndex(indices);geo.push(rg);
 const ribbons=new T.Mesh(rg,material(RVS,RFS));ribbons.name='qaTargetFlightRibbons';ribbons.frustumCulled=false;root.add(ribbons);
 const sphere=new T.IcosahedronGeometry(1,1);geo.push(sphere);
 const targetMat=new T.MeshBasicMaterial({color:0xffc580,wireframe:true,transparent:true,opacity:.8,depthTest:true,depthWrite:false,toneMapped:false});mat.push(targetMat);
 const entity=new T.Mesh(sphere,targetMat);entity.name='QA_TARGET';root.add(entity);
 const impactMat=new T.MeshBasicMaterial({color:0x90eaff,transparent:true,opacity:.65,depthTest:true,depthWrite:false,wireframe:true,toneMapped:false});mat.push(impactMat);
 const impacts=new T.InstancedMesh(sphere,impactMat,N);impacts.name='qaTargetImpactPulses';impacts.frustumCulled=false;root.add(impacts);const matrix=new T.Matrix4(),p=new T.Vector3(),scale=new T.Vector3(),quat=new T.Quaternion(),side=new T.Vector3(),vel=new T.Vector3();
 const hide=()=>{root.visible=false;last=null;};
 const compile=()=>{const e=bundle.index.get('SKILL.butterflies');if(!e||!history)return false;const key=target.revision+':'+e.start+':'+e.end;
  if(key===cachedKey)return true;plans=[];const span=e.end-e.start;
  for(let i=0;i<N;i++){const start=e.start+i*.06*span,origin=trailPosition(history,TRAIL_POINTS.indexOf('chest'),start);origin[0]+=(i-2)*.035*h;
   plans.push(planTargetFlight({target,origin,index:i,start,duration:span*.55,h}));}
  cachedKey=key;return true;};
 return {root,target,setHistory(value){history=value;cachedKey=null;},hide,
  update({t,rm=false}){if(disposed)return null;hide();if(!compile())return null;
   const e=bundle.index.get('SKILL.butterflies'),state=target.at(t);root.visible=t>=e.start-.15&&t<e.end+.25;if(!root.visible)return null;
   entity.visible=state.enabled;entity.position.fromArray(state.position);entity.scale.setScalar(state.radius);entity.material.color.set(state.selected?0xffc580:0x537b8c);
   wAlpha.fill(0);alphas.fill(0);let count=0;const rows=[];
   for(let i=0;i<N;i++){const plan=plans[i],s=sampleTargetFlight(plan,t);rows.push({i,source:'SIMULATED_QA_TARGET',...s});
    if(s&&s.alpha>0){for(let k=0;k<2;k++){const j=i*2+k;wPos.set(s.position,j*3);wFwd.set(s.velocity,j*3);wAlpha[j]=s.alpha;wMisc.set([h*.18,rm?.35:.22+.55*Math.sin(t*22+i),k?-1:1,0],j*4);}
     if(s.impact){const u=(t-plan.end)/.3;p.fromArray(s.position);scale.setScalar(h*(.025+.16*u));matrix.compose(p,quat,scale);impacts.setMatrixAt(count++,matrix);}
    }
    for(let k=0;k<S;k++){const ts=t-k*.018,ss=sampleTargetFlight(plan,ts);let point=ss?.position??plan.origin;vel.fromArray(ss?.velocity??[0,0,1]);side.set(-vel.z,0,vel.x);if(side.lengthSq()<1e-8)side.set(1,0,0);side.normalize();
     const alpha=!rm&&s&&s.alpha>0&&ss&&ts<plan.end?Math.max(0,ss.alpha)*(1-k/S)*.75:0,width=h*.017*(1-.7*k/S);
     for(let j=0;j<2;j++){p.fromArray(point).addScaledVector(side,j?width:-width);positions.set(p.toArray(),((i*S+k)*2+j)*3);alphas[(i*S+k)*2+j]=alpha;}
    }
   }
   for(const a of Object.values(wg.attributes))if(a.isInstancedBufferAttribute)a.needsUpdate=true;rg.attributes.position.needsUpdate=true;rg.attributes.alpha.needsUpdate=true;
   wings.visible=wAlpha.some(x=>x>.002);ribbons.visible=alphas.some(x=>x>.002);impacts.count=count;impacts.instanceMatrix.needsUpdate=true;impacts.visible=count>0;
   last={label:'SKILL_TARGETING_STUDY',canonical:'CANONICAL_PENDING',target:state,butterflies:rows,impactCount:count,ribbonBasis:'SAME_FLIGHT_SAMPLES',sourceTiming:'AUTHORIAL_EVENT_WINDOW',drawCalls:[entity,wings,ribbons,impacts].filter(x=>x.visible).length};return last;
  },get last(){return last;},dispose(){if(disposed)return;disposed=true;hide();root.removeFromParent();for(const g of geo)g.dispose();for(const m of mat)m.dispose();for(const tx of textures)tx.dispose();plans=[];history=null;},get disposed(){return disposed;}
 };
}
