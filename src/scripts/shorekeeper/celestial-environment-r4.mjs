import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CelestialEnvironment} from './celestial-environment.mjs';
/** Original authorial scenery owned by the VFX subtree. Never touches character materials. */
export class CelestialEnvironmentR4 extends CelestialEnvironment {
 constructor(scene,options={}){
  super(scene,options);
  this.sky.material.fragmentShader=`uniform float time;varying vec3 vP;
   void main(){vec3 p=normalize(vP);float h=clamp(p.y*2.+.15,0.,1.);float a=atan(p.z,p.x);
   vec3 c=mix(vec3(.012,.075,.23),vec3(.006,.014,.085),smoothstep(0.,.85,h));
   float veil=exp(-pow((p.y-.13-.06*sin(a*1.7+time*.018))/.06,2.));
   float mist=exp(-pow((p.y-.02)/.08,2.));c+=veil*vec3(.008,.025,.055)+mist*vec3(.01,.025,.04);
   gl_FragColor=vec4(c,1.);
   #include <colorspace_fragment>
  }`;
  this.ground.material.fragmentShader=`uniform float time;varying vec2 vP;
   void main(){float r=length(vP),a=atan(vP.y,vP.x);
   float ripples=sin(r*5.-time*.14+sin(a*3.+r*.2)*.55)*.5+.5;
   float shimmer=pow(max(0.,sin(vP.y*1.7+sin(vP.x*1.3)*1.2)),14.);
   vec3 c=vec3(.008,.022,.052)+vec3(.006,.015,.024)*ripples+vec3(.008,.028,.045)*shimmer*exp(-r*.18);
   float reflection=exp(-pow(vP.x/(.22+abs(vP.y)*.09),2.))*exp(-r*.13);c+=vec3(.009,.035,.065)*reflection;
   gl_FragColor=vec4(c,1.-smoothstep(12.,23.,r));
   #include <colorspace_fragment>
  }`;
  const old=this.ruins;old.removeFromParent();old.geometry.dispose();old.material.dispose();old.dispose();
  const parts=[];
  for(const x of [-.55,.55]){const g=new T.BoxGeometry(.16,1.25,.18);g.translate(x,.625,0);parts.push(g);const cap=new T.BoxGeometry(.25,.10,.24);cap.translate(x,1.25,0);parts.push(cap);}
  const arch=new T.TorusGeometry(.55,.085,5,24,Math.PI);arch.translate(0,1.25,0);parts.push(arch);
  const g=mergeGeometries(parts);for(const p of parts)p.dispose();
  const mat=new T.ShaderMaterial({vertexShader:`attribute float iDamage;varying float vDamage;varying vec2 vLocal;varying float vDistance;varying float vY;void main(){vDamage=iDamage;vLocal=position.xy;vec4 p=instanceMatrix*vec4(position,1.);vec4 mv=modelViewMatrix*p;vY=position.y;vDistance=length(mv.xyz);gl_Position=projectionMatrix*mv;}`,fragmentShader:`varying float vDamage;varying vec2 vLocal;varying float vDistance;varying float vY;void main(){if(vDamage>0.&&vLocal.y>1.35&&vLocal.x>vDamage*.1)discard;vec3 stone=mix(vec3(.012,.025,.05),vec3(.028,.05,.085),smoothstep(0.,1.9,vY));vec3 c=mix(stone,vec3(.02,.065,.12),smoothstep(12.,30.,vDistance));gl_FragColor=vec4(c,1.);
#include <colorspace_fragment>
}`});
  this.ruins=new T.InstancedMesh(g,mat,options.mobile?16:28);this.ruins.name='Authorial broken celestial arcade';g.setAttribute('iDamage',new T.InstancedBufferAttribute(Float32Array.from({length:this.ruins.count},(_,i)=>i%3===0?.4:0),1));
  const m=new T.Matrix4(),q=new T.Quaternion(),p=new T.Vector3(),s=new T.Vector3(),yAxis=new T.Vector3(0,1,0);
  for(let i=0;i<this.ruins.count;i++){const a=i/this.ruins.count*Math.PI*2,r=7.5+(i%4)*1.1,k=.55+(i*7%11)*.09;p.set(Math.cos(a)*r,-.025,Math.sin(a)*r);q.setFromAxisAngle(yAxis,-a-Math.PI/2);s.set(k,k*(i%5===0?.68:1),k);m.compose(p,q,s);this.ruins.setMatrixAt(i,m);}
  this.root.add(this.ruins);this.sky.material.needsUpdate=this.ground.material.needsUpdate=true;
 }
}
