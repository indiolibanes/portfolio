/** A static terrace, lake and celestial layer. No clock, shaders or post-processing. */
export const MOONLIT=Object.freeze({
 sky:'/assets/scenes/hsin/night-sky-v1.webp',moon:'/assets/scenes/hsin/full-moon-v1.webp',
 moonPosition:[-.42,2.15,-10],moonSize:4.8,discRatio:292/512,
 fog:0x273b53,terrace:0x1b293d,lake:0x1b3049,
});

export function createMoonlitEnvironment({THREE:T,skyTexture,moonTexture}){
 skyTexture.generateMipmaps=false;skyTexture.minFilter=T.LinearFilter;
 const group=new T.Group();group.name='Hsin · moonlit lake';
 const basic=(color,extra={})=>new T.MeshBasicMaterial({color,...extra});
 const mesh=(name,geometry,material)=>{const m=new T.Mesh(geometry,material);m.name=name;group.add(m);return m;};
 const horizontal=(m,y)=>{m.rotation.x=-Math.PI/2;m.position.y=y;return m;};
 horizontal(mesh('Lake · still water',new T.PlaneGeometry(90,90),basic(MOONLIT.lake)),-.105);
 // Two polygonal shorelines at distinct depths provide translation/orbit parallax.
 for(const [z,color,phase,scale]of [[-23,0x30445a,0,1.1],[-14,0x20364c,1.4,.72]]){
  const shape=new T.Shape();shape.moveTo(-45,-.11);shape.lineTo(45,-.11);
  for(let i=36;i>=0;i--){const x=-45+i*2.5,y=.18+scale*(.45+.3*Math.sin(i*.71+phase)+.23*Math.sin(i*1.37+phase));shape.lineTo(x,y);}
  shape.closePath();const ridge=mesh('Distant shore '+z,new T.ShapeGeometry(shape),basic(color));ridge.position.z=z;
 }
 // Static ribbons are merged into one geometry/draw call; no reflective render target.
 const vertices=[],colors=[];let seed=732;
 const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 for(let i=0;i<46;i++){
  const z=-13+i*.235,width=.24+(13+z)*.12+random()*.26,x=-.42+(random()-.5)*width*.6,depth=.012+random()*.025;
  vertices.push(x-width,-.099,z,x+width,-.099,z,x+width,-.099,z+depth,x-width,-.099,z,x+width,-.099,z+depth,x-width,-.099,z+depth);
  const c=new T.Color().setHex(i%4===0?0xd4c5a0:0x849bad);for(let k=0;k<6;k++)colors.push(c.r,c.g,c.b);
 }
 for(let i=0;i<32;i++){
  const z=-12+random()*9,x=(random()-.5)*15,width=.12+random()*.7,depth=.008+random()*.013;
  vertices.push(x-width,-.099,z,x+width,-.099,z,x+width,-.099,z+depth,x-width,-.099,z,x+width,-.099,z+depth,x-width,-.099,z+depth);
  const c=new T.Color(0x546a7d);for(let k=0;k<6;k++)colors.push(c.r,c.g,c.b);
 }
 const reflection=new T.BufferGeometry();reflection.setAttribute('position',new T.Float32BufferAttribute(vertices,3));reflection.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 mesh('Moon path · painted reflection',reflection,basic(0xffffff,{vertexColors:true,transparent:true,opacity:.36,depthWrite:false,side:T.DoubleSide}));
 horizontal(mesh('Terrace · stone landing',new T.CircleGeometry(2.65,64),basic(MOONLIT.terrace)),-.083);
 const celestial=new T.Group();celestial.name='Celestial depth · camera-facing';group.add(celestial);
 const moon=new T.Mesh(new T.PlaneGeometry(MOONLIT.moonSize,MOONLIT.moonSize),basic(0xffffff,{map:moonTexture,transparent:true,depthWrite:false,fog:false,toneMapped:false}));
 moon.name='Full moon · disc and baked halo';moon.position.fromArray(MOONLIT.moonPosition);celestial.add(moon);
 return {
  group,background:skyTexture,fog:new T.Fog(MOONLIT.fog,10,42),
  // A distant sky has negligible parallax. Track the viewing direction only on camera changes;
  // the terrace, lake and shores stay world-fixed. No celestial updates in the acting loop.
  frameSky(camera,target){celestial.position.copy(target);celestial.quaternion.copy(camera.quaternion);celestial.updateMatrix();},
 };
}
