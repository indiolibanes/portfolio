import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** World fixed; dimensions are measured after the actual vehicle is made vertical. */
export function createVerticalLaunchPad(hull:T.Object3D,nozzle:T.Object3D) {
 hull.updateWorldMatrix(true,true);
 const axis=new T.Vector3(0,1,0).transformDirection(hull.matrixWorld);
 if(axis.dot(new T.Vector3(0,1,0))<.98)throw Error('Launch pad requires world +Y fuselage');
 const box=new T.Box3().setFromObject(hull),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
 const h=size.y,r=Math.max(size.x,size.z)*.5,origin=nozzle.getWorldPosition(new T.Vector3());
 const group=new T.Group();group.name='LaunchPad_R3';group.position.set(center.x,origin.y-h*.10,center.z);
 const metal=new T.MeshStandardMaterial({color:0x252936,metalness:.7,roughness:.5}),trim=new T.MeshStandardMaterial({color:0xc5ad70,metalness:.7,roughness:.4}),dark=new T.MeshStandardMaterial({color:0x0c111b,roughness:.9});
 const amber=new T.MeshBasicMaterial({color:0xffb557});const batches=new Map<T.Material,T.BufferGeometry[]>();
 function bake(g:T.BufferGeometry,m:T.Material,p:T.Vector3,q=new T.Quaternion()) {const geo=g.index?g.toNonIndexed():g.clone();g.dispose();geo.applyMatrix4(new T.Matrix4().compose(p,q,new T.Vector3(1,1,1)));if(!batches.has(m))batches.set(m,[]);batches.get(m)!.push(geo);}
 function block(name:string,w:number,hh:number,d:number,x:number,y:number,z:number,m=metal) {const geo=new T.BoxGeometry(w,hh,d);bake(geo,m,new T.Vector3(x,y,z));}
 const padRadius=h*.95,foundation=new T.Mesh(new T.CylinderGeometry(padRadius,padRadius*1.06,h*.09,8),dark);foundation.name='Pad_Foundation';foundation.position.y=-h*.045;group.add(foundation);
 // Offset exhaust trench leaves the nozzle visible and vents to the camera side.
 block('Exhaust_Trench',r*1.3,h*.04,h*.9,0,-h*.035,h*.27,dark);
 for(const side of [-1,1])block('Exhaust_Baffle',h*.06,h*.09,h*.72,side*r*1.8,h*.025,h*.18);
 const tower=new T.Group();tower.name='Support_Tower';tower.position.set(-h*.55,0,-h*.26);group.add(tower);
 const towerParts:T.BufferGeometry[]=[];
 function towerBeam(a:T.Vector3,b:T.Vector3,w:number) {const g=new T.BoxGeometry(w,a.distanceTo(b),w).toNonIndexed();g.applyMatrix4(new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize()),new T.Vector3(1,1,1)));towerParts.push(g);}
 for(const x of [-1,1])for(const z of [-1,1])towerBeam(new T.Vector3(x*h*.10,0,z*h*.10),new T.Vector3(x*h*.10,h*1.05,z*h*.10),h*.018);
 for(let i=0;i<4;i++){const y=i*h*.26;for(const z of [-1,1])towerBeam(new T.Vector3(-h*.10,y,z*h*.10),new T.Vector3(h*.10,y+h*.26,z*h*.10),h*.012);towerBeam(new T.Vector3(-h*.1,y,-h*.1),new T.Vector3(-h*.1,y,h*.1),h*.025);}
 tower.add(new T.Mesh(mergeGeometries(towerParts),metal));towerParts.forEach(g=>g.dispose());
 const arm=new T.Group();arm.name='UmbilicalArm_Pivot';arm.position.set(-h*.55,h*.8,-h*.26);const armLength=Math.max(h*.06,h*.55-r*1.04);const um=new T.Mesh(new T.BoxGeometry(armLength,h*.025,h*.035),trim);um.position.x=armLength*.5;arm.add(um);group.add(arm);
 const clamps:T.Group[]=[];
 for(const sign of [-1,1]){const pivot=new T.Group();pivot.name=sign<0?'HoldDown_A_Pivot':'HoldDown_B_Pivot';pivot.position.set(sign*r*1.8,h*.09,0);const jaw=new T.Mesh(new T.BoxGeometry(r*.95,h*.04,h*.07),trim);jaw.position.x=-sign*r*.46;pivot.add(jaw);group.add(pivot);clamps.push(pivot);block('HoldDown_Foot',h*.1,h*.09,h*.14,sign*r*1.8,h*.045,0);}
 for(const sign of [-1,1]){const beacon=new T.Mesh(new T.SphereGeometry(h*.018,8,6),amber);beacon.name='SafetyBeacon_'+sign;beacon.position.set(sign*h*.7,h*.03,h*.45);group.add(beacon);}
 for(const [m,gs] of batches){group.add(new T.Mesh(mergeGeometries(gs),m));gs.forEach(g=>g.dispose());}
 const steam=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),new T.MeshBasicMaterial({color:0x9eabbf,transparent:true,opacity:.12,depthWrite:false}),8);steam.name='VentAndSmoke_Emitter';steam.frustumCulled=false;group.add(steam);const dummy=new T.Object3D();
 function update(t:number,release:number,power:number,reduced:boolean){clamps.forEach((c,i)=>{c.rotation.z=(i? -1:1)*release*1.25;});arm.rotation.y=-release*1.35;steam.visible=!reduced&&power>0&&release<.99;for(let i=0;i<8;i++){const u=(t*.32+i/8)%1;dummy.position.set((i%2?1:-1)*(r*1.8+u*h*.65),h*(.04+u*.12),h*(.15+u*.4));dummy.scale.setScalar(h*(.04+u*.14));dummy.updateMatrix();steam.setMatrixAt(i,dummy.matrix);}steam.instanceMatrix.needsUpdate=true;}
 group.updateMatrixWorld(true);const padBox=new T.Box3().setFromObject(group),stats={triangles:0,meshes:0,stationary:true,hullHeight:h,hullRadius:r};group.traverse(n=>{const m=n as T.Mesh;if(m.geometry){stats.triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3*((m as T.InstancedMesh).isInstancedMesh?8:1);stats.meshes++;}});
 return {group,groundY:group.position.y,box:padBox,stats,update,dispose(){const mats=new Set<T.Material>(),geos=new Set<T.BufferGeometry>();group.traverse(n=>{const m=n as T.Mesh;if(m.geometry)geos.add(m.geometry);if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(x=>mats.add(x));});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());steam.dispose();group.removeFromParent();}};
}
