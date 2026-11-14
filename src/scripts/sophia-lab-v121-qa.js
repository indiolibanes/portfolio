import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function mountSophiaLabV121() {
  const host = document.querySelector('[data-sophia-lab-v121]');
  if (!host) return;
  const $ = name => document.getElementById(name);
  const buttons = ['front','three','back','face','resetCamera','pause','neutral','capture'];
  let scene, renderer, camera, orbit, model, mixer, action, clock, observer;
  let clips = [], meshes = [], props = [], morphControls = new Map();
  let boxCenter = new THREE.Vector3(), headCenter = new THREE.Vector3(), radius = 1, focus = 'body';
  let isPaused = false, visible = true, selection = 0;
  const message = s => {$('status').textContent = s;};
  const setControls = enabled => {for(const id of buttons)$(id).disabled=!enabled; $('clip').disabled=!enabled; $('props').disabled=!enabled;};
  function initScene() {
    if(renderer) return;
    const el = $('stage');
    try {
      scene = new THREE.Scene(); scene.background = new THREE.Color('#eeeef3');
      camera = new THREE.PerspectiveCamera(37,el.clientWidth/el.clientHeight,0.001,1000);
      renderer = new THREE.WebGLRenderer({antialias:true,powerPreference:'default',preserveDrawingBuffer:true});
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.AgXToneMapping;
      renderer.toneMappingExposure=1;
      renderer.setPixelRatio(Math.min(1.4,window.devicePixelRatio||1));
      renderer.setSize(el.clientWidth,el.clientHeight);
      el.querySelector('.empty')?.remove();
      el.appendChild(renderer.domElement);
      orbit = new OrbitControls(camera,renderer.domElement);
      orbit.enableDamping=true;
      scene.add(new THREE.HemisphereLight(0xffffff,0xc6c9df,2.15));
      const k = new THREE.DirectionalLight(0xffffff,2.5);k.position.set(3,5,6);scene.add(k);
      const f = new THREE.DirectionalLight(0xdde6ff,1.1);f.position.set(-4,2,-3);scene.add(f);
      clock = new THREE.Clock();
      observer = new ResizeObserver(() => {
        const w=el.clientWidth,h=el.clientHeight;
        if(!renderer || w<=0 || h<=0) return;
        camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);
      });
      observer.observe(el);
      new IntersectionObserver(entries => {visible=entries[0]?.isIntersecting??true;}, {threshold:.01}).observe(el);
      renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();message('WebGL perdido. Reabra o GLB para continuar.');});
      renderer.setAnimationLoop(() => {
        const dt = clock.getDelta();
        if(document.hidden || !visible || !model) return;
        if(!isPaused) mixer?.update(Math.min(dt,.05));
        orbit.update();
        renderer.render(scene,camera);
      });
    } catch(e) {
      message('WebGL indisponível: '+e.message);
      throw e;
    }
  }
  function freeModel() {
    if(!model)return;
    action?.stop();mixer?.stopAllAction();if(mixer)mixer.uncacheRoot(model);
    scene?.remove(model);
    const geoms=new Set(),mats=new Set(),textures=new Set();
    model.traverse(node=>{
      if(!node.isMesh)return;
      if(node.geometry)geoms.add(node.geometry);
      for(const mat of Array.isArray(node.material)?node.material:[node.material]){
        if(!mat)continue;
        mats.add(mat);
        for(const v of Object.values(mat))if(v?.isTexture)textures.add(v);
      }
    });
    for(const a of geoms)a.dispose();
    for(const a of textures)a.dispose();
    for(const a of mats)a.dispose();
    model=null;mixer=null;action=null;meshes=[];props=[];clips=[];morphControls.clear();
  }
  function setCamera(name='three') {
    if(!model)return;
    const target=focus==='face'?headCenter:boxCenter;
    const d=radius*(focus==='face'?1.2:2.85);
    const vector={front:[0,0,1],three:[.55,.12,1],back:[0,0,-1]}[name]||[.55,.12,1];
    camera.position.set(target.x+d*vector[0],target.y+d*vector[1],target.z+d*vector[2]);
    camera.near=Math.max(.0001,radius/1000);camera.far=Math.max(100,radius*100);
    camera.updateProjectionMatrix();orbit.target.copy(target);orbit.update();
  }
  function playClip(name) {
    if(!mixer || !clips.length)return;
    const clip=clips.find(c=>c.name===name);
    if(!clip)return;
    action?.fadeOut(.18);
    const a=mixer.clipAction(clip);a.reset();a.setLoop(THREE.LoopRepeat,Infinity);a.clampWhenFinished=false;a.fadeIn(.18).play();
    action=a;isPaused=false;$('pause').textContent='Pausar';
    message('Sophia v1.2.1 · '+clip.name+' · '+clip.duration.toFixed(2)+' s');
  }
  function updateMorph(name,val) {
    const v=Math.max(0,Math.min(1,Number(val)));
    for(const x of meshes) {
      const ix=x.morphTargetDictionary?.[name];
      if(ix!==undefined && x.morphTargetInfluences)x.morphTargetInfluences[ix]=v;
    }
  }
  function setupMorphs(){
    const names=[...new Set(meshes.flatMap(m=>Object.keys(m.morphTargetDictionary||{})))];
    const parent=$('morphs');parent.replaceChildren();morphControls.clear();
    for(const name of names){
      const item=document.createElement('div');item.className='morphRow';
      const label=document.createElement('label');label.textContent=name;
      const output=document.createElement('output');output.textContent='0%';label.append(output);
      const input=document.createElement('input');input.type='range';input.min='0';input.max='100';input.step='5';input.value='0';input.setAttribute('aria-label',name);
      input.addEventListener('input',()=>{if(!isPaused){isPaused=true;$('pause').textContent='Continuar';}updateMorph(name,Number(input.value)/100);output.textContent=input.value+'%';});
      item.append(label,input);parent.append(item);morphControls.set(name,input);
    }
    if(!names.length){const p=document.createElement('p');p.className='muted';p.textContent='GLB sem morph targets.';parent.append(p);}
  }
  function toggleProps(checked) {for(const obj of props)obj.visible=checked;}
  function validateGlb(buf) {
    if(buf.byteLength<20)throw Error('Arquivo GLB incompleto.');
    const dv=new DataView(buf);
    if(dv.getUint32(0,true)!==0x46546c67 || dv.getUint32(4,true)!==2 || dv.getUint32(8,true)!==buf.byteLength)
      throw Error('Selecione um GLB 2.0 válido.');
    const len=dv.getUint32(12,true);
    if(dv.getUint32(16,true)!==0x4e4f534a || len>buf.byteLength-20)throw Error('Bloco JSON do GLB inválido.');
    const js=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,20,len)).trim());
    const linked=[...(js.images||[]),...(js.buffers||[])].filter(v=>v.uri&&!v.uri.startsWith('data:'));
    if(linked.length)throw Error('GLB usa referências externas. Selecione uma versão autocontida.');
  }
  $('file').addEventListener('change',async()=>{
    const f=$('file').files?.[0];if(!f)return;
    const ticket=++selection;
    $('fileName').textContent=f.name+' · '+(f.size/1048576).toFixed(1)+' MB';
    if(!f.name.toLowerCase().endsWith('.glb')||f.size>80*1048576){message('Selecione um arquivo GLB de até 80 MB.');return;}
    setControls(false);freeModel();
    try {
      message('Lendo o modelo diretamente no navegador…');
      const bytes=await f.arrayBuffer();validateGlb(bytes);
      initScene();
      const url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));
      let gltf;
      try{gltf=await new GLTFLoader().loadAsync(url);}finally{URL.revokeObjectURL(url);}
      if(ticket!==selection){gltf.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();});return;}
      model=gltf.scene;scene.add(model);model.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
      box.getCenter(boxCenter);radius=Math.max(.1,size.length()/2);
      headCenter=boxCenter.clone().add(new THREE.Vector3(0,size.y*.29,0));
      model.traverse(o=>{
        if(o.isMesh && o.morphTargetDictionary)meshes.push(o);
        if(o.userData?.prop==='book'||o.userData?.prop==='pen'||/^(Book_Left_CoverPages|Book_Right_CoverPages|Prop_Pen)$/.test(o.name))props.push(o);
      });
      toggleProps($('props').checked);
      mixer=new THREE.AnimationMixer(model);clips=gltf.animations;
      const c=$('clip');c.replaceChildren();
      for(const clip of clips){const o=document.createElement('option');o.value=clip.name;o.textContent=clip.name;c.append(o);}
      setupMorphs();setControls(true);focus='body';setCamera();
      const prefer=clips.find(x=>x.name==='Lab_Write_Notes_R2')||clips.find(x=>x.name==='Lab_Idle_Breath_R1')||clips[0];
      if(prefer){c.value=prefer.name;playClip(prefer.name);}
      message('Modelo pronto: '+clips.length+' clipes · '+meshes.length+' malha(s) com morphs · '+props.length+' objetos de acessórios.');
    }catch(e){freeModel();message('Não foi possível abrir o GLB: '+e.message);}
  });
  $('clip').addEventListener('change',()=>playClip($('clip').value));
  $('props').addEventListener('change',()=>toggleProps($('props').checked));
  $('front').addEventListener('click',()=>setCamera('front'));
  $('three').addEventListener('click',()=>setCamera('three'));
  $('back').addEventListener('click',()=>setCamera('back'));
  $('face').addEventListener('click',()=>{focus='face';setCamera('front');});
  $('resetCamera').addEventListener('click',()=>{focus='body';setCamera('three');});
  $('pause').addEventListener('click',()=>{isPaused=!isPaused;$('pause').textContent=isPaused?'Continuar':'Pausar';});
  $('neutral').addEventListener('click',()=>{
    action?.stop();isPaused=true;$('pause').textContent='Continuar';
    for(const [name,input] of morphControls){input.value='0';input.parentElement.querySelector('output').textContent='0%';updateMorph(name,0);}
    model?.traverse(x=>{if(x.isSkinnedMesh)x.skeleton.pose();});message('Expressão neutra (animação pausada).');
  });
  $('capture').addEventListener('click',()=>{
    if(!renderer||!model)return;
    orbit.update();renderer.render(scene,camera);
    renderer.domElement.toBlob(blob=>{
      if(!blob){message('Captura não disponível neste navegador.');return;}
      const uri=URL.createObjectURL(blob);const a=document.createElement('a');
      a.href=uri;a.download='Sophia_Lab_v121_captura.png';a.click();
      setTimeout(()=>URL.revokeObjectURL(uri),1500);
    },'image/png');
  });
  $('export').addEventListener('click',()=>{
    const entries=[...document.querySelectorAll('[data-qa]')].map(x=>[x.dataset.qa,x.value]);
    const data={date:new Date().toISOString(),asset:$('file').files?.[0]?.name||null,version:'1.2.1',clip:$('clip').value,
      qa:Object.fromEntries(entries),notes:$('notes').value,
      morphs:Object.fromEntries([...morphControls].map(([name,x])=>[name,Number(x.value)/100]))};
    const uri=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=uri;a.download='Sophia_Lab_v121_QA.json';a.click();setTimeout(()=>URL.revokeObjectURL(uri),2000);
  });
}