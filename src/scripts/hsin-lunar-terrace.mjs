import {MOONLIT,createMoonlitEnvironment} from './hsin-moonlit-environment.mjs';
export const LUNAR_TERRACE=Object.freeze({
 ...MOONLIT,sky:'/assets/scenes/hsin/night-sky-v201.webp',moon:'/assets/scenes/hsin/golden-moon-v201.webp',
 stone:'/assets/scenes/hsin/stone-v201.webp',atlas:'/assets/scenes/hsin/terrace-atlas-v201.webp',floorY:0,
});

/** Static, batched stone architecture. No animation clock, render targets or extra lights. */
export function createLunarTerrace({THREE:T,skyTexture,moonTexture,stoneTexture,atlasTexture,feet=[[-.09,.003,0],[.09,.003,0]],rootDegrees=0}){
 const base=createMoonlitEnvironment({THREE:T,skyTexture,moonTexture,includeTerrace:false}),group=base.group;group.name='Lunar Terrace · V2.0.1';
 base.fog=new T.Fog(0x22364e,10,42);
 group.getObjectByName('Lake · still water').material.color.setHex(0x213d52);
 for(const [name,z,scale,color]of [['Distant shore -23',-32,3.4,0x27394f],['Distant shore -14',-25,2.5,0x1a3047]]){
  const ridge=group.getObjectByName(name);ridge.position.z=z;ridge.scale.y=scale;ridge.material.color.setHex(color);
 }
 const solid=new T.MeshBasicMaterial({vertexColors:true}),cutout=new T.MeshBasicMaterial({map:atlasTexture,vertexColors:true,alphaTest:.08,side:T.DoubleSide});
 const blended=new T.MeshBasicMaterial({map:atlasTexture,vertexColors:true,transparent:true,depthWrite:false,side:T.DoubleSide,forceSinglePass:true});
 const stoneParts=[],roofParts=[],paneParts=[],glowParts=[],branchParts=[],flowerParts=[];
 const color=c=>new T.Color(c),light=new T.Vector3(-.3,.8,.4).normalize();
 function batch(name,parts,material,parent=group){
  const positions=[],normals=[],uvs=[],colors=[];
  for(const {geometry,hex=0xffffff,shade=true}of parts){
   const g=geometry.index?geometry.toNonIndexed():geometry;if(!g.attributes.normal)g.computeVertexNormals();
   const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,c=color(hex);
   for(let i=0;i<p.count;i++){
    positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n.getX(i),n.getY(i),n.getZ(i));uvs.push(uv?.getX(i)??0,uv?.getY(i)??0);
    const orientation=.49+.51*Math.max(0,n.getX(i)*light.x+n.getY(i)*light.y+n.getZ(i)*light.z);
    const groundAO=.72+.28*Math.min(1,Math.max(0,p.getY(i))/.65),s=shade?orientation*groundAO:1;colors.push(c.r*s,c.g*s,c.b*s);
   }
   if(g!==geometry)g.dispose();geometry.dispose();
  }
  const g=new T.BufferGeometry();for(const [key,array,size]of [['position',positions,3],['normal',normals,3],['uv',uvs,2],['color',colors,3]])g.setAttribute(key,new T.Float32BufferAttribute(array,size));
  g.computeBoundingSphere();const mesh=new T.Mesh(g,material);mesh.name=name;parent.add(mesh);return mesh;
 }
 const box=(parts,x,y,z,w,h,d,hex=0x667081)=>parts.push({geometry:new T.BoxGeometry(w,h,d).translate(x,y,z),hex});
 function plane(parts,x,y,z,w,h,cell,{horizontal=false,yaw=0}={}){
  const g=new T.PlaneGeometry(w,h),uv=g.attributes.uv,cx=(cell%4)*128,cy=Math.floor(cell/4)*128;
  for(let i=0;i<uv.count;i++){uv.setXY(i,(cx+uv.getX(i)*128)/512,1-(cy+(1-uv.getY(i))*128)/256);}
  if(horizontal)g.rotateX(-Math.PI/2);if(yaw)g.rotateY(yaw);g.translate(x,y,z);parts.push({geometry:g,hex:0xffffff,shade:false});
 }
 function roof(x,y,z,w,d,h,hex=0x344552){
  const ring=[[-w/2,.10,-d/2],[0,0,-d/2],[w/2,.10,-d/2],[w/2,0,0],[w/2,.10,d/2],[0,0,d/2],[-w/2,.10,d/2],[-w/2,0,0]],p=[];
  for(let i=0;i<8;i++)for(const v of [[0,h,0],ring[i],ring[(i+1)%8]])p.push(v[0]+x,v[1]+y,v[2]+z);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));roofParts.push({geometry,hex});
  box(roofParts,x,y+.015,z,w,.045,d,0x77664d);
 }
 // Continuous rectangular paving, on the actual foot plane. No disc, cylinder, ring or elevated stand.
 stoneTexture.wrapS=stoneTexture.wrapT=T.RepeatWrapping;stoneTexture.repeat.set(4,3);stoneTexture.anisotropy=1;
 const paving=new T.PlaneGeometry(22,14,22,14),tones=[];
 // Sparse vertex gradients: rail occlusion and warm pools painted into the stone, once at mount.
 for(let i=0;i<paving.attributes.position.count;i++){
  const x=paving.attributes.position.getX(i),z=3-paving.attributes.position.getY(i),rail=Math.exp(-(((z+3.25)/.7)**2)),shade=1-.30*rail;
  let warmth=0;for(const lamp of [-4.5,-1,1,4.5])warmth+=Math.exp(-(((x-lamp)/.7)**2)-((z+2.8)/1.3)**2)*.10;
  const c=new T.Color(.58*shade+warmth,.66*shade+warmth*.53,.79*shade+warmth*.14);tones.push(c.r,c.g,c.b);
 }
 paving.setAttribute('color',new T.Float32BufferAttribute(tones,3));
 const floor=new T.Mesh(paving,new T.MeshBasicMaterial({map:stoneTexture,vertexColors:true,color:0xffffff}));floor.name='Continuous stone terrace';floor.rotation.x=-Math.PI/2;floor.position.set(0,0,3);group.add(floor);
 box(stoneParts,0,-.10,-4,22,.20,.20,0x48566a);
 // A low rear balustrade and short side returns. Its open bays frame, rather than occlude, Hsin.
 for(const x of [-8,-6,-4,-2,0,2,4,6,8]){
  box(stoneParts,x,.10,-3.25,.36,.20,.36,0x737b87);box(stoneParts,x,.43,-3.25,.14,.50,.14,0x657181);box(stoneParts,x,.74,-3.25,.34,.12,.34,0x9b9b94);
 }
 for(const y of [.19,.71])box(stoneParts,0,y,-3.25,16,.09,.15,0x828991);
 for(const side of [-1,1]){box(stoneParts,side*8,.71,-1.7,.15,.09,3.1,0x828991);box(stoneParts,side*8,.19,-1.7,.15,.09,3.1,0x657181);}
 // Architectural silhouettes across the lake: clustered timber volumes and upturned pagoda roofs.
 const city=[[-10,1.0],[-7.4,1.4],[-5.2,1.05],[-3.5,.8],[-1.9,.75],[.4,.7],[2.1,.95],[3.8,1.15],[6.2,1.7],[8.8,1.1],[11.5,.9]];
 for(const [i,[x,originalHeight]]of city.entries()){
  const h=originalHeight*.60,z=-19-(i%3)*1.3,w=i%3===0?1.65:1.2,d=.9;
  box(stoneParts,x,.13+h/2,z,w,h,d,i%2?0x4c4f59:0x414d5d);roof(x,.13+h,z,w+.48,d+.35,.26);
  for(let row=0;row<(h>.8?2:1);row++)for(let col=0;col<4;col++)plane(paneParts,x-w*.36+col*w*.24,.28+row*.30,z+d/2+.007,.18,.21,1);
  if(i===1||i===8){box(stoneParts,x,.13+h+.24,z,w*.65,.42,d*.7,0x565761);roof(x,.13+h+.45,z,w*.95,d*.95,.28,0x44505c);for(let col=0;col<3;col++)plane(paneParts,x-.30+col*.30,.13+h+.26,z+d*.35+.01,.17,.21,1);}
 }
 // Four lanterns share meshes/materials, with painted panels/halos, not individual light objects.
 for(const x of [-4.5,-1,1,4.5]){
  const z=-3.25,y=.98,w=.26,h=.39,d=.22;
  box(stoneParts,x,.82,z,.34,.12,.32,0x8f8a7d);roof(x,y+h/2+.02,z,.42,.36,.13,0x4d4949);
  for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2])box(roofParts,x+dx,y,z+dz,.025,h,.025,0x5b4437);
  box(roofParts,x,y-h/2,z,w+.035,.04,d+.035,0x5b4437);
  plane(paneParts,x,y,z+d/2,.235,h-.04,0);plane(paneParts,x,y,z-d/2,.235,h-.04,0);
  plane(paneParts,x+w/2,y,z,d-.02,h-.04,0,{yaw:Math.PI/2});plane(paneParts,x-w/2,y,z,d-.02,h-.04,0,{yaw:Math.PI/2});
  plane(glowParts,x,y,z+.15,.80,.96,4);
 }
 // The water uses static, merged light ribbons in perspective, plus soft lantern echoes.
 const oldReflection=group.getObjectByName('Moon path · painted reflection'),water=[];
 let seed=941;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 for(let i=0;i<86;i++){
  const z=-19+i*.17,w=.18+(z+19)*.14+rand()*.4,x=-.75+(rand()-.5)*w*.7;
  water.push({geometry:new T.PlaneGeometry(w*2,.012+rand()*.024).rotateX(-Math.PI/2).translate(x,-.099,z),hex:i%3===0?0xe6be70:0x9e9d8e,shade:false});
 }
 for(const [x]of city)for(let i=0;i<10;i++)water.push({geometry:new T.PlaneGeometry(.1+rand()*.4,.012).rotateX(-Math.PI/2).translate(x+(rand()-.5)*.3,-.099,-17+i*.39),hex:0xb29a68,shade:false});
 for(let i=0;i<32;i++)water.push({geometry:new T.PlaneGeometry(.15+rand()*.8,.01).rotateX(-Math.PI/2).translate((rand()-.5)*23,-.099,-18+rand()*12),hex:0x697f91,shade:false});
 for(const x of [-1,1])for(let i=0;i<8;i++)water.push({geometry:new T.PlaneGeometry(.12+rand()*.18,.014).rotateX(-Math.PI/2).translate(x+(rand()-.5)*.2,-.099,-4.6-i*.16),hex:0xd8b478,shade:false});
 oldReflection.geometry.dispose();oldReflection.material.dispose();group.remove(oldReflection);
 batch('Golden lunar and village reflections',water,new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.50,depthWrite:false,side:T.DoubleSide,forceSinglePass:true}));
 for(const p of feet)plane(glowParts,p[0],.003,p[2],.20,.34,5,{horizontal:true,yaw:rootDegrees*Math.PI/180});
 // Peripheral blossoms: actual low-poly branches and sparse atlas clusters. No characters/placeholders.
 const flowers=new T.Group();flowers.name='Peripheral red blossoms';group.add(flowers);
 function branch(a,b,r=.015){const from=new T.Vector3(...a),to=new T.Vector3(...b),delta=to.clone().sub(from),g=new T.CylinderGeometry(r*.55,r,delta.length(),5,1);
  g.applyMatrix4(new T.Matrix4().compose(from.add(to).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()),new T.Vector3(1,1,1)));branchParts.push({geometry:g,hex:0x62454b});
 }
 for(const side of [-1,1]){
  const a=[side*1.14,.02,.75],b=[side*.99,.38,.66],c=[side*1.30,.66,.64];branch(a,b,.024);branch(b,c,.017);branch(b,[side*.8,.57,.61],.013);
  for(const [i,p]of [[side*1.22,.62,.65],[side*.9,.5,.62],[side*1.1,.38,.66]].entries())plane(flowerParts,...p,.36,.36,2+i%2,{yaw:side*.2});
 }
 branch([-1.95,1.83,-.5],[-1.34,2.12,-.6],.026);branch([-1.34,2.12,-.6],[-.8,2.19,-.66],.018);branch([-1.5,2.04,-.56],[-1.30,1.89,-.5],.013);
 for(const p of [[-1.72,1.94,-.52],[-1.36,2.1,-.6],[-1.03,2.18,-.66],[-1.29,1.9,-.49]])plane(flowerParts,...p,.33,.33,3);
 batch('Batched stone balustrade and village',stoneParts,solid);batch('Batched pagoda roofs and lantern frames',roofParts,solid);
 batch('Warm windows and lantern panels',paneParts,cutout);batch('Lantern halos and separate foot contacts',glowParts,blended);
 batch('Blossom branches',branchParts,solid,flowers);batch('Red blossom clusters',flowerParts,cutout,flowers);
 const frameSky=(camera,target)=>{base.frameSky(camera,target);flowers.scale.x=Math.max(.52,Math.min(1,camera.aspect/.9));flowers.updateMatrix();};
 return {...base,group,frameSky};
}
