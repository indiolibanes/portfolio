/** HEAVY_VOLUMETRIC_STUDY: real sphere/shell, merged noncoplanar toroids and converging 3D filaments.
 * Placement/appearance are VISUAL_CANDIDATE, never a certified Illation. No canonical resources changed. */
export function createVolumetricHeavy(T,{parent,h}){
 const root=new T.Group();root.name='HEAVY_VOLUMETRIC_STUDY';parent.add(root);root.visible=false;let disposed=false;
 const geo=new T.SphereGeometry(1,24,16),mats=[],geos=[geo];
 const coreMat=new T.ShaderMaterial({uniforms:{time:{value:0}},vertexShader:'varying vec3 n,p; void main(){n=normalize(normalMatrix*normal);p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 n,p; uniform float time; void main(){float band=.5+.5*sin(p.y*17.+p.x*8.+time);float edge=pow(1.-abs(n.z),3.);gl_FragColor=vec4(vec3(.002,.004,.012)+vec3(.012,.015,.035)*band+vec3(.015,.025,.055)*edge,1.);}',depthTest:true,depthWrite:true,toneMapped:false});mats.push(coreMat);
 const core=new T.Mesh(geo,coreMat);root.add(core);
 const shellMat=new T.ShaderMaterial({uniforms:{level:{value:0}},vertexShader:'varying vec3 n; void main(){n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 n; uniform float level; void main(){float f=pow(1.-abs(n.z),3.);gl_FragColor=vec4(mix(vec3(.03,.5,1.),vec3(.7,.04,1.),smoothstep(-.5,.5,n.y)),f*level*.65);}',transparent:true,blending:T.AdditiveBlending,depthWrite:false,depthTest:true,toneMapped:false});mats.push(shellMat);
 const shell=new T.Mesh(geo,shellMat);shell.scale.setScalar(1.055);shell.renderOrder=10;root.add(shell);
 // Merge three toroids into one draw; their planes, radii and swept thickness are physically distinct.
 const pos=[],norm=[],colors=[],indices=[];const v=new T.Vector3(),n=new T.Vector3(),q=new T.Quaternion();
 [[.25,.2,0,1.32],[1.05,.3,.7,1.57],[-.85,.5,-.5,1.78]].forEach(([x,y,z,r],k)=>{
  const g=new T.TorusGeometry(r,.025,5,64),p=g.attributes.position,nn=g.attributes.normal,base=pos.length/3;q.setFromEuler(new T.Euler(x,y,z));
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyQuaternion(q);n.fromBufferAttribute(nn,i).applyQuaternion(q);pos.push(...v);norm.push(...n);colors.push(...(k===1?[.55,.03,.95]:[.02,.6,1]));}
  for(const i of g.index.array)indices.push(base+i);g.dispose();
 });
 const ringsGeo=new T.BufferGeometry();ringsGeo.setAttribute('position',new T.Float32BufferAttribute(pos,3));ringsGeo.setAttribute('normal',new T.Float32BufferAttribute(norm,3));ringsGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));ringsGeo.setIndex(indices);geos.push(ringsGeo);
 const ringMat=new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:1,depthTest:true,depthWrite:false,toneMapped:false});mats.push(ringMat);const rings=new T.Mesh(ringsGeo,ringMat);root.add(rings);
 const linesGeo=new T.BufferGeometry(),points=new Float32Array(32*2*3);linesGeo.setAttribute('position',new T.BufferAttribute(points,3).setUsage(T.DynamicDrawUsage));geos.push(linesGeo);
 const lineMat=new T.LineBasicMaterial({color:0x58bcff,transparent:true,depthTest:true,depthWrite:false,toneMapped:false});mats.push(lineMat);const lines=new T.LineSegments(linesGeo,lineMat);root.add(lines);
 return {root,update({position,radius,level,time,reduced=false}){if(disposed)return null;root.visible=level>.002;if(!root.visible)return null;root.position.fromArray(position);root.scale.setScalar(radius);shellMat.uniforms.level.value=level;coreMat.uniforms.time.value=reduced?0:time;ringMat.opacity=Math.min(1,level);lineMat.opacity=Math.min(.8,level);rings.rotation.set(reduced?0:time*.31,reduced?0:time*.47,reduced?0:time*.17);
   for(let i=0;i<32;i++){const a=i*2.399963+(reduced?0:time*.8),y=1-2*(i+.5)/32,r=Math.sqrt(1-y*y),f=reduced?.6:((time*.55+i*.618)%1),r0=1.07+f*.9;for(let k=0;k<2;k++){const d=r0+k*.12;points.set([Math.cos(a)*r*d,y*d,Math.sin(a)*r*d],i*6+k*3);}}
   linesGeo.attributes.position.needsUpdate=true;return {label:'HEAVY_VOLUMETRIC_STUDY',canonical:'CANONICAL_PENDING',position:[...position],radius,drawCalls:4,meshes:3,ringPlanes:3};},
  hide(){root.visible=false;},dispose(){if(disposed)return;disposed=true;root.removeFromParent();for(const g of geos)g.dispose();for(const m of mats)m.dispose();},get disposed(){return disposed;}};
}
