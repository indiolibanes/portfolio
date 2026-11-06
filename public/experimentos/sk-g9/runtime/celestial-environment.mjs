import * as T from 'three';
/** Original procedural scenery. Entire ownership is this subtree; never touches character materials. */
export class CelestialEnvironment {
 constructor(scene,{mobile=false}={}){
  this.root=new T.Group();this.root.name='ShorekeeperCelestialEnvironment';scene.add(this.root);this.disposed=false;
  const sky=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{time:{value:0}},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
   uniform float time; varying vec3 vP;
   void main(){vec3 p=normalize(vP);float h=clamp(p.y*.8+.18,0.,1.);
   vec3 c=mix(vec3(.055,.135,.20),vec3(.008,.018,.065),smoothstep(0.,.8,h));
   float a=atan(p.z,p.x);float veil=exp(-pow((p.y-.22-.075*sin(a*3.+time*.025))/.07,2.));
   c+=veil*mix(vec3(.018,.055,.075),vec3(.05,.025,.095),.5+.5*sin(a*2.));
   c+=vec3(.025,.055,.065)*exp(-pow((p.y-.035)/.055,2.));gl_FragColor=vec4(c,1.);
   #include <colorspace_fragment>
  }`});
  this.sky=new T.Mesh(new T.SphereGeometry(45,32,16),sky);this.sky.renderOrder=-10;this.root.add(this.sky);
  const floor=new T.ShaderMaterial({uniforms:{time:{value:0}},transparent:true,depthWrite:false,vertexShader:'varying vec2 vP;void main(){vP=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
   uniform float time;varying vec2 vP;
   void main(){float r=length(vP);float wave=sin(vP.x*18.+sin(vP.y*8.)*.8)*sin(vP.y*14.-time*.12);
   float road=exp(-pow(vP.x/(.25+abs(vP.y)*.07),2.));
   vec3 c=mix(vec3(.012,.035,.065),vec3(.045,.085,.11),.45+.15*wave);
   c+=vec3(.025,.055,.075)*road*exp(-r*.12);float edge=1.-smoothstep(12.,23.,r);
   gl_FragColor=vec4(c,edge);
   #include <colorspace_fragment>
  }`});
  this.ground=new T.Mesh(new T.PlaneGeometry(48,48).rotateX(-Math.PI/2),floor);this.ground.renderOrder=-5;this.root.add(this.ground);
  const geometry=new T.BoxGeometry(1,1,1),material=new T.MeshBasicMaterial({color:0x102333});
  this.ruins=new T.InstancedMesh(geometry,material,mobile?28:52);this.ruins.name='Distant authorial ruins';
  const m=new T.Matrix4(),q=new T.Quaternion(),s=new T.Vector3(),p=new T.Vector3();
  for(let i=0;i<this.ruins.count;i++){
   const a=(i/this.ruins.count)*Math.PI*2,r=10+(i%5)*1.1,h=.45+(i*7%13)*.13;
   p.set(Math.cos(a)*r,h/2-.04,Math.sin(a)*r);s.set(i%4===0?1.8:.16,h,.28);m.compose(p,q,s);this.ruins.setMatrixAt(i,m);
  }
  this.root.add(this.ruins);
 }
 bindModel(model){
  if(!model){this.root.position.set(0,-.5,0);this.root.scale.setScalar(2);return;}
  model.updateMatrixWorld(true);const b=new T.Box3().setFromObject(model),size=b.getSize(new T.Vector3()),c=b.getCenter(new T.Vector3());
  this.root.position.set(c.x,b.min.y-.008,c.z);this.root.scale.setScalar(size.y);
 }
 update(time){this.sky.material.uniforms.time.value=time;this.ground.material.uniforms.time.value=time;}
 setVisible(v){this.root.visible=!!v;}
 dispose(){if(this.disposed)return;this.disposed=true;this.root.removeFromParent();for(const o of [this.sky,this.ground,this.ruins]){o.geometry.dispose();o.material.dispose();}this.ruins.dispose();this.root.clear();}
}
