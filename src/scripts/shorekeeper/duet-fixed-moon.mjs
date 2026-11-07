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
 const resize=()=>{
  const r=depth*Math.tan(camera.fov*Math.PI/360)*(camera.aspect<.8?.30:.42);
  moon.scale.setScalar(r/sourceRadius);
 };
 resize();
 moon.position.set(0,0,-depth);
 moon.renderOrder=-100;
 moon.material.depthTest=false;moon.material.depthWrite=false;moon.material.fog=false;
 // Keep the baked atmospheric halo behind the sculpted sphere.
 halo.scale.setScalar(.9);
 halo.position.set(0,0,-depth-.12);
 halo.renderOrder=-110;
 halo.material.depthTest=false;halo.material.depthWrite=false;halo.material.opacity=.10;
 // Transparent render passes would draw after the characters. Avoid a halo overlay.
 halo.visible=false;
 camera.add(halo,moon);
 if(!camera.parent)scene.add(camera);
 return {depth,resize,screenCenter:Object.freeze([0,0]),mode:'CAMERA_LOCKED_BACKGROUND'};
}
