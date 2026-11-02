/** Real scenery framing an HTML native-player facade. No second renderer or rAF. */
export function towerViewport(width, height, panelWidth, panelHeight, side = 'right') {
  const compact = width < 800 || height <= 540;
  const margin = 18;
  return {compact, x:side === 'left' ? margin + panelWidth/2 : width-margin-panelWidth/2,
    y:Math.max(margin+panelHeight/2, Math.min(height-panelHeight/2-74, height*.54))};
}

export function createMusicTower({THREE:T, mergeGeometries, element, host}) {
  const group = new T.Group(); group.name = 'HsinLunarMusicTower';
  const bronze = new T.MeshBasicMaterial({color:0xb49a68});
  const iron = new T.MeshBasicMaterial({color:0x263b43});
  const lamp = new T.MeshBasicMaterial({color:0xf0d69a});
  const frame = new T.Group(); group.add(frame);
  const geometry = [];
  const box = (w,h,d,x,y,z=0) => {const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);return g;};
  const brass = [box(1.08,.014,.035,0,.5),box(1.08,.014,.035,0,-.5),box(.014,1,.035,-.54,0),box(.014,1,.035,.54,0)];
  // Four riveted corner blocks, top observatory arc and two fine mechanical arms.
  for(const x of [-.54,.54]) for(const y of [-.5,.5]) brass.push(box(.04,.04,.05,x,y));
  const arc=new T.TorusGeometry(.19,.008,4,24,Math.PI);arc.translate(0,.52,0);brass.push(arc);
  const dark=[box(.042,1.04,.08,-.57,0,-.04),box(.042,1.04,.08,.57,0,-.04),box(1.18,.035,.08,0,-.54,-.04)];
  const glow=[box(.08,.012,.04,0,.72),box(.012,.08,.04,0,.72)];
  for(const [pieces,material] of [[brass,bronze],[dark,iron],[glow,lamp]]) {
    const merged=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());geometry.push(merged);
    frame.add(new T.Mesh(merged,material));
  }
  const postGeometry=new T.CylinderGeometry(.014,.02,1,6);
  const posts=new T.InstancedMesh(postGeometry,bronze,2);group.add(posts);geometry.push(postGeometry);
  const baseGeometry=new T.CylinderGeometry(.3,.36,.075,10);
  const base=new T.Mesh(baseGeometry,iron);group.add(base);geometry.push(baseGeometry);
  group.traverse(o=>{o.frustumCulled=false;});
  // Scene matrices are otherwise frozen. This object owns only its own updates.
  const center=new T.Vector3(),direction=new T.Vector3(),normal=new T.Vector3(),point=new T.Vector3(),up=new T.Vector3();
  const dummy=new T.Object3D();let lastTime=0,smoothedYaw=null,lastX=null,lastY=null,layoutDirty=true,metrics=null;
  function update(camera,target,reduced=false) {
    if(layoutDirty){
      const stage=element.closest('[data-hsin-stage]'),bounds=stage.getBoundingClientRect();
      metrics={w:host.clientWidth,h:host.clientHeight,pw:element.offsetWidth,ph:element.offsetHeight,sw:bounds.width,sh:bounds.height};layoutDirty=false;
    }
    const {w,h,pw,ph,sw,sh}=metrics;
    if(!w||!h||!pw||!ph)return false;
    const layout=towerViewport(sw,sh,pw,ph,element.dataset.soundtrackSide);
    if(layout.compact){group.visible=false;if(element.dataset.towerAnchor!=='bay')element.dataset.towerAnchor='bay';return false;}
    group.visible=true;if(element.dataset.towerAnchor!=='world')element.dataset.towerAnchor='world';
    camera.updateMatrixWorld();
    const now=performance.now(),dt=Math.min(.05,Math.max(0,(now-lastTime)/1000));lastTime=now;
    const yaw=Math.atan2(camera.position.x-target.x,camera.position.z-target.z);
    if(smoothedYaw===null||reduced)smoothedYaw=yaw;
    const delta=Math.atan2(Math.sin(yaw-smoothedYaw),Math.cos(yaw-smoothedYaw));
    smoothedYaw+=delta*(1-Math.exp(-dt*9));
    const side=element.dataset.soundtrackSide==='left'?-1:1;
    // A small world-relative lag follows the orbit; the safe peripheral lane is hard-bounded.
    const lag=Math.sin(yaw-smoothedYaw)*28;
    const x=layout.x+side*Math.max(-10,Math.min(10,lag));
    let y=layout.y;
    const distance=camera.position.distanceTo(target)*.96;
    camera.getWorldDirection(normal);
    direction.set(x/w*2-1,1-y/h*2,0).unproject(camera).sub(camera.position).normalize();
    center.copy(camera.position).addScaledVector(direction,distance/direction.dot(normal));
    const worldHeight=2*distance*Math.tan(camera.fov*Math.PI/360);
    const bw=worldHeight*camera.aspect*pw/w,bh=worldHeight*ph/h;
    // Keep the lower brass rail above the terrace even at the far zoom limit.
    // Moving along camera-up keeps facade depth and pixel scale unchanged.
    up.set(0,1,0).applyQuaternion(camera.quaternion);
    point.copy(center).addScaledVector(up,-bh*.54);
    if(point.y<.14&&up.y>.2){const lift=(.14-point.y)/up.y;center.addScaledVector(up,lift);y-=lift/worldHeight*h;}
    if(Math.abs((lastX??Infinity)-x)>.1||Math.abs((lastY??Infinity)-y)>.1){
      element.style.setProperty('--tower-x',`${(x-pw/2).toFixed(2)}px`);
      element.style.setProperty('--tower-y',`${(y-ph/2).toFixed(2)}px`);lastX=x;lastY=y;
    }
    frame.position.copy(center);frame.quaternion.copy(camera.quaternion);frame.scale.set(bw,bh,Math.min(bw,bh));
    for(let i=0;i<2;i++){
      point.set((i?1:-1)*bw*.43,-bh*.51,-.04).applyQuaternion(camera.quaternion).add(center);
      const postHeight=Math.max(.06,point.y);
      dummy.position.set(point.x,postHeight/2,point.z);dummy.rotation.set(0,0,0);dummy.scale.set(1,postHeight,1);dummy.updateMatrix();posts.setMatrixAt(i,dummy.matrix);
    }
    posts.instanceMatrix.needsUpdate=true;
    base.position.set(center.x,.038,center.z);base.scale.set(Math.max(.5,bw),1,Math.max(.5,bw));
    group.updateMatrixWorld(true);
    return Math.abs(delta)>.002;
  }
  return {group,update,invalidateLayout(){layoutDirty=true;},dispose(){group.removeFromParent();geometry.forEach(g=>g.dispose());bronze.dispose();iron.dispose();lamp.dispose();element.removeAttribute('data-tower-anchor');element.style.removeProperty('--tower-x');element.style.removeProperty('--tower-y');}};
}
