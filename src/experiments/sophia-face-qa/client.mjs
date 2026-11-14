import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import manifest from './manifest.json';
import animePresets from './presets/anime.json';
import kitsunePresets from './presets/kitsune.json';
import { AssetSlot, verifyMaster, createFaceController, disposeGltf, blankEvaluation, STATUSES, CRITERIA, LIMITATIONS } from './core.mjs';
import { indexZip, findMaster, readZipMaster } from './zip.mjs';

const $ = id => document.getElementById(id);
const presets = { anime: animePresets, kitsune: kitsunePresets };
const files = {}, sessions = {}, evaluations = {}, imageUrls = new Map();
const comparisonFiles = {};
const lifecycle = new AbortController();
let controlEvents = new AbortController(), reviewEvents = new AbortController();
const on = (node, type, listener) => node.addEventListener(type, listener, { signal: lifecycle.signal });
let kind = 'anime', renderer, scene, camera, orbit, keyLight, fillLight, resizeObserver, intersectionObserver;
let raf = 0, lastTime = 0, lastUi = 0, fpsStart = 0, fpsFrames = 0, fps = null;
let visible = true, contextLost = false, destroyed = false, loadRevision = 0, repeating = false;
let light = 'frontal', view = 'front', zoom = 100, framing = 'face';
const runtime = { contextLosses: 0, contextRestores: 0, pauses: 0, repetitions: [], errors: [], captures: [] };
const slot = new AssetSlot(asset => {
  scene?.remove(asset.gltf.scene);
  asset.face.dispose();
  asset.disposal = disposeGltf(asset.gltf);
  renderer?.renderLists.dispose();
  runtime.lastDisposal = asset.disposal;
});

function error(message) {
  $('error').hidden = !message;
  $('error').textContent = message || '';
  if (message) runtime.errors.push({ at: new Date().toISOString(), message });
}
function status(message) { $('load-status').textContent = message; }
function controlsEnabled(enabled) {
  for (const id of ['play', 'stop', 'clip', 'neutral', 'face-view', 'full-view', 'zoom', 'capture', 'repeat-load']) $(id).disabled = !enabled;
  for (const button of document.querySelectorAll('[data-view],#presets button,#morphs input')) button.disabled = !enabled;
}
function memory() { return renderer ? { ...renderer.info.memory } : null; }
function stateSnapshot() {
  const asset = slot.active;
  return {
    model: asset?.kind ?? null, sha256: asset?.info.sha256 ?? null,
    morphs: asset?.face.weights() ?? {}, demoPlaying: asset?.face.playing ?? false,
    demoTime: asset?.mixer.time ?? null, view, framing, zoom, light,
    camera: camera ? { position: camera.position.toArray(), target: orbit.target.toArray(), fov: camera.fov } : null,
    referenceImages: comparisonFiles[kind] ?? {},
    capturedAt: new Date().toISOString(),
  };
}
function shouldRun() { return !!(renderer && slot.active && visible && !document.hidden && !contextLost && !destroyed); }
function schedule() { if (!raf && shouldRun()) { lastTime = 0; fpsStart = 0; fpsFrames = 0; raf = requestAnimationFrame(tick); } }
function pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; runtime.pauses++; } lastTime = 0; fps = null; }
function tick(now) {
  raf = 0;
  if (!shouldRun()) return;
  const delta = lastTime ? Math.min((now - lastTime) / 1000, 0.1) : 0;
  lastTime = now;
  const asset = slot.active;
  if (asset.face.playing) asset.mixer.update(delta);
  renderer.render(scene, camera);
  fpsStart ||= now; fpsFrames++;
  if (now - fpsStart >= 1000) { fps = Math.round(fpsFrames * 1000 / (now - fpsStart)); fpsStart = now; fpsFrames = 0; }
  if (now - lastUi >= 160) { updateSliderValues(); updateMetrics(); lastUi = now; }
  raf = requestAnimationFrame(tick);
}
function renderOnce() { if (renderer && !contextLost) renderer.render(scene, camera); }
function initRenderer() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.domElement.setAttribute('aria-label', 'Sophia 3D; arraste para orbitar e use dois dedos para zoom');
  renderer.domElement.setAttribute('role', 'img');
  $('viewport').append(renderer.domElement);
  scene = new THREE.Scene(); scene.background = new THREE.Color('#e9edf3');
  camera = new THREE.PerspectiveCamera(30, 1, 0.001, 20);
  orbit = new OrbitControls(camera, renderer.domElement); orbit.enableDamping = false;
  orbit.minDistance = 0.06; orbit.maxDistance = 4;
  orbit.addEventListener('start', () => { view = 'manual'; });
  orbit.addEventListener('change', renderOnce);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9292a0, 0.65));
  keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
  fillLight = new THREE.DirectionalLight(0xe9edff, 0.4);
  scene.add(keyLight, keyLight.target, fillLight, fillLight.target);
  resizeObserver = new ResizeObserver(() => {
    const box = $('viewport').getBoundingClientRect();
    if (!box.width || !box.height) return;
    renderer.setSize(box.width, box.height, false); camera.aspect = box.width / box.height; camera.updateProjectionMatrix(); renderOnce();
  });
  resizeObserver.observe($('viewport'));
  intersectionObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) schedule(); else pause();
  });
  intersectionObserver.observe($('viewport'));
  on(renderer.domElement, 'webglcontextlost', event => {
    event.preventDefault(); contextLost = true; runtime.contextLosses++; pause(); error('O contexto WebGL foi perdido. Aguarde a restauração ou recarregue a página.');
  });
  on(renderer.domElement, 'webglcontextrestored', () => {
    contextLost = false; runtime.contextRestores++; error(''); schedule();
  });
}

function lighting(value) {
  light = value;
  if (!renderer) return;
  const data = manifest[kind], target = new THREE.Vector3(...data.faceTarget);
  const forward = new THREE.Vector3(...data.forward), right = new THREE.Vector3(...data.right);
  keyLight.position.copy(target).addScaledVector(forward, value === 'frontal' ? 1.2 : 0.8).addScaledVector(right, value === 'frontal' ? 0 : -0.9).add(new THREE.Vector3(0, value === 'frontal' ? 0.3 : 1.0, 0));
  fillLight.position.copy(target).addScaledVector(forward, 0.7).addScaledVector(right, 0.6).add(new THREE.Vector3(0, 0.2, 0));
  keyLight.target.position.copy(target); fillLight.target.position.copy(target);
  keyLight.intensity = value === 'frontal' ? 1.4 : 1.6;
  fillLight.intensity = value === 'frontal' ? 0.4 : 0.25;
  renderOnce();
}
function setView(name, frame = framing) {
  if (!slot.active) return;
  framing = frame; view = name; zoom = 100; $('zoom').value = '100'; $('zoom-value').textContent = '100%';
  const data = manifest[kind]; const target = new THREE.Vector3(...data.faceTarget);
  const angles = { front: 0, 'three-quarter': Math.PI / 4, 'three-quarter-left': -Math.PI / 4, left: -Math.PI / 2, right: Math.PI / 2, rear: Math.PI };
  const angle = angles[name] ?? 0;
  const direction = new THREE.Vector3(...data.forward).multiplyScalar(Math.cos(angle)).addScaledVector(new THREE.Vector3(...data.right), Math.sin(angle));
  let distance = kind === 'anime' ? 0.46 : 0.61;
  if (frame === 'full') {
    const box = new THREE.Box3().setFromObject(slot.active.gltf.scene);
    box.getCenter(target); const size = box.getSize(new THREE.Vector3());
    distance = Math.max(size.x / camera.aspect, size.y, size.z) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.18;
  }
  camera.position.copy(target).addScaledVector(direction, distance);
  orbit.target.copy(target); orbit.update(); renderOnce();
}
function setZoom(value) {
  if (!slot.active) return;
  const previous = zoom; zoom = value;
  const offset = camera.position.clone().sub(orbit.target).multiplyScalar(previous / zoom);
  camera.position.copy(orbit.target).add(offset); orbit.update(); $('zoom-value').textContent = `${zoom}%`; renderOnce();
}

function updateMetrics() {
  const data = sessions[kind]?.lastLoad, info = renderer?.info;
  const fields = [
    ['Leitura local', data ? `${data.readMs.toFixed(0)} ms` : '—'],
    ['Verificação SHA-256', data ? `${data.verifyMs.toFixed(0)} ms` : '—'],
    ['Parse / preparo de textura', data ? `${data.parseMs.toFixed(0)} ms` : '—'],
    ['Até primeiro frame enviado', data ? `${data.firstSubmittedMs.toFixed(0)} ms` : '—'],
    ['FPS estimado · janela 1 s', shouldRun() && fps !== null ? String(fps) : 'Não medido / pausado'],
    ['DPR', renderer ? renderer.getPixelRatio().toFixed(2) : '—'],
    ['Geometrias / texturas', info ? `${info.memory.geometries} / ${info.memory.textures}` : '—'],
    ['Draw calls / triângulos', info ? `${info.render.calls} / ${info.render.triangles}` : '—'],
    ['Perdas de contexto', String(runtime.contextLosses)],
  ];
  $('metrics').replaceChildren(...fields.map(([title, value]) => {
    const row = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = title; dd.textContent = value; row.append(dt, dd); return row;
  }));
  $('motion-status').textContent = slot.active?.face.playing ? 'Demonstração facial em reprodução' : 'Controle manual / repouso';
}
function updateSliderValues() {
  if (!slot.active) return;
  for (const [name, value] of Object.entries(slot.active.face.weights())) {
    const row = document.querySelector(`[data-morph-name="${CSS.escape(name)}"]`);
    if (!row) continue;
    row.querySelector('input').value = String(value); row.querySelector('output').textContent = value.toFixed(2);
  }
}
function buildControls(asset) {
  controlEvents.abort(); controlEvents = new AbortController();
  const bind = (node, event, listener) => node.addEventListener(event, listener, { signal: controlEvents.signal });
  $('morph-count').textContent = String(asset.face.names.length);
  $('morphs').replaceChildren(...asset.face.names.map((name, index) => {
    const row = document.createElement('div'); row.className = 'morph-row'; row.dataset.morphName = name;
    const heading = document.createElement('div'); heading.className = 'morph-heading';
    const label = document.createElement('label'), output = document.createElement('output'), input = document.createElement('input');
    input.id = `morph-${index}`; input.type = 'range'; input.min = '0'; input.max = name === 'Mouth_Open' ? '0.65' : '1'; input.step = '0.01'; input.value = '0'; label.htmlFor = input.id; label.textContent = name; output.htmlFor = input.id; output.textContent = '0.00';
    bind(input, 'input', () => { slot.active?.face.set(name, Number(input.value)); updateSliderValues(); renderOnce(); });
    heading.append(label, output); row.append(heading, input); return row;
  }));
  $('presets').replaceChildren(...Object.entries(presets[kind]).map(([name, values]) => {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = name;
    bind(button, 'click', () => { try { slot.active?.face.preset(values); updateSliderValues(); renderOnce(); } catch (e) { error(e.message); } }); return button;
  }));
  $('preset-info').textContent = `${Object.keys(presets[kind]).length} presets do JSON R1. Nomes indicam intenção; a leitura visual será avaliada abaixo.`;
  $('clip').replaceChildren(...asset.gltf.animations.map((clip, index) => { const option = document.createElement('option'); option.value = String(index); option.textContent = `${clip.name} · ${clip.duration.toFixed(2)} s`; return option; }));
  $('model-info').textContent = `${manifest[kind].label} · ${asset.info.bones} ossos · ${asset.face.names.length} morphs · SHA-256 confirmado`;
}

function ensureEvaluation(selectedKind, names = []) {
  const blank = blankEvaluation(selectedKind, names, Object.keys(presets[selectedKind]));
  const existing = evaluations[selectedKind];
  if (!existing) evaluations[selectedKind] = blank;
  else for (const section of ['criteria', 'morphs', 'presets']) Object.assign(existing[section], Object.fromEntries(Object.entries(blank[section]).filter(([id]) => !existing[section][id])));
  return evaluations[selectedKind];
}
function reviewRows(section, rows) {
  const evaluation = ensureEvaluation(kind, slot.active?.kind === kind ? slot.active.face.names : []);
  return rows.map(([id, labelText]) => {
    const row = document.createElement('div'); row.className = 'review-row';
    const label = document.createElement('label'), select = document.createElement('select'), note = document.createElement('input');
    select.id = `review-${section}-${id}`; label.htmlFor = select.id; label.textContent = labelText;
    for (const status of STATUSES) { const option = document.createElement('option'); option.textContent = status; select.append(option); }
    select.value = evaluation[section][id].status; note.type = 'text'; note.maxLength = 1600; note.placeholder = 'Observação e evidência'; note.setAttribute('aria-label', `Observação: ${labelText}`); note.value = evaluation[section][id].notes;
    const selectedKind = kind;
    const record = () => { evaluations[selectedKind][section][id] = { status: select.value, notes: note.value, context: stateSnapshot() }; };
    select.addEventListener('change', record, { signal: reviewEvents.signal }); note.addEventListener('input', record, { signal: reviewEvents.signal }); row.append(label, select, note); return row;
  });
}
function buildReviews() {
  reviewEvents.abort(); reviewEvents = new AbortController();
  const evaluation = ensureEvaluation(kind, slot.active?.kind === kind ? slot.active.face.names : []);
  $('criteria-review').replaceChildren(...reviewRows('criteria', [...CRITERIA.common, ...CRITERIA[kind]]));
  $('morph-review').replaceChildren(...reviewRows('morphs', Object.keys(evaluation.morphs).map(n => [n, n])));
  $('preset-review').replaceChildren(...reviewRows('presets', Object.keys(evaluation.presets).map(n => [n, n])));
}

async function load(selectedKind = kind) {
  const file = files[selectedKind]; if (!file) return null;
  const revision = ++loadRevision; error(''); pause(); controlsEnabled(false); $('viewport').setAttribute('aria-busy', 'true');
  status(`Verificando e carregando ${manifest[selectedKind].label}…`);
  const metrics = {}, start = performance.now();
  try {
    const asset = await slot.load(async () => {
      let time = performance.now(); const buffer = await file.read(); metrics.readMs = performance.now() - time;
      time = performance.now(); const info = await verifyMaster(buffer, manifest[selectedKind]); metrics.verifyMs = performance.now() - time;
      sessions[selectedKind] ??= { loads: [], sha256: info.sha256, source: file.name, inventory: { morphNames: info.names, bones: info.bones, triangles: info.triangles, animations: info.animations } };
      sessions[selectedKind].inputVerified = true;
      sessions[selectedKind].verification = { readMs: metrics.readMs, verifyMs: metrics.verifyMs };
      return { buffer, info };
    }, async ({ buffer, info }) => {
      initRenderer();
      const manager = new THREE.LoadingManager();
      manager.setURLModifier(url => { if (!url.startsWith('blob:') && !url.startsWith('data:')) throw new Error('Acesso externo a assets bloqueado.'); return url; });
      const time = performance.now(); const gltf = await new GLTFLoader(manager).parseAsync(buffer, ''); metrics.parseMs = performance.now() - time;
      try {
        const mixer = new THREE.AnimationMixer(gltf.scene), face = createFaceController(gltf.scene, mixer, gltf.animations);
        return { gltf, mixer, face, info, kind: selectedKind };
      } catch (e) { disposeGltf(gltf); throw e; }
    });
    if (!asset || revision !== loadRevision || selectedKind !== kind) return null;
    scene.add(asset.gltf.scene); asset.gltf.scene.updateMatrixWorld(true);
    $('empty-stage').hidden = true; buildControls(asset); setView('front', 'face'); lighting(light); renderOnce();
    metrics.firstSubmittedMs = performance.now() - start;
    sessions[selectedKind] ??= { loads: [], sha256: asset.info.sha256, inventory: { morphNames: asset.info.names, bones: asset.info.bones, triangles: asset.info.triangles, animations: asset.info.animations } };
    sessions[selectedKind].lastLoad = metrics; sessions[selectedKind].loads.push({ ...metrics, rendererMemory: memory(), at: new Date().toISOString() });
    ensureEvaluation(kind, asset.face.names); buildReviews(); controlsEnabled(true); updateMetrics(); schedule();
    status(`${manifest[kind].label} pronta para avaliação. Master R1 confirmado; arquivo sem alterações.`);
    return asset;
  } catch (e) {
    if (revision === loadRevision) { error(e.message); status(sessions[selectedKind]?.inputVerified ? 'Master R1 confirmado; renderização não concluída.' : 'Carregamento não concluído.'); $('empty-stage').hidden = false; renderOnce(); }
    return null;
  } finally { if (revision === loadRevision) $('viewport').setAttribute('aria-busy', 'false'); }
}
function clear() {
  controlEvents.abort();
  loadRevision++; pause(); slot.clear(); controlsEnabled(false); $('empty-stage').hidden = false;
  $('viewport').setAttribute('aria-busy', 'false'); $('morphs').replaceChildren(); $('presets').replaceChildren(); $('morph-count').textContent = '0'; $('model-info').textContent = 'Nenhum modelo carregado'; renderOnce(); updateMetrics();
}
function selectVariant(value) {
  if (repeating || value === kind) return;
  clear(); kind = value; error(''); $('master-file').value = '';
  for (const side of ['before', 'after']) {
    if (imageUrls.has(side)) URL.revokeObjectURL(imageUrls.get(side));
    $(`${side}-preview`).removeAttribute('src'); $(`${side}-preview`).hidden = true; $(`${side}-image`).value = '';
  }
  imageUrls.clear();
  $('expected-file').textContent = manifest[kind].filename + ' ou ZIP R1';
  for (const button of document.querySelectorAll('[data-variant]')) button.setAttribute('aria-pressed', String(button.dataset.variant === kind));
  buildReviews(); status(files[kind] ? 'Reabrindo o master selecionado anteriormente…' : 'Selecione o master desta versão.');
  if (files[kind]) void load();
}
async function repeatLoads() {
  if (!files[kind] || repeating) return;
  repeating = true; const selectedKind = kind, samples = [];
  $('master-file').disabled = true; $('unload').disabled = true;
  for (const button of document.querySelectorAll('[data-variant]')) button.disabled = true;
  try {
    for (let i = 0; i < 3; i++) {
      const asset = await load(selectedKind); if (!asset) throw new Error('Repetição interrompida por falha de carregamento.');
      renderOnce(); samples.push({ cycle: i + 1, memory: memory(), timing: { ...sessions[kind].lastLoad } });
    }
    const stable = samples.every(s => s.memory.geometries === samples[0].memory.geometries && s.memory.textures === samples[0].memory.textures);
    runtime.repetitions.push({ kind, samples, rendererCountersStable: stable, scope: 'Contadores do renderer apenas; VRAM, heap livre e vazamentos reais não comprovados.' });
    status(stable ? 'Três repetições concluídas; contadores do renderer estáveis nesta sessão.' : 'Contadores variaram nas repetições. Registre a diferença na avaliação.');
  } catch (e) { error(e.message); }
  finally {
    repeating = false; $('master-file').disabled = false; $('unload').disabled = false;
    for (const button of document.querySelectorAll('[data-variant]')) button.disabled = false;
    controlsEnabled(!!slot.active);
  }
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportReview() {
  ensureEvaluation('anime'); ensureEvaluation('kitsune');
  const report = {
    schema: 'sophia-face-qa/1.1', exportedAt: new Date().toISOString(), reviewer: $('reviewer').value,
    decision: $('decision').value, browser: navigator.userAgent,
    privacy: 'Local files only; no automatic upload; masters unchanged.',
    limitations: LIMITATIONS,
    models: { anime: { ...sessions.anime, evaluation: evaluations.anime }, kitsune: { ...sessions.kitsune, evaluation: evaluations.kitsune } },
    current: stateSnapshot(), runtime: { ...runtime, rendererMemory: memory(), estimatedFps: shouldRun() ? fps : null, fpsScope: 'Estimated rendered frames over a one-second window on this session; not GPU timing or mobile certification.' },
  };
  download(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), `Sophia_Facial_QA_R11_${new Date().toISOString().replaceAll(':', '-')}.json`);
}
function capture() {
  if (!renderer || !slot.active || contextLost) return;
  renderOnce(); const context = stateSnapshot();
  renderer.domElement.toBlob(blob => { if (blob) { runtime.captures.push(context); download(blob, `Sophia_${kind}_${view}_${light}.png`); } }, 'image/png');
}

for (const button of document.querySelectorAll('[data-variant]')) on(button, 'click', () => selectVariant(button.dataset.variant));
for (const button of document.querySelectorAll('[data-view]')) on(button, 'click', () => setView(button.dataset.view));
on($('master-file'), 'change', async () => {
  const file = $('master-file').files[0]; if (!file) return;
  try {
    if (/\.zip$/i.test(file.name)) {
      const entries = await indexZip(file);
      const selected = {};
      for (const model of ['anime', 'kitsune']) {
        const entry = findMaster(entries, manifest[model].filename);
        selected[model] = { name: file.name, read: () => readZipMaster(file, entry, manifest[model].bytes) };
      }
      Object.assign(files, selected);
    } else {
      if (file.size !== manifest[kind].bytes) throw new Error('Tamanho incompatível com o master R1 selecionado.');
      files[kind] = { name: file.name, read: () => file.arrayBuffer() };
    }
    void load();
  } catch (e) { error(e.message); }
});
on($('unload'), 'click', () => { clear(); status('Modelo descarregado. O arquivo local pode ser reaberto pela seleção de versão.'); });
on($('neutral'), 'click', () => { slot.active?.face.neutral(); updateSliderValues(); renderOnce(); });
on($('play'), 'click', () => { slot.active?.face.play(Number($('clip').value)); schedule(); });
on($('stop'), 'click', () => { slot.active?.face.stop(); updateSliderValues(); renderOnce(); });
on($('face-view'), 'click', () => setView('front', 'face'));
on($('full-view'), 'click', () => setView('front', 'full'));
on($('zoom'), 'input', () => setZoom(Number($('zoom').value)));
for (const input of document.querySelectorAll('input[name=light]')) on(input, 'change', () => lighting(input.value));
on($('repeat-load'), 'click', repeatLoads); on($('export'), 'click', exportReview); on($('capture'), 'click', capture);
for (const side of ['before', 'after']) on($(`${side}-image`), 'change', async () => {
  const file = $(`${side}-image`).files[0]; if (!file) return;
  if (imageUrls.has(side)) URL.revokeObjectURL(imageUrls.get(side));
  const url = URL.createObjectURL(file); imageUrls.set(side, url); $(`${side}-preview`).src = url; $(`${side}-preview`).hidden = false;
  const selectedKind = kind;
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  comparisonFiles[selectedKind] ??= {};
  comparisonFiles[selectedKind][side] = { name: file.name, sha256: [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('') };
});
on(document, 'visibilitychange', () => { if (document.hidden) pause(); else schedule(); });
on(window, 'pagehide', () => {
  destroyed = true; pause(); slot.clear(); lifecycle.abort(); controlEvents.abort(); reviewEvents.abort(); resizeObserver?.disconnect(); intersectionObserver?.disconnect();
  orbit?.dispose(); renderer?.dispose(); renderer?.forceContextLoss();
  for (const url of imageUrls.values()) URL.revokeObjectURL(url); imageUrls.clear();
});
controlsEnabled(false); buildReviews();
