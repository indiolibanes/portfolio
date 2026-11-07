/**
 * Duet-only screen-anchored lunar background.
 * One camera child means no per-frame pose writes or new RAF.
 * Negative render order + no depth write keeps BOTH characters in front.
 */
export function attachFixedDuetMoon(T,{scene,camera,moon,halo}){
 if(!scene||!camera?.isPerspectiveCamera||!moon?.isMesh||!halo?.isMesh)
  throw Error('Duet moon requires one existing scene, camera and lunar pair');
 const depth=Math.min(32,camera.far-2);
 if(!(depth>camera.near))throw Error('Invalid backdrop depth');
 const sourceRadius=moon.geometry?.parameters?.radius;
 if(!(sourceRadius>0))throw Error('Invalid lunar sphere');
 // The Hsin stage freezes existing world matrices for performance before
 // this moon is reparented. Re-enable only these two lunar background meshes.
 moon.matrixAutoUpdate=true;halo.matrixAutoUpdate=true;
 const resize=()=>{
  const halfHeight=depth*Math.tan(camera.fov*Math.PI/360);
  // Dramatically larger than R6.4.2: ~2.7-3.3x diameter, fixed horizontally
  // centred and elevated in screen-space, as a photographic lunar backdrop.
  const r=halfHeight*(camera.aspect<.8?.98:1.14);
  moon.scale.setScalar(r/sourceRadius);
  moon.position.set(0,halfHeight*.46,-depth);
  moon.updateMatrix();
 };
 resize();
 moon.renderOrder=-100;
 moon.material.depthTest=false;moon.material.depthWrite=false;moon.material.fog=false;
 // Keep the baked atmospheric halo behind the sculpted sphere.
 halo.scale.setScalar(.9);
 halo.position.set(0,0,-depth-.12);
 halo.renderOrder=-110;
 halo.material.depthTest=false;halo.material.depthWrite=false;halo.material.opacity=.10;
 // Transparent render passes would draw after the characters. Avoid a halo overlay.
 halo.visible=false;
 halo.updateMatrix();moon.updateMatrix();camera.add(halo,moon);
 if(!camera.parent)scene.add(camera);
 return {depth,resize,screenCenter:Object.freeze([0,.46]),mode:'CAMERA_LOCKED_BACKGROUND'};
}
