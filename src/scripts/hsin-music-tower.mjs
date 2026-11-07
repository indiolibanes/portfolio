import {createPavilionMotion} from './hsin-pavilion-layout.mjs';
/** A batched, volumetric travelling pavilion. Only the native display is HTML.
 * Uses the stage's existing loop; no new renderer, textures, lights or timers. */
export function towerViewport(width,height,panelWidth,panelHeight,side='right') {
  const compact=width<800||height<=540,margin=compact?14:38;
  return {compact,x:side==='left'?margin+panelWidth/2:width-margin-panelWidth/2,
    y:Math.max(80+panelHeight/2,Math.min(height-panelHeight/2-95,height*.52))};
}
export function createMusicTower({THREE:T,mergeGeometries,element,host,bones=[],model=null,bounds=null,moon=null,duetMode=false,metrics:instrument=null,clock=()=>performance.now()}) {
  const group=new T.Group();group.name='HsinLunarMusicTower';
  const hull=new T.Group();hull.name='Travelling pavilion · dimensional architecture';group.add(hull);
  const palette={wood:0x302b2b,iron:0x364b52,brass:0xa88a50,roof:0x233c42,glass:0x93c8bd,hydrogenL:0x8de2ee,hydrogenR:0x8de2ee};
  const materials={},batches={},resources=[];
  for(const [key,color] of Object.entries(palette)) {
    materials[key]=key.startsWith('hydrogen')||key==='glass'?new T.MeshBasicMaterial({color}):new T.MeshStandardMaterial({color,roughness:key==='brass'?.38:.72,metalness:key==='wood'?.1:.65});
    batches[key]=[];
  }
  materials.roof.side=T.DoubleSide;
  const add=(key,g,x=0,y=0,z=0)=>{g.translate(x,y,z);batches[key].push(g);};
  const box=(key,w,h,d,x,y,z=0)=>add(key,new T.BoxGeometry(w,h,d),x,y,z);
  const ring=(key,r,t,x,y,z=0)=>add(key,new T.TorusGeometry(r,t,5,24),x,y,z);
  const column=(key,r,h,x,y,z=0)=>add(key,new T.CylinderGeometry(r,r,h,8),x,y,z);
  // Geometry is rebuilt ONLY on facade aspect changes, never while orbiting.
  let aspect=0,decorationScale=1;
  function build(height,ornamentScale=1) {
    for(const child of [...hull.children])hull.remove(child);
    resources.splice(0).forEach(g=>g.dispose());for(const key in batches)batches[key]=[];
    const top=height/2,bottom=-height/2;
    // Open-front timber hall, thick side walls, ribbed back and stepped stone/steel chassis.
    box('wood',1.08,height,.065,0,0,-.36);
    for(const x of [-.55,.55]) {
      box('wood',.095,height+.1,.4,x,0,-.17);
      box('brass',.024,height+.04,.045,x,0,.055);
      for(const y of [bottom,top])box('brass',.12,.055,.44,x,y,-.15);
    }
    for(const y of [bottom-.05,top+.035])box('brass',1.22,.055,.46,0,y,-.15);
    // Interlocking bracket sets and celadon lattice live OUTSIDE the native display aperture.
    for(const side of [-1,1]){
      for(const level of [0,1,2]){
        box('wood',.15+level*.035,.026,.34,side*.56,top+.025+level*.035,-.17);
        box('brass',.026,.025,.39,side*(.54+level*.02),top+.04+level*.035,-.17);
      }
      for(let row=0;row<4;row++){
        const y=bottom+.13+(height-.26)*row/3;
        for(const sign of [-1,1]){const slat=new T.BoxGeometry(.012,.12,.014);slat.rotateZ(sign*.63);add('brass',slat,side*.62,y,-.02);}
      }
      add('glass',new T.OctahedronGeometry(.032),side*.62,top-.07,.025);
    }
    box('iron',1.42,.12,.72,0,bottom-.16,-.17);
    box('wood',1.29,.065,.64,0,bottom-.065,-.17);
    box('brass',1.47,.025,.75,0,bottom-.105,-.17);
    // Curved imperial roof: swept eaves with distinct front/back fascia and visible depth.
    for(const [level,span,y,depth] of [[0,.8,top+.12,.84],[1,.53,top+.43,.63]]) {
      const vertices=[],indices=[];
      for(let i=0;i<=16;i++) {
        const x=(i/8-1)*span,u=Math.abs(x/span),curve=.14*(1-u)+.16*u**5-.05;
        vertices.push(x,y+curve,-.17+depth/2,x,y+curve,-.17-depth/2);
        if(i<16){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(vertices.length/3*2),2));
      // Give the roof a visible underside rather than relying on double-sided passes.
      batches.roof.push(g);const underside=g.clone();underside.scale(1,-1,1);underside.translate(0,2*y-.022,0);batches.roof.push(underside);
      for(const z of [-.17-depth/2,-.17+depth/2])for(let i=0;i<16;i++) {
        const a=(i/8-1)*span,b=((i+1)/8-1)*span;
        const roofCurve=u=>.14*(1-Math.abs(u))+.16*Math.abs(u)**5-.05;
        const ya=y+roofCurve(a/span),yb=y+roofCurve(b/span);
        const rail=new T.BoxGeometry(Math.hypot(b-a,yb-ya)+.005,.018,.023);rail.rotateZ(Math.atan2(yb-ya,b-a));add('brass',rail,(a+b)/2,(ya+yb)/2,z);
      }
      if(level===1)box('wood',.60,.27,.38,0,top+.25,-.17);
    }
    // Two substantial observatory side chambers, conduits and cold glass lanterns.
    for(const x of [-.72,.72]) {
      column('iron',.11,height*.60,x,-.04,-.21);
      for(const y of [-height*.28,height*.28])column('brass',.125,.035,x,y,-.21);
      box('glass',.095,.17,.10,x,top-.2,.015);
      for(const dx of [-.06,.06])box('brass',.012,.21,.13,x+dx,top-.2,.015);
      box('brass',.15,.025,.16,x,top-.31,.015);
      const pipe=new T.TorusGeometry(.10,.018,6,12,Math.PI);pipe.rotateY(Math.PI/2);add('brass',pipe,x,bottom+.19,-.19);
      column('brass',.018,height*.55,x,height*.02,-.37);
    }
    // Four hydrogen confinement chambers, separate from the facade and batched by side.
    for(const x of [-.68,.68])for(const z of [.11,-.48]) {
      const side=x<0?'hydrogenL':'hydrogenR';
      box('iron',.13,.10,.16,x,bottom-.15,z);
      box('brass',.20,.025,.22,x,bottom-.21,z);
      add('iron',new T.CylinderGeometry(.075,.105,.17,10),x,bottom-.30,z);
      column('brass',.108,.025,x,bottom-.38,z);
      column(side,.061,.085,x,bottom-.40,z);
      const confinement=new T.TorusGeometry(.083,.009,5,16);confinement.rotateX(Math.PI/2);add(side,confinement,x,bottom-.42,z);
      column('iron',.025,.13,x,bottom-.25,z);
      // Stabilizer fins and insulated fuel feeds: no exhaust particles or point lights.
      for(const dx of [-.095,.095])box('iron',.014,.12,.18,x+dx,bottom-.27,z);
      column('brass',.012,.20,x*.83,bottom-.20,z);
    }
    // Crown observatory / static armillary. Idle motion belongs only to the small ring.
    column('brass',.025,.18,0,top+.54,-.17);
    ring('brass',.13,.009,0,top+.70,-.17);
    const orbit=new T.TorusGeometry(.15,.007,5,28);orbit.rotateX(1.1);add('brass',orbit,0,top+.70,-.17);
    add('glass',new T.OctahedronGeometry(.055),0,top+.70,-.17);
    for(const key in batches) {
      const pieces=batches[key];if(!pieces.length)continue;
      // All primitive normals/UVs are present; indexed/non-indexed shapes are normalized.
      const normalized=pieces.map(g=>g.index?g.toNonIndexed():g);
      if(ornamentScale!==1)for(const g of normalized){const p=g.attributes.position;for(let i=0;i<p.count;i++){const y=p.getY(i);if(y>top)p.setY(i,top+(y-top)*ornamentScale);else if(y<bottom)p.setY(i,bottom+(y-bottom)*ornamentScale);}g.computeVertexNormals();}
      const merged=mergeGeometries(normalized);resources.push(merged);
      for(const g of new Set([...pieces,...normalized]))g.dispose();
      const mesh=new T.Mesh(merged,materials[key]);mesh.name='Pavilion · '+key;hull.add(mesh);
    }
    group.updateMatrixWorld(true);
  }
  const center=new T.Vector3(),direction=new T.Vector3(),normal=new T.Vector3(),up=new T.Vector3(),projection=new T.Vector3();
  const motion=createPavilionMotion(),by=new Map(bones.map(b=>[b.name,b]));
  const subjects={face:null,hands:[],moon:null,character:null,controls:null};
  const characterRect={x:0,y:0,w:0,h:0};
  const rects=[{},{},{},{}];let layoutAt=-Infinity,cameraSignature='',hovering=false,focused=false,disposed=false;
  const interaction=new AbortController();
  element.addEventListener('pointerenter',()=>{hovering=true;},{signal:interaction.signal});
  element.addEventListener('pointerleave',()=>{hovering=false;layoutDirty=true;},{signal:interaction.signal});
  element.addEventListener('focusin',()=>{focused=true;},{signal:interaction.signal});
  element.addEventListener('focusout',event=>{focused=!!event.relatedTarget&&element.contains(event.relatedTarget);layoutDirty=true;},{signal:interaction.signal});
  function projectSubject(object,radius,w,h,out){
    if(!object)return null;object.updateWorldMatrix(true,false);object.getWorldPosition(projection);const distance=projection.distanceTo(cameraForProjection.position);projection.project(cameraForProjection);
    if(projection.z>1||projection.z< -1)return null;
    const pixels=radius/distance*h/(2*Math.tan(cameraForProjection.fov*Math.PI/360));
    out.x=(projection.x+1)*w/2-pixels;out.y=(1-projection.y)*h/2-pixels;out.w=out.h=pixels*2;return out;
  }
  let cameraForProjection;
  let last=0,smoothedYaw=null,layoutDirty=true,metrics=null,provider=null,activation=0;
  const restingGlass=new T.Color(palette.glass),activeGlass=new T.Color(0xc5e7ed);
  function update(camera,target,reduced=false,idle=false) {
    if(disposed)return false;const started=instrument?.enabled?instrument.now():0,interacting=hovering||focused;
    if(layoutDirty){const bounds=element.closest('[data-hsin-stage]').getBoundingClientRect();metrics={w:host.clientWidth,h:host.clientHeight,pw:element.offsetWidth,ph:element.offsetHeight,sw:bounds.width,sh:bounds.height};layoutDirty=false;}
    const {w,h,pw,ph,sw,sh}=metrics;if(!w||!h||!pw||!ph)return false;
    if(duetMode){
      // Fixed overhead bay for a two-performer stage. The native HTML player remains
      // in the right sidebar; this is its small 3D architectural companion above the silhouettes.
      // No 2nd renderer, light, timer, iframe or independent motion director.
      const paneW=Math.max(90,Math.min(155,w*.23)),paneH=paneW*.9;
      const nextAspect=paneH/paneW,nextDecoration=.72;
      if(Math.abs(aspect-nextAspect)>.005||Math.abs(decorationScale-nextDecoration)>.01){
        aspect=nextAspect;decorationScale=nextDecoration;build(aspect,decorationScale);
      }
      const x=Math.min(w-paneW*.56,Math.max(paneW*.58,w*.78));
      const y=Math.max(paneH*.62,Math.min(h*.18,112));
      camera.updateMatrixWorld();
      const distance=camera.position.distanceTo(target)*.92;
      const worldHeight=2*distance*Math.tan(camera.fov*Math.PI/360);
      let scale=worldHeight*paneW/w*camera.aspect;
      camera.getWorldDirection(normal);
      direction.set(x/w*2-1,1-y/h*2,0).unproject(camera).sub(camera.position).normalize();
      const proj=Math.max(.15,direction.dot(normal));
      center.copy(camera.position).addScaledVector(direction,distance/proj);
      group.position.copy(center);group.rotation.set(0,Math.atan2(camera.position.x-target.x,camera.position.z-target.z),0);
      group.scale.setScalar(scale);
      hull.position.y=reduced||!idle?0:Math.sin(clock()*.0008)*.006;
      hull.rotation.set(0,-.11,0);
      group.updateMatrixWorld(true);
      element.dataset.towerAnchor='duet-overhead';
      return !reduced&&idle; // animate only the tiny existing hover bob; no independent timers or forced frames while paused.
    }
    const layout=towerViewport(sw,sh,pw,ph,element.dataset.soundtrackSide);
    element.dataset.towerAnchor=layout.compact?'bay':'world';
    const paneW=layout.compact?Math.min(110,w*.26):pw,paneH=layout.compact?paneW*.9:ph;
    const nextAspect=paneH/paneW,nextDecoration=layout.compact?1:Math.max(.35,Math.min(1,(h-ph-60)/(paneW*1.35)));
    if(Math.abs(aspect-nextAspect)>.005||Math.abs(decorationScale-nextDecoration)>.01){aspect=nextAspect;decorationScale=nextDecoration;build(aspect,decorationScale);}
    camera.updateMatrixWorld();const now=clock(),dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
    const yaw=Math.atan2(camera.position.x-target.x,camera.position.z-target.z),side=element.dataset.soundtrackSide==='left'?-1:1;
    if(smoothedYaw===null||reduced)smoothedYaw=yaw;
    const delta=Math.atan2(Math.sin(yaw-smoothedYaw),Math.cos(yaw-smoothedYaw));smoothedYaw+=delta*(1-Math.exp(-dt*5));
    // Small lag inside a hard safe lane. No teleport on side toggle: that is an explicit move.
    let x=layout.compact?w-paneW*.85:layout.x,y=layout.compact?h*.66:layout.y;
    const signature=camera.position.x+camera.position.y*13+camera.position.z*31+camera.quaternion.y*71+pw*3+ph;
    if(!layout.compact&&(signature!==cameraSignature||now-layoutAt>250)){
      cameraSignature=signature;layoutAt=now;cameraForProjection=camera;
      subjects.face=projectSubject(by.get('ORG-Bip001Head'),.15,w,h,rects[0]);
      subjects.hands.length=0;for(const [i,s]of ['L','R'].entries()){const rect=projectSubject(by.get('ORG-Bip001Hand'+s),.11,w,h,rects[i+1]);if(rect)subjects.hands.push(rect);}
      subjects.moon=projectSubject(moon,1.37,w,h,rects[3]);
      if(model&&bounds){
        let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
        for(let i=0;i<8;i++){projection.set(bounds[i&1?'max':'min'][0],bounds[i&2?'max':'min'][1],bounds[i&4?'max':'min'][2]);model.localToWorld(projection);projection.project(camera);const px=(projection.x+1)*w/2,py=(1-projection.y)*h/2;minX=Math.min(minX,px);minY=Math.min(minY,py);maxX=Math.max(maxX,px);maxY=Math.max(maxY,py);}
        Object.assign(characterRect,{x:minX-16,y:minY-16,w:maxX-minX+32,h:maxY-minY+32});subjects.character=characterRect;
      }
      subjects.controls={x:sw/2-100,y:sh-86,w:200,h:74};
      motion.retarget({width:sw,height:sh,panelWidth:pw,panelHeight:ph,paddingX:pw*.36,paddingTop:pw*.88*decorationScale,paddingBottom:pw*.47*decorationScale,preferred:element.dataset.soundtrackSide,...subjects},{now:now/1000,interacting,reduced});
    }
    motion.setInteracting(interacting);const movement=motion.advance(dt,reduced);
    if(!layout.compact){x=movement.x;y=movement.y;element.dataset.adaptiveSide=movement.side;element.dataset.layoutConstrained=String(movement.constrained);}
    const distance=camera.position.distanceTo(target)*.96,worldHeight=2*distance*Math.tan(camera.fov*Math.PI/360);let scale=worldHeight*paneW/w*camera.aspect;
    camera.getWorldDirection(normal);direction.set(x/w*2-1,1-y/h*2,0).unproject(camera).sub(camera.position).normalize();
    center.copy(camera.position).addScaledVector(direction,distance/direction.dot(normal));
    up.set(0,1,0).applyQuaternion(camera.quaternion);
    const lowest=center.y-scale*(aspect/2+.47*decorationScale)*up.y;
    if(lowest<.08&&camera.position.y>.08){const depthScale=(camera.position.y-.08)/(camera.position.y-lowest);center.sub(camera.position).multiplyScalar(depthScale).add(camera.position);scale*=depthScale;}
    group.position.copy(center);group.rotation.set(0,yaw,0);group.scale.setScalar(scale);
    // Visible physical depth, including rear chambers, eaves, chassis and nacelles.
    // A fixed slight yaw exposes the side architecture; the native front aperture stays clear.
    hull.rotation.y=(movement.side==='left'?-1:1)*-.10;hull.rotation.z=movement.tilt;
    if(!reduced&&idle)hull.position.y=Math.sin(now*.0008)*.008;else hull.position.y=0;
    if(provider!==element.dataset.provider){provider=element.dataset.provider;activation=now;}
    const activating=!reduced&&now-activation<650;
    materials.glass.color.copy(restingGlass).lerp(activeGlass,activating?Math.sin((now-activation)/650*Math.PI)*.65:0);
    const thrust=Math.min(1,(Math.abs(movement.vx)+Math.abs(movement.vy))/240);
    materials.hydrogenL.color.setRGB(.22+thrust*.35,.55+thrust*.25,.65+thrust*.3);
    materials.hydrogenR.color.copy(materials.hydrogenL.color);
    if(movement.vx>1)materials.hydrogenL.color.multiplyScalar(1.2);else if(movement.vx< -1)materials.hydrogenR.color.multiplyScalar(1.2);
    group.updateMatrixWorld(true);
    if(!layout.compact){element.style.setProperty('--tower-x',`${(x-pw/2).toFixed(2)}px`);element.style.setProperty('--tower-y',`${(y-ph/2).toFixed(2)}px`);}
    if(instrument?.enabled)instrument.sample('pavilionUpdate',instrument.now()-started);
    return Math.abs(delta)>.002||activating||movement.moving;
  }
  return {group,update,invalidateLayout(){layoutDirty=true;layoutAt=-Infinity;},dispose(){if(disposed)return;disposed=true;interaction.abort();group.removeFromParent();resources.forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());element.removeAttribute('data-tower-anchor');element.style.removeProperty('--tower-x');element.style.removeProperty('--tower-y');}};
}
