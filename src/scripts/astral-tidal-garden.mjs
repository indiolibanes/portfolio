/** Original procedural scenery. No character, texture download, lights or offscreen pass. */
export const ASTRAL_FLOOR=Object.freeze({minX:-18,maxX:18,minZ:-8,maxZ:16,y:0});
export function createAstralTidalGarden(T,{floor=true}={}){
 const group=new T.Group();group.name='Astral Tidal Garden';const resources=new Set();
 const material=c=>{const m=new T.MeshBasicMaterial({color:c,vertexColors:true});resources.add(m);return m;};
 const jade=material(0x708b8b),stone=material(0xb6c6c7),gold=material(0xab8d51),dark=material(0x253b50),water=material(0x102d41),glow=material(0xe6bb67),pink=material(0xaaa3c5);
 const box=new T.BoxGeometry(1,1,1),sphere=new T.IcosahedronGeometry(1,0),torus=new T.TorusGeometry(1,.045,5,40);
 // Shared baked directional tones give depth without per-lantern lighting or shadow maps.
 const shade=g=>{const n=g.attributes.normal,colors=[];for(let i=0;i<n.count;i++){const s=.64+.36*Math.max(0,n.getX(i)*-.3+n.getY(i)*.8+n.getZ(i)*.4);colors.push(s,s,s);}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));resources.add(g);return g;};
 for(const g of [box,sphere,torus])shade(g);
 const roof=new T.BufferGeometry(),roofVertices=[];
 // Upturned eaves and a raised ridge: reusable original pavilion roof, not a game asset.
 const ridgeA=[-.5,.42,0],ridgeB=[.5,.42,0],edge=[[-.6,.08,-.5],[.6,.08,-.5],[.6,.08,.5],[-.6,.08,.5]];
 for(const tri of [[ridgeA,edge[0],edge[1]],[ridgeA,edge[1],ridgeB],[ridgeA,ridgeB,edge[2]],[ridgeA,edge[2],edge[3]],[ridgeA,edge[3],edge[0]],[ridgeB,edge[1],edge[2]]])for(const p of tri.reverse())roofVertices.push(...p);
 roof.setAttribute('position',new T.Float32BufferAttribute(roofVertices,3));roof.computeVertexNormals();shade(roof);
 const mesh=(g,m,p,scale)=>{const o=new T.Mesh(g,m);o.position.fromArray(p);o.scale.fromArray(scale);group.add(o);return o;};
 if(floor){mesh(box,water,[0,-.26,0],[150,.1,150]);mesh(box,stone,[0,-.10,4],[36,.2,24]);mesh(box,jade,[0,-.18,4],[36.6,.15,24.6]);}
 // Perimeter only: every raised prop outside the entire reserved 36x24 action footprint.
 for(const side of [-1,1]){
  const x=side*22;mesh(torus,stone,[x,3,-14],[2.6,2.6,.8]);
  for(const z of [-26,-32]){mesh(box,dark,[side*14,1.6,z],[7,3.2,3]);mesh(roof,jade,[side*14,3.2,z],[8,2,4.5]);mesh(box,gold,[side*14,4.07,z],[8,.06,.09]);}
 }
 const peaks=new T.InstancedMesh(sphere,dark,18);const matrix=new T.Matrix4(),q=new T.Quaternion(),v=new T.Vector3();
 for(let i=0;i<18;i++){matrix.compose(v.set(-54+i*6,1,-44-(i%3)*5),q,new T.Vector3(5,4+(i*7%6),3));peaks.setMatrixAt(i,matrix);}group.add(peaks);
 const lanterns=new T.InstancedMesh(box,glow,20),stems=new T.InstancedMesh(box,gold,20);
 for(let i=0;i<20;i++){const x=i<10?-20:20,z=-6+(i%10)*2.5;matrix.compose(v.set(x,1,z),q,new T.Vector3(.25,.5,.25));lanterns.setMatrixAt(i,matrix);matrix.compose(v.set(x,.45,z),q,new T.Vector3(.035,.9,.035));stems.setMatrixAt(i,matrix);}group.add(lanterns,stems);
 const flowers=new T.InstancedMesh(sphere,pink,72);
 for(let i=0;i<72;i++){const side=i%2?-1:1;matrix.compose(v.set(side*(20+(i%7)*.4),.06,-6+(i%24)*1.03),q,new T.Vector3(.25,.08,.25));flowers.setMatrixAt(i,matrix);}group.add(flowers);
 const reflection=new T.InstancedMesh(box,material(0x425b69),32);reflection.name='Painted lunar reflection · no render target';
 for(let i=0;i<32;i++){matrix.compose(v.set(Math.sin(i*2.4)*.6,-.195,-10-i*.58),q,new T.Vector3(.3+(i%5)*.28,.004,.025+(i%3)*.018));reflection.setMatrixAt(i,matrix);}group.add(reflection);
 let disposed=false;
 return {group,floor:ASTRAL_FLOOR,dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const o of [peaks,lanterns,stems,flowers,reflection])o.dispose();for(const r of resources)r.dispose();group.clear();}};
}
/** Read-only bone-envelope occupancy. A footprint check is not a skin collision certificate. */
export function createFloorOccupancy(T,root,floor=ASTRAL_FLOOR){
 const names=['Root','Bip001Pelvis','Bip001Head','Bip001RHand','Bip001LHand','Bip001RFoot','Bip001LFoot'];
 const nodes=names.map(n=>root.getObjectByName(n)).filter(Boolean),p=new T.Vector3();let samples=0,outside=0;const bounds=new T.Box3();
 return {sample(){root.updateMatrixWorld(true);for(const n of nodes){n.getWorldPosition(p);bounds.expandByPoint(p);if(p.x<floor.minX||p.x>floor.maxX||p.z<floor.minZ||p.z>floor.maxZ)outside++;}samples++;},report(){return {samples,outside,anchors:nodes.map(n=>n.name),min:bounds.isEmpty()?null:bounds.min.toArray(),max:bounds.isEmpty()?null:bounds.max.toArray(),evidence:'BONE_ENVELOPE_NOT_SKIN_CONTACT',floor};}};
}
