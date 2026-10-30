/** Small, genuinely spatial bedroom diorama. No external textures or physics runtime. */
import * as THREE from 'three';

export function buildSophiaRoom(scene) {
  const owned = [];
  const accent = [];
  const mat = (hex, roughness = 0.84, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color: hex, roughness, metalness });
  const navy = mat(0x111b36);
  const floorMat = mat(0x302238);
  const burgundy = mat(0x821d40);
  const burgundyDark = mat(0x4b1834);
  const upholstery = mat(0xb83a59);
  const indigo = mat(0x24204d);
  const warmWood = mat(0x513048);
  const metal = mat(0x333c5d, 0.38, 0.36);
  const cream = mat(0xf2c995);
  const black = mat(0x0b0d1a);
  const blueGlow = new THREE.MeshBasicMaterial({ color: 0x719fff });
  const goldGlow = new THREE.MeshBasicMaterial({ color: 0xf9ce78 });
  const mats = [navy, floorMat, burgundy, burgundyDark, upholstery, indigo, warmWood, metal, cream, black, blueGlow, goldGlow];
  const box = (w,h,d,x,y,z,m,rotY=0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
    mesh.position.set(x,y,z);
    mesh.rotation.y=rotY;
    scene.add(mesh); owned.push(mesh); return mesh;
  };
  const sphere = (r,x,y,z,m) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r,14,10),m);
    mesh.position.set(x,y,z); scene.add(mesh); owned.push(mesh); return mesh;
  };
  // Three walls and actual floor, with shallow parallax at a fixed theatrical camera.
  box(13,0.16,6,0,-0.14,-0.7,floorMat);
  box(13,5.4,0.14,0,2.68,-3.4,navy);
  box(0.12,5.4,6,-6.4,2.68,-0.6,indigo);
  box(0.12,5.4,6,6.4,2.68,-0.6,indigo);
  for (let i=0;i<13;i++) box(12.6,0.018,0.016,0,0.01,-3.03+i*0.43,warmWood);
  // Window: recess, luminous moon and frames.
  box(2.7,2.25,0.06,-3.8,3.47,-3.25,black);
  box(2.4,1.96,0.025,-3.8,3.47,-3.19,new THREE.MeshBasicMaterial({color:0x152b62}));
  sphere(.43,-3.5,3.83,-3.11,new THREE.MeshBasicMaterial({color:0xdfeaff}));
  box(0.07,2.23,0.09,-3.8,3.46,-3.04,metal);
  box(2.65,0.08,0.09,-3.8,3.44,-3.02,metal);
  box(2.86,0.12,0.3,-3.8,2.29,-3,metal);
  for(let i=0;i<10;i++) {
    const x=-4.8+(i*43%93)/93*1.9, y=2.65+(i*31%73)/73*1.65;
    sphere(.013,x,y,-3.12,goldGlow);
  }
  // Deep crimson sofa with armrests and separate cushions.
  box(3.6,0.45,1.16,-2.2,.45,-1.82,burgundyDark);
  box(3.6,1.1,.38,-2.2,1.14,-2.31,burgundy);
  box(.38,1.05,1.3,-4.05,.67,-1.8,burgundy);
  box(.38,1.05,1.3,-.35,.67,-1.8,burgundy);
  for (const x of [-3.12,-2.23,-1.34]) {
    box(.83,.55,.31,x,1.14,-2.07,upholstery);
    box(.85,.25,.95,x,.68,-1.78,burgundy);
  }
  // Oval woven carpet, low and grounded, in front of the sofa.
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.5,2.5,.025,36),indigo);
  rug.scale.z=.65; rug.position.set(-1.65,.015,.74);
  scene.add(rug); owned.push(rug);
  const rugInner = new THREE.Mesh(new THREE.CylinderGeometry(2.18,2.18,.027,36),navy);
  rugInner.scale.z=.64; rugInner.position.set(-1.65,.032,.74);
  scene.add(rugInner); owned.push(rugInner);
  // Cathode ray television and game console, turned towards Sophia but visible from front.
  const tv=new THREE.Group();tv.position.set(3.18,1.82,-1.6);tv.rotation.y=-.20;
  scene.add(tv);
  const tvBox=(w,h,d,x,y,z,m)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
    mesh.position.set(x,y,z); tv.add(mesh); owned.push(mesh); return mesh;
  };
  tvBox(2.65,2.10,1.25,0,0,0,black);
  tvBox(2.35,1.77,.12,-.09,.05,.67,metal);
  const screenMaterial=new THREE.MeshBasicMaterial({color:0x4166c7,transparent:true,opacity:.85});
  mats.push(screenMaterial);
  tvBox(2.05,1.51,.035,-.12,.07,.752,screenMaterial);
  tvBox(2.05,.055,.04,-.12,.25,.785,blueGlow);
  // Tiny silhouettes on the screen: non-interactive retro-game visual.
  for(let i=0;i<6;i++) {
    const x=-.91+(i%3)*.64;
    const y=-.3+Math.floor(i/3)*.43;
    tvBox(.30,.20,.055,x,y,.792,i%2?goldGlow:cream);
  }
  tvBox(2.9,.15,1.7,3.18,-1.26,-.02,warmWood); // moved by tv local transform, shelf below
  const knob=sphere(.095,4.18,1.17,-.65,goldGlow); accent.push(knob);
  box(2.7,.20,1.44,3.16,.52,-1.55,warmWood);
  box(.21,.56,1.1,2.0,.23,-1.55,warmWood);
  box(.21,.56,1.1,4.28,.23,-1.55,warmWood);
  box(1.3,.22,.66,3.18,.71,-.89,black);
  box(.7,.035,.21,3.18,.85,-.8,metal);
  // Floor lamp, small shelves, glowing cabinet stickers.
  box(.12,2.6,.12,5.42,1.3,-2.65,metal);
  sphere(.30,5.42,2.65,-2.65,goldGlow);
  box(1.6,.10,.35,.4,3.2,-3.10,warmWood);
  box(1.6,.10,.35,.4,2.5,-3.10,warmWood);
  for(let i=0;i<7;i++){
    const h=.25+(i%3)*.15;
    box(.12,h,.23,-.18+i*.20,3.29+h/2,-3.04,
      i%3===0?burgundy:i%3===1?cream:indigo);
  }
  const moonLight=new THREE.PointLight(0x90aaff,12,7,2);
  moonLight.position.set(-3.5,3.83,-2.3);scene.add(moonLight);accent.push(moonLight);
  const tvLight=new THREE.PointLight(0x6f83ff,16,6,2);
  tvLight.position.set(2.2,2.12,-.1);scene.add(tvLight);accent.push(tvLight);
  const warmLight=new THREE.PointLight(0xff9a64,10,5,2);
  warmLight.position.set(5.0,2.65,-1.5);scene.add(warmLight);accent.push(warmLight);
  function update(t){
    screenMaterial.opacity=.76+Math.sin(t*1.5)*.08;
    tvLight.intensity=14+Math.sin(t*1.5)*3;
  }
  function dispose(){
    for (const mesh of owned) {
      mesh.geometry?.dispose();
      mesh.parent?.remove(mesh);
    }
    for(const obj of accent)obj.parent?.remove(obj);
    for(const m of mats)m.dispose();
    scene.remove(tv);
  }
  return {update,dispose};
}
