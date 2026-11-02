import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDirector } from '../../tests/shorekeeper-f16/director.mjs';

/** Private, local-file-only viewer. No asset URL, upload or network request. */
export function mountShorekeeperLab(root) {
  const get = s => root.querySelector(s);
  const all = s => [...root.querySelectorAll(s)];
  const host = get('[data-sk-canvas]'), status = get('[data-sk-status]'), empty = get('[data-empty]');
  const control = n => get('[data-control="' + n + '"]');
  const output = n => get('[data-value="' + n + '"]');
  const readout = n => get('[data-readout="' + n + '"]');
  const diagnostics = get('[data-sk-diagnostics]');
  let renderer, scene, camera, orbit, marker, axes, skeletonHelper;
  let model = null, director = null, originalMaterials = [], alternatives = new Map();
  let bones = [], baseQuats = new Map(), meshes = [], morphMeshes = [];
  let clipNames = [], fileSize = 0, generation = 0, userPaused = false, disposed = false;
  let selectedBone = null, center = new T.Vector3(0, .75, 0), extent = 1.6;
  let loopId = 0, lastFrame = 0, frameTotal = 0, fpsStart = 0, fps = 0, elapsed = 0;
  const state = {file:'',errors:[],webgl:false,active:false};
  const setStatus = message => { status.textContent = message; };
  const activation = enabled => {
    all('button[data-view], button[data-action], button[data-preset], button[data-control="rigreset"], input[data-control], select[data-control], input[data-morph]').forEach(el => { if (el.dataset.action !== 'report') el.disabled = !enabled; });
    const report = get('[data-action="report"]'); if(report) report.disabled = !enabled;
  };
  const applyQuality = () => {
    if (!renderer) return;
    const b = host.getBoundingClientRect(), w = Math.max(1, b.width), h = Math.max(1,b.height);
    const max = Number(control('dpr').value) || 1.5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, max, Math.sqrt(1152000 / (w*h))));
    renderer.setSize(w,h,false); camera.aspect = w/h; camera.updateProjectionMatrix();
  };
  function view(preset) {
    if (!model) return;
    const target = center.clone(), face = preset === 'face';
    if (face) target.y += extent * .27;
    const azimuth = {front:0,quarter:Math.PI/4,side:Math.PI/2,back:Math.PI,face:0,reset:0}[preset] || 0;
    const dist = extent * (face ? .82 : 1.65);
    orbit.target.copy(target);
    camera.position.set(target.x + Math.sin(azimuth)*dist, target.y + (face?0:extent*.06), target.z + Math.cos(azimuth)*dist);
    camera.near = Math.max(.01, dist/250); camera.far = Math.max(40,dist*40);
    orbit.minDistance = extent*.38; orbit.maxDistance=extent*4;
    camera.updateProjectionMatrix(); orbit.update();
  }
  function releaseModel() {
    director?.dispose(); director=null;
    if (skeletonHelper) {scene.remove(skeletonHelper);skeletonHelper.geometry.dispose();skeletonHelper.material.dispose();skeletonHelper=null;}
    if (axes) {scene.remove(axes);axes.geometry.dispose();axes.material.dispose();axes=null;}
    if (marker) {scene.remove(marker);marker.geometry.dispose();marker.material.dispose();marker=null;}
    if (!model) return;
    scene.remove(model);
    for(const obj of alternatives.values()) obj.dispose();
    alternatives.clear();
    const geometry=new Set(), material=new Set(), texture=new Set(), skeleton=new Set();
    model.traverse(o=>{if(!o.isMesh)return;geometry.add(o.geometry);if(o.skeleton)skeleton.add(o.skeleton);
      for(const m of Array.isArray(o.material)?o.material:[o.material]) {material.add(m);
        for(const v of Object.values(m)) if(v?.isTexture) texture.add(v);
      }});
    for(const row of originalMaterials) for(const m of row.original) {material.add(m); for(const v of Object.values(m)) if(v?.isTexture)texture.add(v);}
    for(const s of skeleton)s.dispose();
    for(const g of geometry)g.dispose();
    for(const m of material)m.dispose();
    for(const t of texture){t.dispose();t.image?.close?.();}
    originalMaterials=[];model=null;meshes=[];bones=[];morphMeshes=[];baseQuats.clear();selectedBone=null;clipNames=[];
  }
  function setMaterialMode() {
    if (!model) return;
    const mode=control('materials').value;
    for(const row of originalMaterials) {
      const changed=row.original.map(m=>{
        if(mode==='original')return m;
        const key=m.uuid+'-'+mode;
        if(!alternatives.has(key)){
          if(mode==='neutral') alternatives.set(key,new T.MeshStandardMaterial({color:0xaec8d8,roughness:.86,metalness:0,side:T.DoubleSide}));
          else if (/Bangs|Alpha/i.test(m.name)) {const copy=m.clone();copy.transparent=false;copy.alphaTest=.5;copy.depthWrite=true;alternatives.set(key,copy);}
          else return m;
        }
        return alternatives.get(key);
      });
      row.mesh.material=row.wasArray?changed:changed[0];
    }
    setWireframe();
  }
  function setWireframe() {
    const enabled=control('wireframe').checked;
    for(const m of originalMaterials) {
      for(const item of (Array.isArray(m.mesh.material)?m.mesh.material:[m.mesh.material])) if('wireframe' in item)item.wireframe=enabled;
    }
  }
  function updateGazeAndFace() {
    if(!model)return;
    const picked=control('morph').value, amount=Number(control('morphWeight').value);
    const blink=Number(get('[data-morph="E_Close"]').value),gx=Number(control('gazeX').value),gy=Number(control('gazeY').value);
    output('E_Close').textContent=blink.toFixed(2);output('gazeX').textContent=gx.toFixed(2);output('gazeY').textContent=gy.toFixed(2);output('morphWeight').textContent=amount.toFixed(2);
    const values={E_Close:blink,Pupil_L:Math.max(0,-gx),Pupil_R:Math.max(0,gx),Pupil_Up:Math.max(0,gy),Pupil_Down:Math.max(0,-gy)};
    if(picked)values[picked]=amount;
    for(const mesh of morphMeshes) for(const [name,index] of Object.entries(mesh.morphTargetDictionary))mesh.morphTargetInfluences[index]=values[name]||0;
  }
  function rebuildDirector() {
    director?.dispose(); director=null;
    if(!model)return;
    const [body,cloth]=clipNames;
    if(body&&cloth)try {
      director=createDirector(T,model,body,cloth,{enter:Number(control('enter').value),transfer:Number(control('transfer').value),exit:Number(control('exit').value)});
      director.setPaused(userPaused || document.hidden);
    }catch(err){state.errors.push('Diretor: '+err.message);setStatus('Modelo carregado, mas composição indisponível: '+err.message);}
  }
  function updateRig() {
    selectedBone=bones.find(x=>x.name===control('bone').value) || null;
    if(marker) marker.visible=!!selectedBone;
    showBoneData();
  }
  function showBoneData() {
    const box=get('[data-bone-data]');if(!selectedBone){box.textContent='Escolha um osso do rig.';return;}
    const b=selectedBone;
    const xyz=b.position.toArray().map(v=>v.toFixed(4));
    const q=b.quaternion.toArray().map(v=>v.toFixed(4));
    box.textContent=b.name+'\nposição: '+xyz.join(', ')+'\nquaternion: '+q.join(', ');
  }
  function showDiagnostics() {
    if(!model){diagnostics.textContent='Modelo ausente. Nenhum asset remoto será carregado.';return;}
    const morphCount=morphMeshes.reduce((n,m)=>n+Object.keys(m.morphTargetDictionary).length,0);
    const triangleCount=meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0);
    diagnostics.textContent=[
      'GLB: '+state.file,'Bytes: '+fileSize.toLocaleString('pt-BR'),
      'Skinned meshes: '+meshes.filter(x=>x.isSkinnedMesh).length,
      'Malhas: '+meshes.length,'Triângulos: '+Math.round(triangleCount),
      'Bones únicos: '+bones.length,'Morph instances: '+morphCount,
      'Clipes: '+clipNames.map(c=>c.name+' ('+c.duration.toFixed(2)+'s)').join(' + '),
      'WebGL2: '+(state.webgl?'sim':'não'),
      'FPS observado: '+(fps||'pendente'),'Draw calls: '+(renderer?.info.render.calls||0),
      'Uploads: nenhum (File API local)','GPU VRAM: não medida'
    ].join('\n');
    readout('meshes').textContent='Meshes: '+meshes.length;
    readout('bones').textContent='Bones: '+bones.length;
  }
  async function loadFile(file) {
    if (!file) return;
    if(!file.name.toLowerCase().endsWith('.glb') || file.size>130_000_000){setStatus('Selecione um arquivo .glb local de até 130 MB.');return;}
    const token=++generation;releaseModel();activation(false);empty.hidden=false;
    state.errors=[];state.active=false;get('[data-sk-file-name]').textContent=file.name;
    setStatus('Lendo GLB local: '+file.name+'…');
    try {
      const buffer=await file.arrayBuffer();
      if(token!==generation||disposed)return;
      const gltf=await new GLTFLoader().parseAsync(buffer,'');
      if(token!==generation||disposed){ // Discard stale parsed assets without mounting them.
        model=gltf.scene;releaseModel();return;
      }
      model=gltf.scene;fileSize=file.size;state.file=file.name;scene.add(model);model.updateMatrixWorld(true);
      model.traverse(o=>{if(o.isMesh){meshes.push(o);originalMaterials.push({mesh:o,original:Array.isArray(o.material)?o.material:[o.material],wasArray:Array.isArray(o.material)});if(o.morphTargetDictionary)morphMeshes.push(o);}
        if(o.isBone)bones.push(o);});
      bones=[...new Set(bones)];for(const b of bones)baseQuats.set(b,b.quaternion.clone());
      clipNames=[gltf.animations.find(c=>c.name==='Stand1_Action01_window'),gltf.animations.find(c=>c.name==='Rib_Stand1_ClothLayer')];
      const box=new T.Box3().setFromObject(model);center=box.getCenter(new T.Vector3());extent=Math.max(1,...box.getSize(new T.Vector3()).toArray());
      skeletonHelper=new T.SkeletonHelper(model);skeletonHelper.visible=false;scene.add(skeletonHelper);
      axes=new T.AxesHelper(Math.max(.3,extent*.35));axes.visible=false;scene.add(axes);
      marker=new T.Mesh(new T.SphereGeometry(Math.max(.006,extent*.007),12,8),new T.MeshBasicMaterial({color:0xffd080,depthTest:false}));marker.visible=false;scene.add(marker);
      const boneSel=control('bone');boneSel.replaceChildren(new Option('Selecione um osso',''));
      for(const b of bones)boneSel.add(new Option(b.name,b.name));
      const morphNames=[...new Set(morphMeshes.flatMap(m=>Object.keys(m.morphTargetDictionary)))].sort();
      const morphSel=control('morph');morphSel.replaceChildren(new Option('Sem morph adicional',''));
      for(const name of morphNames)morphSel.add(new Option(name,name));
      control('materials').value='original';control('wireframe').checked=false;control('skeleton').checked=false;
      control('axes').checked=false;control('culling').checked=true;get('[data-morph="E_Close"]').value='0';
      control('gazeX').value='0';control('gazeY').value='0';control('morphWeight').value='0';userPaused=false;
      get('[data-action="pause"]').textContent='Pausar';activation(true);applyQuality();view('front');updateGazeAndFace();rebuildDirector();
      empty.hidden=true;state.active=true;setStatus('GLB carregado localmente. Inspecione olhos, rig e gesto; nenhuma aprovação visual é automática.');showDiagnostics();
    }catch(err){if(token!==generation)return;releaseModel();activation(false);state.errors.push(String(err));setStatus('Falha ao abrir GLB: '+(err?.message||err));console.error(err);}
  }
  // The test bench must stay useful without WebGL2: controls remain visible, with an explicit error.
  try {
    const canvas=document.createElement('canvas'); const context=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'low-power'});
    if(!context)throw Error('WebGL2 indisponível neste navegador.');
    renderer=new T.WebGLRenderer({canvas,context,antialias:true,powerPreference:'low-power'});
    renderer.setClearColor(0x111e31);renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
    scene=new T.Scene();scene.background=new T.Color(0x111e31);
    const ambient=new T.HemisphereLight(0xdde9ff,0x364355,1.15),key=new T.DirectionalLight(0xffefd9,1.4),rim=new T.DirectionalLight(0xb3dfff,.65);
    key.position.set(2,4,4);rim.position.set(-3,2,-2);scene.add(ambient,key,rim);scene.userData.lights={ambient,key,rim};
    camera=new T.PerspectiveCamera(34,1,.01,60);
    orbit=new OrbitControls(camera,canvas);orbit.enablePan=false;orbit.enableDamping=true;orbit.dampingFactor=.085;orbit.rotateSpeed=.55;
    host.appendChild(canvas);state.webgl=true;
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();setStatus('Contexto WebGL perdido; aguarde restauração ou recarregue a página.');});
    canvas.addEventListener('webglcontextrestored',()=>{setStatus('WebGL restaurado; confira o modelo e as texturas.');applyQuality();});
    const ro=new ResizeObserver(applyQuality);ro.observe(host);
    root._skResizeObserver=ro;applyQuality();
  }catch(err){state.errors.push(String(err));setStatus(err.message+' O menu permanece disponível, mas não há renderização.');get('[data-sk-file]').disabled=true;diagnostics.textContent=err.message;return;}
  activation(false);
  all('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
    for(const el of all('[data-tab]'))el.setAttribute('aria-selected',String(el===button));
    for(const pane of all('[data-pane]'))pane.hidden=pane.dataset.pane!==button.dataset.tab;
  }));
  get('[data-sk-file]').addEventListener('change',e=>loadFile(e.target.files?.[0]));
  all('[data-view]').forEach(b=>b.addEventListener('click',()=>view(b.dataset.view)));
  control('bone').addEventListener('change',updateRig);
  control('skeleton').addEventListener('change',()=>{if(skeletonHelper)skeletonHelper.visible=control('skeleton').checked;});
  control('axes').addEventListener('change',()=>{if(axes)axes.visible=control('axes').checked;});
  control('wireframe').addEventListener('change',setWireframe);
  control('culling').addEventListener('change',()=>{for(const m of meshes)m.frustumCulled=control('culling').checked;});
  control('rigreset').addEventListener('click',()=>{director?.interrupt();for(const [b,q] of baseQuats)b.quaternion.copy(q);showBoneData();});
  control('materials').addEventListener('change',setMaterialMode);
  control('background').addEventListener('change',()=>{scene.background=new T.Color(({night:0x111e31,gray:0x707b86,black:0x000000})[control('background').value]);});
  control('light').addEventListener('input',()=>{const {ambient,key,rim}=scene.userData.lights;const k=Number(control('light').value);ambient.intensity=.85*k;key.intensity=k;rim.intensity=.46*k;});
  control('dpr').addEventListener('change',applyQuality);
  for(const el of [...all('[data-morph]'),control('gazeX'),control('gazeY'),control('morph'),control('morphWeight')])el.addEventListener('input',updateGazeAndFace);
  all('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
    const preset=button.dataset.preset;
    get('[data-morph="E_Close"]').value=preset==='blink'?'1':'0';
    control('gazeX').value='0';control('gazeY').value='0';
    control('morph').value=preset==='smile'? (control('morph').querySelector('option[value="M_Smile_L"]')?'M_Smile_L':'') : '';
    control('morphWeight').value=preset==='smile'?'0.5':'0';
    updateGazeAndFace();
  }));
  get('[data-action="play"]').addEventListener('click',()=>{director?.start();userPaused=false;director?.setPaused(document.hidden);get('[data-action="pause"]').textContent='Pausar';});
  get('[data-action="interrupt"]').addEventListener('click',()=>director?.interrupt());
  get('[data-action="pause"]').addEventListener('click',()=>{userPaused=!userPaused;director?.setPaused(userPaused||document.hidden);get('[data-action="pause"]').textContent=userPaused?'Retomar':'Pausar';});
  for(const k of ['enter','transfer','exit'])control(k).addEventListener('input',()=>{
    output(k).textContent=Number(control(k).value).toFixed(1);rebuildDirector();
  });
  document.addEventListener('visibilitychange',()=>director?.setPaused(userPaused||document.hidden));
  get('[data-action="report"]').addEventListener('click',async()=>{
    const data={route:'/experimentos/sk/',file:state.file,fileBytes:fileSize,webgl2:state.webgl,meshes:meshes.length,bones:bones.length,
      morphInstances:morphMeshes.reduce((n,m)=>n+Object.keys(m.morphTargetDictionary).length,0),
      fpsObserved:fps,drawCalls:renderer.info.render.calls,materialMode:control('materials').value,
      rig:{skeleton:control('skeleton').checked,wireframe:control('wireframe').checked,culling:control('culling').checked},
      director:director?.state||null,errors:state.errors,visualQa:'PENDING: requires human inspection',gpuVram:'NOT_MEASURED'};
    try{await navigator.clipboard.writeText(JSON.stringify(data,null,2));setStatus('Relatório de diagnóstico copiado. Não inclui bytes do GLB.');}
    catch{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='shorekeeper-local-diagnostics.json';a.click();URL.revokeObjectURL(url);setStatus('Relatório salvo localmente.');}
  });
  function frame(now) {
    if(disposed)return;
    loopId=requestAnimationFrame(frame);
    if(document.hidden)return;
    if(!lastFrame){lastFrame=now;fpsStart=now;return;}
    const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));
    if(now-lastFrame<1000/30-1)return;
    lastFrame=now;elapsed+=dt;
    director?.advance(dt);orbit.update();
    if(marker?.visible&&selectedBone)selectedBone.getWorldPosition(marker.position);
    if(skeletonHelper?.visible)skeletonHelper.updateMatrixWorld(true);
    renderer.render(scene,camera);
    frameTotal++;
    if(now-fpsStart>1200){
      fps=Math.round(frameTotal*1000/(now-fpsStart));fpsStart=now;frameTotal=0;
      readout('fps').textContent='FPS: '+fps;showDiagnostics();
      if(selectedBone)showBoneData();
      if(director)get('[data-acting-state]').textContent=JSON.stringify(director.state,null,2);
    }
  }
  loopId=requestAnimationFrame(frame);
  const destroy=()=>{if(disposed)return;disposed=true;generation++;cancelAnimationFrame(loopId);root._skResizeObserver?.disconnect();releaseModel();orbit?.dispose();renderer?.dispose();renderer?.forceContextLoss();};
  window.addEventListener('pagehide',destroy,{once:true});
}
