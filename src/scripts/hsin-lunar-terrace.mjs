import {MOONLIT,createMoonlitEnvironment} from './hsin-moonlit-environment.mjs';
export const LUNAR_TERRACE=Object.freeze({
 ...MOONLIT,sky:'/assets/scenes/hsin/night-sky-v201.webp',moon:'/assets/scenes/hsin/golden-moon-v201.webp',
 water:'/assets/scenes/hsin/water-v201.webp',stone:'/assets/scenes/hsin/stone-v201.webp',atlas:'/assets/scenes/hsin/terrace-atlas-v201.webp',floorY:0,
});

/** Static, batched stone architecture. No animation clock, render targets or extra lights. */
export function createLunarTerrace({THREE:T,skyTexture,moonTexture,stoneTexture,atlasTexture,waterTexture,feet=[[-.09,.003,0],[.09,.003,0]],rootDegrees=0}){
 const base=createMoonlitEnvironment({THREE:T,skyTexture,moonTexture,includeTerrace:false}),group=base.group;group.name='Lunar Terrace · V2.0.1';
 base.fog=new T.Fog(0x22364e,10,42);
 const lake=group.getObjectByName('Lake · still water');lake.material.color.setHex(0xffffff);lake.material.vertexColors=true;
 if(waterTexture){waterTexture.wrapS=waterTexture.wrapT=T.RepeatWrapping;waterTexture.repeat.set(12,9);lake.material.map=waterTexture;}
 lake.geometry.dispose();lake.geometry=new T.PlaneGeometry(90,90,1,18);const waterTones=[];
 for(let i=0;i<lake.geometry.attributes.position.count;i++){
  const z=-lake.geometry.attributes.position.getY(i),depth=Math.max(0,Math.min(1,(-z-4)/24)),c=new T.Color().setRGB(.018+depth*.007,.049+depth*.012,.077+depth*.016);waterTones.push(c.r,c.g,c.b);
 }lake.geometry.setAttribute('color',new T.Float32BufferAttribute(waterTones,3));
 // Dense silhouette samples, not tessellated terrain. Stable harmonics preserve parallax.
 for(const [name,z,height,phase,color]of [['Distant shore -23',-34,3.9,.6,0x314458],['Distant shore -14',-25,2.65,2.1,0x1d3448]]){
  const ridge=group.getObjectByName(name),shape=new T.Shape();shape.moveTo(-45,-.2);shape.lineTo(45,-.2);
  for(let i=180;i>=0;i--){const x=-45+i*.5,envelope=.46+.22*Math.sin(x*.19+phase)+.13*Math.sin(x*.43+phase*.7),detail=.08*Math.sin(x*1.17)+.027*Math.sin(x*2.8+phase);shape.lineTo(x,height*(envelope+detail));}
  shape.closePath();ridge.geometry.dispose();ridge.geometry=new T.ShapeGeometry(shape);ridge.position.z=z;ridge.material.color.setHex(color);
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
 function plane(parts,x,y,z,w,h,cell,{horizontal=false,yaw=0,tint=0xffffff}={}){
  const g=new T.PlaneGeometry(w,h),uv=g.attributes.uv,cx=(cell%4)*128,cy=Math.floor(cell/4)*128;
  for(let i=0;i<uv.count;i++){uv.setXY(i,(cx+uv.getX(i)*128)/512,1-(cy+(1-uv.getY(i))*128)/256);}
  if(horizontal)g.rotateX(-Math.PI/2);if(yaw)g.rotateY(yaw);g.translate(x,y,z);parts.push({geometry:g,hex:tint,shade:false});
 }
 function roof(x,y,z,w,d,h,hex=0x344552){
  // Three hipped bands bend upward at the eaves, with a shallow horizontal ridge.
  const outline=[[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]],rings=[];
  for(const [scale,lift,curve]of [[1,0,.13],[.76,.18,.035],[.34,.86,0]])rings.push(outline.map(([a,b])=>[x+a*w*.5*scale,y+h*lift+curve*Math.abs(a*b),z+b*d*.5*scale]));
  const p=[];for(let r=0;r<2;r++)for(let i=0;i<8;i++){const j=(i+1)%8;for(const v of [rings[r][i],rings[r+1][i],rings[r+1][j],rings[r][i],rings[r+1][j],rings[r][j]])p.push(...v);}
  for(let i=0;i<8;i++)for(const v of [[x,y+h,z],rings[2][(i+1)%8],rings[2][i]])p.push(...v);
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(p,3));roofParts.push({geometry,hex});
  // A thin ridge cap and two dark fascia strips suggest tiles without modelling each tile.
  box(roofParts,x,y+h+.014,z,w*.42,.028,.045,0x7f7457);
  for(const sign of [-1,1])box(roofParts,x,y+.02,z+sign*d*.47,w*.82,.025,.025,0x786b55);
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
  const h=originalHeight*(.58+.08*Math.sin(i*1.71)),z=-19-(i%3)*1.3+Math.sin(i*2.3)*.45,w=i%3===0?1.65:1.2,d=.9;
  box(stoneParts,x,.13+h/2,z,w,h,d,i%2?0x4c4f59:0x414d5d);roof(x,.13+h,z,w+.48,d+.35,.26);
  for(let row=0;row<(h>.8?2:1);row++)for(let col=0;col<4;col++)if((i*3+col+row)%5!==0)plane(paneParts,x-w*.36+col*w*.24,.28+row*.30,z+d/2+.007,.12+((i+col)%3)*.025,.18+row*.02,1);
  if(i%4===0){box(stoneParts,x+w*.55,.25,z+.12,w*.5,.26,d*.7,0x3b4753);roof(x+w*.55,.39,z+.12,w*.67,d*.95,.15,0x344353);}
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
 // Irregular concentrated bands: no evenly spaced ladder or second render pass.
 for(let i=0;i<108;i++){
  const depth=rand(),z=-19+depth*14.7,w=.07+depth*.95+rand()*.48,x=-.9+(rand()-.5)*(.18+depth*1.8);
  const c=new T.Color(i%4===0?0xe3bf7a:0xb2a788).multiplyScalar(.68+depth*.32);
  water.push({geometry:new T.PlaneGeometry(w*1.4,.011+rand()*.028).rotateX(-Math.PI/2).translate(x,-.099,z),hex:c,shade:false});
 }
 for(const [x]of city)for(let i=0;i<6;i++){const depth=rand();water.push({geometry:new T.PlaneGeometry(.05+rand()*.24,.006+rand()*.01).rotateX(-Math.PI/2).translate(x+(rand()-.5)*.4,-.099,-18+depth*3.6),hex:0x9f8d64,shade:false});}
 for(let i=0;i<52;i++)water.push({geometry:new T.PlaneGeometry(.12+rand()*.7,.006+rand()*.009).rotateX(-Math.PI/2).translate((rand()-.5)*24,-.099,-19+rand()*14),hex:0x62788a,shade:false});
 for(const x of [-1,1])for(let i=0;i<9;i++)water.push({geometry:new T.PlaneGeometry(.08+rand()*.20,.008+rand()*.01).rotateX(-Math.PI/2).translate(x+(rand()-.5)*.22,-.099,-4.1-rand()*1.7),hex:0xd0b078,shade:false});
 oldReflection.geometry.dispose();oldReflection.material.dispose();group.remove(oldReflection);
 batch('Golden lunar and village reflections',water,new T.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.50,depthWrite:false,side:T.DoubleSide,forceSinglePass:true}));
 for(const p of feet)plane(glowParts,p[0],.003,p[2],.20,.34,5,{horizontal:true,yaw:rootDegrees*Math.PI/180});
 // Peripheral blossoms: actual low-poly branches and sparse atlas clusters. No characters/placeholders.
 const flowers=new T.Group();flowers.name='Peripheral red blossoms';group.add(flowers);
 function branch(a,b,r=.015){const from=new T.Vector3(...a),to=new T.Vector3(...b),delta=to.clone().sub(from),g=new T.CylinderGeometry(r*.55,r,delta.length(),5,1);
  g.applyMatrix4(new T.Matrix4().compose(from.add(to).multiplyScalar(.5),new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()),new T.Vector3(1,1,1)));branchParts.push({geometry:g,hex:0x62454b});
 }
 for(const side of [-1,1]){
  const a=[side*1.14,.02,.75],b=[side*.99,.38,.66],c=[side*1.30,.66,.64];branch(a,b,.014);branch(b,c,.009);branch(b,[side*.8,.57,.61],.006);
  for(const [i,p]of [[side*1.22,.62,.65],[side*.9,.5,.62],[side*1.1,.38,.66],[side*1.28,.50,.65]].entries()){const size=[.24,.20,.28,.14][i];plane(flowerParts,...p,size,size,2+i%2,{yaw:side*.2,tint:[0xffffff,0xf0cece,0xffd3bb,0xe6acb5][i]});}
 }
 branch([-1.95,1.83,-.5],[-1.34,2.12,-.6],.014);branch([-1.34,2.12,-.6],[-.8,2.19,-.66],.009);branch([-1.5,2.04,-.56],[-1.30,1.89,-.5],.006);
 for(const p of [[-1.72,1.94,-.52],[-1.36,2.1,-.6],[-1.03,2.18,-.66],[-1.29,1.9,-.49]])plane(flowerParts,...p,.24,.24,3);
 batch('Batched stone balustrade and village',stoneParts,solid);batch('Batched pagoda roofs and lantern frames',roofParts,solid);
 batch('Warm windows and lantern panels',paneParts,cutout);batch('Lantern halos and separate foot contacts',glowParts,blended);
 batch('Blossom branches',branchParts,solid,flowers);batch('Red blossom clusters',flowerParts,cutout,flowers);
 const frameSky=(camera,target)=>{base.frameSky(camera,target);flowers.scale.x=Math.max(.52,Math.min(1,camera.aspect/.9));flowers.updateMatrix();};
 return {...base,group,frameSky};
}
