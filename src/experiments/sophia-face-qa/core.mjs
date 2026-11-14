import { LoopOnce } from 'three';

export const STATUSES = ['NOT TESTED', 'PASS', 'PARTIAL', 'FAIL'];
export const LIMITATIONS = [
  'Olhos sem globos independentes; o olhar deforma a superfície.',
  'Mouth_Open não cria cavidade oral; limite recomendado: 0,65.',
  'Os clipes existentes são exclusivamente faciais.',
];
export const CRITERIA = {
  common: [
    ['identity', 'Identidade e silhueta'], ['mesh', 'Malhas e corpo'],
    ['materials', 'Materiais e contraste'], ['uv', 'UVs e textura'],
    ['weights', 'Pesos de skinning'], ['bones', 'Ossos e hierarquia'],
    ['neutralReturn', 'Retorno neutro'], ['presetReadability', 'Distinção entre presets'],
    ['singleModel', 'Um modelo por vez'], ['resourceStability', 'Três repetições de carga/descarte'],
    ['offscreenPause', 'Pausa fora da tela / aba oculta'], ['mobile', 'Samsung Internet real'],
  ],
  anime: [
    ['neutralFace', 'Rosto neutro'], ['skin', 'Pele e aspecto de porcelana'],
    ['blink', 'Piscada bilateral'], ['wink', 'Piscadela unilateral'],
    ['smile', 'Sorriso suave'], ['microexpressions', 'Microexpressões'],
    ['eyes', 'Contorno ocular e olhar'], ['oblique', 'Artefatos em ¾ e perfil'],
    ['hair', 'Cabelo, franja e orelhas'],
  ],
  kitsune: [
    ['neutralFace', 'Rosto neutro'], ['alignment', 'Alinhamento aparente das íris'],
    ['blink', 'Piscada bilateral'], ['wink', 'Piscadela unilateral'],
    ['gaze', 'Olhar nas quatro direções'], ['oblique', 'Expressão em ¾ e perfis'],
    ['forehead', 'Emblema da testa'], ['tailLeft', 'Constelações: lado esquerdo da cauda'],
    ['tailRight', 'Constelações: lado direito da cauda'], ['fur', 'Pelagem e orelhas'],
  ],
};

export function readGlb(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  if (view.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 ||
      view.getUint32(4, true) !== 2 || view.getUint32(8, true) !== view.byteLength) {
    throw new Error('GLB 2.0 inválido ou incompleto.');
  }
  const length = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a || 20 + length > view.byteLength) {
    throw new Error('Chunk JSON inválido.');
  }
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(arrayBuffer, 20, length)));
  // Self-contained only: no private bytes can trigger a remote asset request.
  for (const item of [...(json.buffers ?? []), ...(json.images ?? [])]) {
    if (item.uri && !item.uri.startsWith('data:')) throw new Error('Dependências externas não são permitidas.');
  }
  const primitives = (json.meshes ?? []).flatMap(m => m.primitives);
  const names = json.meshes?.[0]?.extras?.targetNames ?? [];
  if (!names.length || new Set(names).size !== names.length || primitives.some(p => p.targets?.length !== names.length)) {
    throw new Error('Lista de morphs inconsistente entre as primitivas.');
  }
  return {
    json, names,
    bones: json.skins?.[0]?.joints?.length ?? 0,
    primitives: primitives.length,
    triangles: primitives.reduce((n, p) => n + json.accessors[p.indices].count / 3, 0),
    animations: (json.animations ?? []).map(a => ({
      name: a.name,
      paths: a.channels.map(c => c.target.path),
      start: Math.min(...a.samplers.map(s => json.accessors[s.input].min?.[0] ?? 0)),
      end: Math.max(...a.samplers.map(s => json.accessors[s.input].max?.[0] ?? 0)),
      duration: Math.max(...a.samplers.map(s => json.accessors[s.input].max?.[0] ?? 0)) - Math.min(...a.samplers.map(s => json.accessors[s.input].min?.[0] ?? 0)),
    })),
  };
}

export async function verifyMaster(buffer, expected, cryptoApi = globalThis.crypto) {
  const digest = await cryptoApi.subtle.digest('SHA-256', buffer);
  const sha256 = [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
  if (sha256 !== expected.sha256 || buffer.byteLength !== expected.bytes) {
    throw new Error(`O arquivo não corresponde ao master R1 de ${expected.label}.`);
  }
  const info = readGlb(buffer);
  if (info.names.length !== expected.morphs || info.bones !== expected.bones ||
      info.triangles !== expected.triangles || info.primitives !== expected.primitives ||
      info.animations.length !== 1 || info.animations[0].paths.some(p => p !== 'weights') ||
      Math.abs(info.animations[0].duration - 9) > 1e-4) {
    throw new Error('O inventário do arquivo diverge do contrato R1.');
  }
  return { ...info, sha256, bytes: buffer.byteLength };
}

export function createFaceController(root, mixer, clips) {
  const meshes = [];
  root.traverse(o => { if (o.isMesh && o.morphTargetDictionary) meshes.push(o); });
  const names = [...new Set(meshes.flatMap(m => Object.keys(m.morphTargetDictionary)))];
  if (!meshes.length) throw new Error('Nenhum morph real encontrado.');
  let action = null;
  let playing = false;
  const weights = () => Object.fromEntries(names.map(name => [name, meshes[0].morphTargetInfluences[meshes[0].morphTargetDictionary[name]]]));
  const assign = values => {
    for (const m of meshes) for (const [name, index] of Object.entries(m.morphTargetDictionary)) {
      const value = values[name] ?? 0;
      m.morphTargetInfluences[index] = Math.max(0, Math.min(name === 'Mouth_Open' ? 0.65 : 1, value));
    }
  };
  const stop = (neutral = false) => {
    const snapshot = weights();
    mixer.stopAllAction();
    playing = false;
    assign(neutral ? {} : snapshot);
  };
  const onFinished = () => { playing = false; };
  mixer.addEventListener('finished', onFinished);
  return {
    names, meshes, weights,
    get playing() { return playing; },
    stop,
    neutral() { stop(true); },
    set(name, value) {
      if (!names.includes(name) || !Number.isFinite(value)) throw new Error('Morph ou valor inválido.');
      stop(); assign({ ...weights(), [name]: value });
    },
    preset(values) {
      if (Object.entries(values).some(([name, v]) => !names.includes(name) || !Number.isFinite(v))) {
        throw new Error('Preset contém controle desconhecido ou valor inválido.');
      }
      stop(true); assign(values);
    },
    play(index = 0) {
      if (!clips[index]) throw new Error('Clipe inexistente.');
      stop(true);
      action = mixer.clipAction(clips[index]);
      action.reset().setLoop(LoopOnce, 1); action.clampWhenFinished = true; action.play();
      playing = true;
    },
    dispose() { stop(true); mixer.removeEventListener('finished', onFinished); mixer.uncacheRoot(root); action = null; },
  };
}

export function disposeGltf(gltf) {
  const geometries = new Set(), materials = new Set(), textures = new Set(), images = new Set(), skeletons = new Set();
  for (const scene of gltf.scenes ?? [gltf.scene]) scene.traverse(o => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.skeleton) skeletons.add(o.skeleton);
    for (const material of [].concat(o.material ?? [])) materials.add(material);
  });
  for (const material of materials) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
  for (const texture of textures) {
    const image = texture.source?.data;
    if (image && typeof image.close === 'function') images.add(image);
    texture.dispose();
  }
  for (const image of images) image.close();
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const skeleton of skeletons) skeleton.dispose();
  return { geometries: geometries.size, materials: materials.size, textures: textures.size, imagesClosed: images.size };
}

// Serialized decoding and disposal prevent overlapping decoded models during rapid switches.
export class AssetSlot {
  active = null;
  revision = 0;
  pending = Promise.resolve();
  constructor(dispose) { this.dispose = dispose; }
  clear() {
    this.revision++;
    if (this.active) { this.dispose(this.active); this.active = null; }
  }
  load(prepare, parse) {
    this.clear();
    const revision = this.revision;
    const task = this.pending.then(async () => {
      if (revision !== this.revision) return null;
      const input = await prepare();
      if (revision !== this.revision) return null;
      const value = await parse(input);
      if (revision !== this.revision) { this.dispose(value); return null; }
      this.active = value;
      return value;
    });
    // Do not retain the last decoded asset as a resolved promise value after unload.
    this.pending = task.then(() => undefined, () => undefined);
    return task;
  }
}

export function blankEvaluation(kind, names = [], presets = []) {
  const entries = ids => Object.fromEntries(ids.map(id => [id, { status: 'NOT TESTED', notes: '' }]));
  return { criteria: entries([...CRITERIA.common, ...CRITERIA[kind]].map(([id]) => id)), morphs: entries(names), presets: entries(presets) };
}
