import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function mountSophiaFaceR2Preview() {
  const root = document.querySelector('[data-sophia-r2]');
  if (!root) return;
  const $ = (id) => document.getElementById(id);
  const slots = { r1: null, r2: null };
  let selectedVersion = 'r1';
  let selectedCharacter = 'anime';
  let renderer = null, scene = null, camera = null, orbit = null, litFront = null, litSide = null;
  let current = null, mixer = null, action = null, controls = new Map(), blink = { left: 0, right: 0 };
  let loadSerial = 0, lastFrame = performance.now(), facing = 'three', focus = 'full', visible = true;
  let modelBounds = null, headCenter = null, radius = 1, activeModelName = '';
  const savedQA = new Map();
  const MAX_GLTF = 100 * 1024 * 1024, MAX_ZIP = 250 * 1024 * 1024;
  const eyes = { left: 'Blink_L', right: 'Blink_R' };
  const cameraDirections = { front: [0, 0, 1], three: [.55, .18, 1], left: [-1, 0, 0], right: [1, 0, 0], back: [0, 0, -1] };
  const message = (s) => { $('status').textContent = s; };
  const statusSlot = (key, state) => { $('state-' + key).textContent = state; };
  const flag = (id, enabled) => { $(id).disabled = !enabled; };
  const nameOf = (f) => f?.name || '(sem nome)';
  const keyQA = () => selectedVersion + '_' + selectedCharacter;
  const read16 = (u, p) => u[p] | (u[p + 1] << 8);
  const read32 = (u, p) => (u[p] | (u[p + 1] << 8) | (u[p + 2] << 16) | (u[p + 3] << 24)) >>> 0;

  function selectedEntries(dir, character) {
    const glbs = dir.filter(e => /\.glb$/i.test(e.name) && !e.name.includes('__MACOSX'));
    if (!glbs.length) throw Error('Não há GLBs neste ZIP.');
    const matching = glbs.filter(e => character === 'anime' ? /anime|waifu/i.test(e.name) : /kitsune|fox(?!y)|raposa/i.test(e.name));
    if (matching.length) {
      return matching.sort((a, b) => (b.name.toLowerCase().includes('facial') ? 1 : 0) - (a.name.toLowerCase().includes('facial') ? 1 : 0))[0];
    }
    if (glbs.length === 1) return glbs[0];
    throw Error('O ZIP contém vários GLBs, mas nenhum identificado como ' + (character === 'anime' ? 'Anime' : 'Kitsune') + '. Selecione o GLB específico.');
  }

  async function inspectZip(file) {
    const tailOffset = Math.max(0, file.size - 65557);
    const tail = new Uint8Array(await file.slice(tailOffset).arrayBuffer());
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (read32(tail, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw Error('ZIP inválido: diretório final não encontrado.');
    const count = read16(tail, eocd + 10), offset = read32(tail, eocd + 16), size = read32(tail, eocd + 12);
    if (count === 0xffff || offset === 0xffffffff) throw Error('ZIP64 não suportado. Selecione um GLB individual.');
    if (size > 8 * 1024 * 1024 || offset + size > file.size) throw Error('Diretório ZIP suspeito.');
    const dir = new Uint8Array(await file.slice(offset, offset + size).arrayBuffer());
    const decoder = new TextDecoder();
    const entries = [];
    let pos = 0;
    for (let i = 0; i < count; i++) {
      if (pos + 46 > dir.length || read32(dir, pos) !== 0x02014b50) throw Error('Diretório ZIP danificado.');
      const method = read16(dir, pos + 10), compressed = read32(dir, pos + 20), decompressed = read32(dir, pos + 24);
      const len = read16(dir, pos + 28), extra = read16(dir, pos + 30), comment = read16(dir, pos + 32);
      const start = read32(dir, pos + 42), flags = read16(dir, pos + 8);
      const name = decoder.decode(dir.subarray(pos + 46, pos + 46 + len));
      if (/\.glb$/i.test(name)) entries.push({ name, method, compressed, decompressed, start, flags });
      pos += 46 + len + extra + comment;
    }
    if (!entries.length) throw Error('Nenhum GLB encontrado dentro do ZIP.');
    return entries;
  }

  async function readAsset(slot, character) {
    if (!slot) return null;
    if (slot.kind === 'glb') return { bytes: await slot.file.arrayBuffer(), name: slot.file.name };
    const item = selectedEntries(slot.entries, character);
    if (item.decompressed > MAX_GLTF || item.compressed > MAX_GLTF || item.flags & 1) throw Error('GLB muito grande ou entrada ZIP criptografada.');
    const h = new Uint8Array(await slot.file.slice(item.start, item.start + 30).arrayBuffer());
    if (read32(h, 0) !== 0x04034b50) throw Error('Cabeçalho ZIP local inválido.');
    const start = item.start + 30 + read16(h, 26) + read16(h, 28);
    if (start + item.compressed > slot.file.size) throw Error('Conteúdo ZIP excede tamanho do arquivo.');
    const blob = slot.file.slice(start, start + item.compressed);
    if (item.method === 0) return { bytes: await blob.arrayBuffer(), name: item.name };
    if (item.method === 8) {
      if (typeof DecompressionStream === 'undefined') throw Error('Este navegador não abre ZIPs comprimidos. Selecione o GLB diretamente.');
      try {
        const buffer = await new Response(blob.stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
        if (buffer.byteLength !== item.decompressed) throw Error('Tamanho descompactado diferente do informado.');
        return { bytes: buffer, name: item.name };
      } catch (e) { throw Error('Não foi possível abrir o ZIP comprimido neste navegador. Selecione o GLB individual. (' + e.message + ')'); }
    }
    throw Error('Compressão ZIP não suportada (' + item.method + '). Selecione o GLB diretamente.');
  }

  function validateGlb(bytes) {
    const view = new DataView(bytes);
    if (bytes.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) throw Error('Arquivo não é um GLB 2.0 válido.');
    if (view.getUint32(8, true) !== bytes.byteLength) throw Error('O comprimento do GLB é inconsistente.');
    const chunkSize = view.getUint32(12, true);
    if (view.getUint32(16, true) !== 0x4e4f534a || chunkSize > bytes.byteLength - 20) throw Error('GLB não contém um bloco JSON válido.');
    const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, chunkSize)).trim());
    for (const x of [...(gltf.buffers || []), ...(gltf.images || [])]) {
      if (x.uri && !x.uri.startsWith('data:')) throw Error('GLB com recursos externos não é permitido. Exporte um GLB autocontido.');
    }
  }

  function disposeSceneObject(obj) {
    if (!obj) return;
    const geometries = new Set(), materials = new Set(), textures = new Set();
    obj.traverse(node => {
      if (!node.isMesh) return;
      if (node.geometry) geometries.add(node.geometry);
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        if (!material) continue;
        materials.add(material);
        for (const v of Object.values(material)) if (v?.isTexture) textures.add(v);
      }
    });
    for (const x of geometries) x.dispose();
    for (const x of textures) { if (x.source?.data?.close) x.source.data.close(); x.dispose(); }
    for (const x of materials) x.dispose();
  }

  function releaseModel() {
    if (action) { action.stop(); action = null; }
    if (mixer) { mixer.stopAllAction(); if (current) mixer.uncacheRoot(current); mixer = null; }
    if (current) { scene?.remove(current); disposeSceneObject(current); current = null; }
    controls.clear();
    $('morphs').replaceChildren();
    $('count').textContent = '0';
    activeModelName = '';
  }

  function initialize() {
    if (renderer) return;
    const stage = $('stage');
    renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'default', preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.35));
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); message('Contexto WebGL perdido. Reabra o modelo se necessário.'); });
    renderer.domElement.addEventListener('webglcontextrestored', () => message('Contexto WebGL restaurado. Verifique se as texturas reapareceram.'));
    scene = new THREE.Scene(); scene.background = new THREE.Color('#e9eaf2');
    camera = new THREE.PerspectiveCamera(35, stage.clientWidth / stage.clientHeight, .001, 1000);
    orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d8e4, 2));
    litFront = new THREE.DirectionalLight(0xffffff, 2.1); litFront.position.set(1.7, 4, 6); scene.add(litFront);
    litSide = new THREE.DirectionalLight(0xe0d6ff, 1.2); litSide.position.set(-4, 1, 2); scene.add(litSide);
    stage.querySelector('.empty')?.remove();
    stage.appendChild(renderer.domElement);
    new ResizeObserver(() => {
      if (!renderer) return;
      const w = stage.clientWidth, h = stage.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    }).observe(stage);
    new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; }, { threshold: .01 }).observe(stage);
    renderer.setAnimationLoop(render);
  }

  function look(direction = 'three', targetFocus = 'full') {
    if (!current) return;
    facing = direction; focus = targetFocus;
    const target = focus === 'face' ? headCenter : modelBounds.center;
    const distance = radius * (focus === 'face' ? 1.05 : 2.8);
    const v = cameraDirections[direction] || cameraDirections.three;
    camera.position.set(target.x + v[0] * distance, target.y + v[1] * distance, target.z + v[2] * distance);
    orbit.target.copy(target);
    camera.near = Math.max(.001, radius / 500); camera.far = Math.max(50, radius * 100);
    camera.updateProjectionMatrix(); orbit.update();
  }

  function morphDict() {
    const names = new Set();
    current?.traverse(node => { if (node.isMesh && node.morphTargetDictionary) for (const name of Object.keys(node.morphTargetDictionary)) names.add(name); });
    return [...names];
  }

  function setMorph(name, value) {
    if (!current) return;
    const v = Math.max(0, Math.min(1, Number(value) || 0));
    current.traverse(node => {
      if (!node.isMesh || !node.morphTargetDictionary) return;
      const index = node.morphTargetDictionary[name];
      if (index !== undefined && node.morphTargetInfluences) node.morphTargetInfluences[index] = v;
    });
    const slider = controls.get(name);
    if (slider) { slider.value = String(Math.round(v * 100)); slider.parentElement.querySelector('output').textContent = Math.round(v * 100) + '%'; }
  }

  function stopDemo() { if (action) { action.stop(); action = null; } }
  function applyBlink() {
    stopDemo();
    setMorph(eyes.left, blink.left);
    setMorph(eyes.right, blink.right);
    for (const [side, id] of [['left', 'left-value'], ['right', 'right-value']]) {
      $(id).textContent = Math.round(blink[side] * 100) + '%';
      $('blink-' + side).value = String(Math.round(blink[side] * 100));
    }
  }

  function resetMorphs() {
    stopDemo();
    for (const name of controls.keys()) setMorph(name, 0);
    blink = { left: 0, right: 0 };
    applyBlink();
  }

  function constructControls() {
    controls.clear();
    const host = $('morphs'); host.replaceChildren();
    const names = morphDict(); $('count').textContent = String(names.length);
    const main = names.filter(x => /^Blink_/i.test(x));
    const rest = names.filter(x => !/^Blink_/i.test(x));
    for (const name of [...main, ...rest]) {
      const line = document.createElement('div'); line.className = 'morphLine';
      const label = document.createElement('label'), title = document.createElement('span'), value = document.createElement('output');
      title.textContent = name; value.textContent = '0%';
      label.append(title, value);
      const slide = document.createElement('input');
      slide.type = 'range'; slide.min = '0'; slide.max = '100'; slide.step = '5'; slide.value = '0'; slide.setAttribute('aria-label', name);
      slide.addEventListener('input', () => {
        stopDemo(); const v = Number(slide.value) / 100; setMorph(name, v);
        if (name === eyes.left) blink.left = v;
        if (name === eyes.right) blink.right = v;
        if (name.startsWith('Blink_')) {
          $('blink-left').value = String(blink.left * 100); $('blink-right').value = String(blink.right * 100);
          $('left-value').textContent = Math.round(blink.left * 100) + '%'; $('right-value').textContent = Math.round(blink.right * 100) + '%';
        }
      });
      line.append(label, slide); host.append(line); controls.set(name, slide);
    }
    if (!names.length) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'Nenhum morph target encontrado no GLB selecionado.'; host.append(p); }
    for (const id of ['blink-left', 'blink-right']) $(id).disabled = !names.includes(id === 'blink-left' ? eyes.left : eyes.right);
  }

  function rememberQA() {
    savedQA.set(keyQA(), {
      values: Object.fromEntries([...document.querySelectorAll('[data-criterion]')].map(el => [el.dataset.criterion, el.value])),
      notes: $('notes').value
    });
  }
  function restoreQA() {
    const v = savedQA.get(keyQA()) || { values: {}, notes: '' };
    for (const el of document.querySelectorAll('[data-criterion]')) el.value = v.values[el.dataset.criterion] || 'NOT TESTED';
    $('notes').value = v.notes;
  }

  async function changeModel() {
    const ticket = ++loadSerial;
    releaseModel();
    const slot = slots[selectedVersion];
    if (!slot) { message('Nenhum ' + selectedVersion.toUpperCase() + ' selecionado. Use o campo de arquivo dessa versão.'); return; }
    try {
      message('Lendo ' + selectedVersion.toUpperCase() + ' / ' + selectedCharacter + ' localmente…');
      const asset = await readAsset(slot, selectedCharacter);
      if (ticket !== loadSerial) return;
      if (asset.bytes.byteLength > MAX_GLTF) throw Error('GLB excede o limite de 100 MB para esta prévia.');
      validateGlb(asset.bytes);
      initialize();
      const url = URL.createObjectURL(new Blob([asset.bytes], { type: 'model/gltf-binary' }));
      let result;
      try { result = await new GLTFLoader().loadAsync(url); } finally { URL.revokeObjectURL(url); }
      if (ticket !== loadSerial) { disposeSceneObject(result.scene); return; }
      current = result.scene; scene.add(current);
      const b = new THREE.Box3().setFromObject(current), size = b.getSize(new THREE.Vector3());
      const center = b.getCenter(new THREE.Vector3());
      modelBounds = { center, size };
      headCenter = center.clone().add(new THREE.Vector3(0, size.y * .3, 0));
      radius = Math.max(.1, size.length() / 2);
      mixer = new THREE.AnimationMixer(current);
      current.userData.qaClip = result.animations.find(x => /Facial_Demo/i.test(x.name)) || result.animations[0] || null;
      constructControls(); applyBlink(); look(facing, focus);
      activeModelName = asset.name;
      message(selectedVersion.toUpperCase() + ' · ' + selectedCharacter + ' · ' + morphDict().length + ' morphs · ' + result.animations.length + ' clipe(s) · ' + asset.name);
    } catch (err) {
      if (ticket === loadSerial) { releaseModel(); message('Não foi possível carregar: ' + (err?.message || String(err))); }
    }
  }

  async function selectFile(key, file) {
    if (!file) return;
    if (file.size > MAX_ZIP) { $('file-' + key).textContent = 'Arquivo acima do limite de 250 MB.'; return; }
    statusSlot(key, 'Verificando…');
    try {
      const kind = /\.zip$/i.test(file.name) ? 'zip' : /\.glb$/i.test(file.name) ? 'glb' : null;
      if (!kind) throw Error('Selecione .glb ou .zip');
      const entries = kind === 'zip' ? await inspectZip(file) : [];
      if (kind === 'glb' && file.size > MAX_GLTF) throw Error('GLB maior que 100 MB');
      slots[key] = { kind, file, entries };
      $('file-' + key).textContent = nameOf(file) + ' · ' + Math.round(file.size / 1048576) + ' MB · somente memória local';
      statusSlot(key, kind === 'zip' ? entries.length + ' GLB(s) no ZIP' : 'Arquivo selecionado');
      selectedVersion = key; $('version').value = key;
      rememberQA(); restoreQA(); await changeModel();
    } catch (e) { statusSlot(key, 'Falha'); $('file-' + key).textContent = 'Erro: ' + e.message; }
  }

  function render() {
    if (!renderer || !scene || !camera) return;
    const now = performance.now(), dt = Math.min(.06, (now - lastFrame) / 1000); lastFrame = now;
    if (document.hidden || !visible) return;
    mixer?.update(dt); orbit?.update(); renderer.render(scene, camera);
  }

  document.querySelectorAll('[data-file]').forEach(el => el.addEventListener('change', () => selectFile(el.dataset.file, el.files?.[0])));
  $('version').addEventListener('change', async () => { rememberQA(); selectedVersion = $('version').value; restoreQA(); await changeModel(); });
  $('character').addEventListener('change', async () => { rememberQA(); selectedCharacter = $('character').value; restoreQA(); await changeModel(); });
  $('swap').addEventListener('click', () => { rememberQA(); selectedVersion = selectedVersion === 'r1' ? 'r2' : 'r1'; $('version').value = selectedVersion; restoreQA(); changeModel(); });
  document.querySelectorAll('[data-angle]').forEach(btn => btn.addEventListener('click', () => look(btn.dataset.angle)));
  $('zoom-face').addEventListener('click', () => look(facing, 'face'));
  $('zoom-full').addEventListener('click', () => look(facing, 'full'));
  $('light').addEventListener('change', () => {
    if (!litFront || !litSide) return;
    litFront.position.set(...($('light').value === 'neutral' ? [1.7, 4, 6] : [5, 1, 1]));
    litSide.intensity = $('light').value === 'neutral' ? 1.2 : .35;
  });
  for (const side of ['left', 'right']) $('blink-' + side).addEventListener('input', () => { blink[side] = Number($('blink-' + side).value) / 100; applyBlink(); });
  document.querySelectorAll('[data-step]').forEach(btn => btn.addEventListener('click', () => {
    const v = Number(btn.dataset.step) / 100; blink = { left: v, right: v }; applyBlink();
    document.querySelectorAll('[data-step]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  }));
  $('reset').addEventListener('click', resetMorphs);
  $('stop').addEventListener('click', () => { stopDemo(); message('Demonstração interrompida.'); });
  $('demo').addEventListener('click', () => {
    if (!current?.userData.qaClip || !mixer) { message('Este GLB não contém demonstração facial.'); return; }
    resetMorphs(); action = mixer.clipAction(current.userData.qaClip); action.reset().setLoop(THREE.LoopOnce, 1).play();
    message('Executando clipe facial do arquivo: ' + current.userData.qaClip.name);
  });
  $('capture').addEventListener('click', () => {
    if (!renderer || !current) { message('Carregue um modelo antes de capturar.'); return; }
    orbit.update(); renderer.render(scene, camera);
    renderer.domElement.toBlob(blob => {
      if (!blob) { message('Captura PNG não disponível neste navegador.'); return; }
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'Sophia_' + selectedCharacter + '_' + selectedVersion.toUpperCase() + '_QA.png'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, 'image/png');
  });
  $('report').addEventListener('click', () => {
    rememberQA();
    const report = { schema: 'Sophia.FacialQA.R2', createdAt: new Date().toISOString(), character: selectedCharacter, version: selectedVersion,
      files: Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, v?.file?.name || null])),
      loadedModel: activeModelName || null, blink,
      assessments: Object.fromEntries(savedQA.entries()),
      camera: facing, focus, light: $('light').value,
      note: 'Arquivo local, não comprova aprovação técnica ou correspondência de versões.' };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'Sophia_Facial_R2_QA.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  });
  document.querySelectorAll('[data-criterion]').forEach(x => x.addEventListener('change', rememberQA));
  $('notes').addEventListener('input', rememberQA);
  restoreQA();
  message('Prévia online pronta. R2 pendente: selecione o arquivo gerado pelo Work/Claude.');
}