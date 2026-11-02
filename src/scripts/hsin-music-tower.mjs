/** A batched, volumetric travelling pavilion. Only the native display is HTML.
 * Uses the stage's existing loop; no new renderer, textures, lights or timers. */
export function towerViewport(width,height,panelWidth,panelHeight,side='right') {
  const compact=width<800||height<=540,margin=compact?14:38;
  return {compact,x:side==='left'?margin+panelWidth/2:width-margin-panelWidth/2,
    y:Math.max(80+panelHeight/2,Math.min(height-panelHeight/2-95,height*.52))};
}
export function createMusicTower({THREE:T,mergeGeometries,element,host}) {
  const group=new T.Group();group.name='HsinLunarMusicTower';
  const hull=new T.Group();hull.name='Travelling pavilion · dimensional architecture';group.add(hull);
  const palette={wood:0x302b2b,iron:0x364b52,brass:0xa88a50,roof:0x233c42,glass:0x83bec8,light:0xe7d49c};
  const materials={},batches={},resources=[];
  for(const [key,color] of Object.entries(palette)) {
    materials[key]=key==='light'||key==='glass'?new T.MeshBasicMaterial({color}):new T.MeshStandardMaterial({color,roughness:key==='brass'?.38:.72,metalness:key==='wood'?.1:.65});
    batches[key]=[];
  }
  materials.roof.side=T.DoubleSide;
  const add=(key,g,x=0,y=0,z=0)=>{g.translate(x,y,z);batches[key].push(g);};
  const box=(key,w,h,d,x,y,z=0)=>add(key,new T.BoxGeometry(w,h,d),x,y,z);
  const ring=(key,r,t,x,y,z=0)=>add(key,new T.TorusGeometry(r,t,5,24),x,y,z);
  const column=(key,r,h,x,y,z=0)=>add(key,new T.CylinderGeometry(r,r,h,8),x,y,z);
  // Geometry is rebuilt ONLY on facade aspect changes, never while orbiting.
  let aspect=0;
  function build(height) {
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
    box('iron',1.42,.12,.72,0,bottom-.16,-.17);
    box('wood',1.29,.065,.64,0,bottom-.065,-.17);
    box('brass',1.47,.025,.75,0,bottom-.105,-.17);
    // Curved imperial roof: swept eaves with distinct front/back fascia and visible depth.
    for(const [level,span,y,depth] of [[0,.8,top+.12,.84],[1,.53,top+.43,.63]]) {
      const vertices=[],indices=[];
      for(let i=0;i<=16;i++) {
        const x=(i/8-1)*span,curve=.17*Math.pow(Math.abs(x/span),3)-.10*Math.pow(Math.abs(x/span),1);
        vertices.push(x,y+curve,-.17+depth/2,x,y+curve,-.17-depth/2);
        if(i<16){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
      }
      const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(vertices.length/3*2),2));
      // Give the roof a visible underside rather than relying on double-sided passes.
      batches.roof.push(g);const underside=g.clone();underside.scale(1,-1,1);underside.translate(0,2*y-.022,0);batches.roof.push(underside);
      for(const z of [-.17-depth/2,-.17+depth/2])for(let i=0;i<16;i++) {
        const a=(i/8-1)*span,b=((i+1)/8-1)*span;
        const ya=y+.17*Math.abs(a/span)**3-.10*Math.abs(a/span),yb=y+.17*Math.abs(b/span)**3-.10*Math.abs(b/span);
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
      // Four antigravity nacelles: material glow, no costly dynamic point lights.
      for(const z of [.05,-.43]) {
        column('iron',.075,.16,x*.78,bottom-.28,z);
        column('glass',.049,.09,x*.78,bottom-.37,z);
        const torus=new T.TorusGeometry(.08,.012,5,16);torus.rotateX(Math.PI/2);add('brass',torus,x*.78,bottom-.36,z);
      }
    }
    // Wheel housings remain readable even when the levitation shoes are active.
    for(const x of [-.49,.49])for(const z of [.22,-.52]) {
      const wheel=new T.CylinderGeometry(.112,.112,.055,16);wheel.rotateX(Math.PI/2);add('iron',wheel,x,bottom-.25,z);
      ring('brass',.087,.012,x,bottom-.25,z+.033);column('brass',.017,.06,x,bottom-.24,z);
      for(let i=0;i<6;i++){const a=i*Math.PI/3,g=new T.BoxGeometry(.155,.009,.018);g.rotateZ(a);add('brass',g,x,bottom-.25,z+.034);}
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
      const merged=mergeGeometries(normalized);resources.push(merged);
      for(const g of new Set([...pieces,...normalized]))g.dispose();
      const mesh=new T.Mesh(merged,materials[key]);mesh.name='Pavilion · '+key;hull.add(mesh);
    }
    group.updateMatrixWorld(true);
  }
  const center=new T.Vector3(),direction=new T.Vector3(),normal=new T.Vector3(),up=new T.Vector3();
  let last=0,smoothedYaw=null,layoutDirty=true,metrics=null,provider=null,activation=0;
  const restingGlass=new T.Color(palette.glass),activeGlass=new T.Color(0xc5e7ed);
  function update(camera,target,reduced=false,idle=false) {
    if(layoutDirty){const bounds=element.closest('[data-hsin-stage]').getBoundingClientRect();metrics={w:host.clientWidth,h:host.clientHeight,pw:element.offsetWidth,ph:element.offsetHeight,sw:bounds.width,sh:bounds.height};layoutDirty=false;}
    const {w,h,pw,ph,sw,sh}=metrics;if(!w||!h||!pw||!ph)return false;
    const layout=towerViewport(sw,sh,pw,ph,element.dataset.soundtrackSide);
    element.dataset.towerAnchor=layout.compact?'bay':'world';
    const paneW=layout.compact?Math.min(110,w*.26):pw,paneH=layout.compact?paneW*.9:ph;
    const nextAspect=paneH/paneW;if(Math.abs(aspect-nextAspect)>.005){aspect=nextAspect;build(aspect);}
    camera.updateMatrixWorld();const now=performance.now(),dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
    const yaw=Math.atan2(camera.position.x-target.x,camera.position.z-target.z),side=element.dataset.soundtrackSide==='left'?-1:1;
    if(smoothedYaw===null||reduced)smoothedYaw=yaw;
    const delta=Math.atan2(Math.sin(yaw-smoothedYaw),Math.cos(yaw-smoothedYaw));smoothedYaw+=delta*(1-Math.exp(-dt*5));
    // Small lag inside a hard safe lane. No teleport on side toggle: that is an explicit move.
    let x=layout.compact?w-paneW*.85:layout.x+side*Math.max(-8,Math.min(8,Math.sin(yaw-smoothedYaw)*25));
    let y=layout.compact?h*.66:layout.y;
    const distance=camera.position.distanceTo(target)*.96,worldHeight=2*distance*Math.tan(camera.fov*Math.PI/360),scale=worldHeight*paneW/w*camera.aspect;
    camera.getWorldDirection(normal);direction.set(x/w*2-1,1-y/h*2,0).unproject(camera).sub(camera.position).normalize();
    center.copy(camera.position).addScaledVector(direction,distance/direction.dot(normal));
    up.set(0,1,0).applyQuaternion(camera.quaternion);
    const lowest=center.y-scale*(aspect/2+.43)*up.y;
    if(lowest<.08&&up.y>.2){const lift=(.08-lowest)/up.y;center.addScaledVector(up,lift);y-=lift/worldHeight*h;}
    group.position.copy(center);group.rotation.set(0,yaw,0);group.scale.setScalar(scale);
    // Visible physical depth, including rear chambers, eaves, chassis and nacelles.
    // A fixed slight yaw exposes the side architecture; the native front aperture stays clear.
    hull.rotation.y=side*-.10;
    if(!reduced&&idle)hull.position.y=Math.sin(now*.0008)*.008;else hull.position.y=0;
    if(provider!==element.dataset.provider){provider=element.dataset.provider;activation=now;}
    const activating=!reduced&&now-activation<650;
    materials.glass.color.copy(restingGlass).lerp(activeGlass,activating?Math.sin((now-activation)/650*Math.PI)*.65:0);
    group.updateMatrixWorld(true);
    if(!layout.compact){element.style.setProperty('--tower-x',`${(x-pw/2).toFixed(2)}px`);element.style.setProperty('--tower-y',`${(y-ph/2).toFixed(2)}px`);}
    return Math.abs(delta)>.002||activating;
  }
  return {group,update,invalidateLayout(){layoutDirty=true;},dispose(){group.removeFromParent();resources.forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());element.removeAttribute('data-tower-anchor');element.style.removeProperty('--tower-x');element.style.removeProperty('--tower-y');}};
}
