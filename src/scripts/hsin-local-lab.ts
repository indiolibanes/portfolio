/**
 * Hsin local-file diagnostic lab — no model URLs, uploads, telemetry, or auto-fetch.
 * Assets are only read via File.arrayBuffer() after the user's explicit selection.
 * The HTML includes no proprietary model, textures, or derivative character imagery.
 */
type PresetName = 'exported' | 'neutral' | 'smirk_A' | 'smirk_C' | 'custom';

const FACE_NAMES = [
  'M_Smile_R', 'M_Smile_L', 'E_Smile_R', 'E_Smile_L',
  'E_Squint_R', 'E_Squint_L', 'B_Up_Add_R', 'B_Up_Add_L',
] as const;
const OVERRIDES: Record<'smirk_A' | 'smirk_C', Record<string, number>> = {
  smirk_A: {
    M_Smile_R: .85, M_Smile_L: .32,
    E_Smile_R: .48, E_Smile_L: .20,
    E_Squint_R: .25, E_Squint_L: .08,
  },
  smirk_C: {
    M_Smile_R: 1, M_Smile_L: .12,
    E_Squint_R: .20, E_Squint_L: .07, B_Up_Add_R: .35,
  },
};

const root = document.querySelector<HTMLElement>('[data-hsin-lab]');
if (root) {
  void initializeLab(root).catch((error: unknown) => {
    console.error('Hsin lab setup failed', error);
    const status = root.querySelector<HTMLElement>('[data-hsin-status]');
    if (status) status.textContent = 'Falha ao iniciar a bancada. Verifique o console.';
  });
}

async function initializeLab(root: HTMLElement) {
  const q = <T extends HTMLElement>(selector: string): T => {
    const result = root.querySelector<T>(selector);
    if (!result) throw new Error('Controle ausente: ' + selector);
    return result;
  };
  const fileInput = q<HTMLInputElement>('[data-hsin-file]');
  const viewport = q<HTMLDivElement>('[data-hsin-viewport]');
  const placeholder = q<HTMLDivElement>('[data-hsin-placeholder]');
  const status = q<HTMLElement>('[data-hsin-status]');
  const summary = q<HTMLElement>('[data-hsin-summary]');
  const preset = q<HTMLSelectElement>('[data-hsin-preset]');
  const morphPanel = q<HTMLElement>('[data-hsin-morphs]');
  const btnRestoreFace = q<HTMLButtonElement>('[data-hsin-restore-face]');
  const btnRestoreBones = q<HTMLButtonElement>('[data-hsin-restore-bones]');
  const btnFull = q<HTMLButtonElement>('[data-hsin-full]');
  const btnFace = q<HTMLButtonElement>('[data-hsin-face]');
  const btnShot = q<HTMLButtonElement>('[data-hsin-shot]');
  const btnReport = q<HTMLButtonElement>('[data-hsin-report]');
  const boneFilter = q<HTMLInputElement>('[data-hsin-bone-search]');
  const boneSelect = q<HTMLSelectElement>('[data-hsin-bone]');
  const axes = [...root.querySelectorAll<HTMLInputElement>('[data-hsin-axis]')];
  const metric = q<HTMLElement>('[data-hsin-fps]');
  const renderModeSelect = q<HTMLSelectElement>('[data-hsin-render-mode]');
  const frontButton = q<HTMLButtonElement>('[data-hsin-front]');
  const rearButton = q<HTMLButtonElement>('[data-hsin-rear]');
  const materialSummary = q<HTMLElement>('[data-hsin-material-summary]');

  type ThreeModule = typeof import('three');
  type GLTF = import('three/addons/loaders/GLTFLoader.js').GLTF;
  type Skinned = import('three').SkinnedMesh;
  type Bone = import('three').Bone;

  let THREE: ThreeModule | null = null;
  let renderer: import('three').WebGLRenderer | null = null;
  let scene: import('three').Scene | null = null;
  let camera: import('three').PerspectiveCamera | null = null;
  let orbit: import('three/addons/controls/OrbitControls.js').OrbitControls | null = null;
  let loader: import('three/addons/loaders/GLTFLoader.js').GLTFLoader | null = null;
  let model: GLTF | null = null;
  let skinned: Skinned[] = [];
  let bones: Bone[] = [];
  let initialMorphs = new Map<Skinned, number[]>();
  let initialQuaternions = new Map<Bone, import('three').Quaternion>();
  let modifiedBoneAxes = new Map<Bone, { x: number; y: number; z: number }>();
  let morphValues = new Map<string, number>();
  let selectedBone: Bone | null = null;
  let renderMode: 'original' | 'opaque' | 'clay' | 'normals' = 'original';
  let cameraDirection: 1 | -1 = 1;
  let viewFocus: 'full' | 'face' = 'full';
  const originalMaterials = new Map<Skinned, import('three').Material | import('three').Material[]>();
  const diagnosticMaterials = new Set<import('three').Material>();
  let fileMetadata: { name: string; bytes: number } | null = null;
  let currentPreset: PresetName = 'exported';
  let frame = 0;
  let visible = true;
  let lost = false;
  let destroyed = false;
  let renderTime = 0;
  let fit: { center: import('three').Vector3; size: number } | null = null;

  const setStatus = (value: string) => { status.textContent = value; };
  const buttons = [btnRestoreFace, btnRestoreBones, btnFull, btnFace, btnShot, btnReport, frontButton, rearButton];
  const enableControls = (enabled: boolean) => {
    buttons.forEach((b) => { b.disabled = !enabled; });
    preset.disabled = !enabled;
    renderModeSelect.disabled = !enabled;
    boneFilter.disabled = !enabled;
    boneSelect.disabled = !enabled;
    axes.forEach((input) => { input.disabled = !enabled || !selectedBone; });
  };

  // Render on demand: no permanent animation loop, no battery drain when idle.
  const draw = () => {
    frame = 0;
    if (!renderer || !scene || !camera || !visible || document.hidden || lost || destroyed) return;
    const before = performance.now();
    renderer.render(scene, camera);
    renderTime = performance.now() - before;
    metric.textContent = 'Quadro: ' + renderTime.toFixed(1) + ' ms (não é FPS)';
  };
  const invalidate = () => {
    if (!frame && visible && !document.hidden && !lost && !destroyed) frame = requestAnimationFrame(draw);
  };
  const onVisibility = () => invalidate();
  const onPagehide = () => {
    destroyed = true;
    cancelAnimationFrame(frame);
    cleanupModel();
    orbit?.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
    resizeObserver?.disconnect();
    intersectionObserver?.disconnect();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPagehide, { once: true });

  let resizeObserver: ResizeObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;

  async function prepare3D() {
    if (renderer) return;
    setStatus('Preparando Three.js e WebGL…');
    const [three, { GLTFLoader }, { OrbitControls }] = await Promise.all([
      import('three'),
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/controls/OrbitControls.js'),
    ]);
    THREE = three;
    loader = new GLTFLoader();
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, alpha: false, preserveDrawingBuffer: true,
      powerPreference: 'low-power',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x182237, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // The source declares all character materials as KHR_materials_unlit:
    // ACES tonemapping distorts their base colors and cannot reconstruct absent shaders.
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 2.0));
    const key = new THREE.DirectionalLight(0xffe3b4, 2.8);
    key.position.set(2, 6, 8);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9dbdf5, 1.8);
    fill.position.set(-4, 3, -5);
    scene.add(fill);
    camera = new THREE.PerspectiveCamera(34, 1, .015, 5000);
    camera.position.set(0, 1.5, 5);
    orbit = new OrbitControls(camera, canvas);
    orbit.enableDamping = false;
    orbit.enablePan = true;
    orbit.minDistance = .06;
    orbit.maxDistance = 1000;
    orbit.addEventListener('change', invalidate);
    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      lost = true;
      cancelAnimationFrame(frame); frame = 0;
      setStatus('Contexto WebGL perdido. Aguarde a restauração ou recarregue.');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      lost = false;
      setStatus('Contexto WebGL restaurado.');
      invalidate();
    });
    placeholder.hidden = true;
    viewport.appendChild(canvas);
    const resize = () => {
      if (!renderer || !camera || destroyed) return;
      const w = Math.max(1, viewport.clientWidth);
      const h = Math.max(1, viewport.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      invalidate();
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(viewport);
    intersectionObserver = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      if (!visible) { cancelAnimationFrame(frame); frame = 0; }
      else invalidate();
    }, { threshold: .01 });
    intersectionObserver.observe(viewport);
    resize();
  }

  // Restrict GLB assets to embedded buffers/textures so selecting a file cannot
  // silently trigger requests for external model dependencies or asset URLs.
  function validateGlb(buffer: ArrayBuffer) {
    const dv = new DataView(buffer);
    if (buffer.byteLength < 20 ||
        dv.getUint32(0, true) !== 0x46546c67 ||
        dv.getUint32(4, true) !== 2 ||
        dv.getUint32(8, true) !== buffer.byteLength ||
        dv.getUint32(16, true) !== 0x4e4f534a) {
      throw new Error('Arquivo GLB 2.0 inválido ou incompleto.');
    }
    const size = dv.getUint32(12, true);
    if (20 + size > buffer.byteLength) throw new Error('Cabeçalho JSON inválido.');
    const document = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, size)));
    const references = [...(document.images || []), ...(document.buffers || [])];
    for (const entry of references) {
      if (entry.uri && !String(entry.uri).startsWith('data:')) {
        throw new Error('Este GLB contém dependências externas e foi bloqueado para evitar solicitações de rede.');
      }
    }
  }

  function clearDiagnosticMaterials() {
    // Restore original assignments before releasing temporary diagnostic materials.
    originalMaterials.forEach((original, mesh) => { mesh.material = original; });
    diagnosticMaterials.forEach((material) => material.dispose());
    diagnosticMaterials.clear();
  }

  function updateMaterialSummary() {
    if (!THREE) return;
    const all = new Set<import('three').Material>();
    originalMaterials.forEach((assigned) => {
      (Array.isArray(assigned) ? assigned : [assigned]).forEach((material) => all.add(material));
    });
    const unlit = [...all].filter((material) => material instanceof THREE!.MeshBasicMaterial).length;
    const blend = [...all].filter((material) => material.transparent).length;
    const missingMaps = [...all].filter((material) =>
      /face|eye/i.test(material.name) &&
      (!(material instanceof THREE!.MeshBasicMaterial) || !material.map)).map((m) => m.name);
    materialSummary.textContent =
      all.size + ' materiais distintos; ' + unlit + ' sem iluminação (unlit); ' +
      blend + ' com transparência. ' +
      (missingMaps.length ? 'Sem textura de cor incorporada: ' + missingMaps.join(', ') + '. ' : '') +
      'Uma silhueta não comprova fidelidade dos shaders.';
  }

  function applyRenderMode(mode: typeof renderMode) {
    if (!THREE || !model) return;
    clearDiagnosticMaterials();
    renderMode = mode;
    renderModeSelect.value = mode;
    if (mode !== 'original') {
      originalMaterials.forEach((original, mesh) => {
        const transform = (source: import('three').Material): import('three').Material => {
          let material: import('three').Material;
          if (mode === 'opaque') {
            material = source.clone();
            // Diagnostic alpha cutout, retaining the color maps where present.
            // This can alter the appearance of hair and cloth; it is NOT a fidelity fix.
            material.transparent = false;
            material.alphaTest = .18;
            material.depthWrite = true;
            material.opacity = 1;
            material.side = THREE!.DoubleSide;
            material.blending = THREE!.NormalBlending;
          } else if (mode === 'normals') {
            material = new THREE!.MeshNormalMaterial({ side: THREE!.DoubleSide });
          } else {
            material = new THREE!.MeshStandardMaterial({
              color: 0xd1b5bd, roughness: .93, metalness: 0,
              side: THREE!.DoubleSide,
            });
          }
          material.needsUpdate = true;
          diagnosticMaterials.add(material);
          return material;
        };
        mesh.material = Array.isArray(original) ? original.map(transform) : transform(original);
      });
    }
    invalidate();
  }

  function cleanupModel() {
    if (!THREE || !model || !scene) return;
    clearDiagnosticMaterials();
    scene.remove(model.scene);
    const geometries = new Set<import('three').BufferGeometry>();
    const materials = new Set<import('three').Material>();
    const textures = new Set<import('three').Texture>();
    const skeletons = new Set<import('three').Skeleton>();
    model.scene.traverse((item) => {
      if (!(item instanceof THREE!.Mesh)) return;
      geometries.add(item.geometry);
      const all = Array.isArray(item.material) ? item.material : [item.material];
      all.forEach((material) => {
        materials.add(material);
        // Includes maps such as map, normalMap, emissiveMap and custom texture slots.
        for (const value of Object.values(material)) {
          if (value instanceof THREE!.Texture) textures.add(value);
        }
      });
      if (item instanceof THREE!.SkinnedMesh) skeletons.add(item.skeleton);
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
    skeletons.forEach((s) => s.dispose());
    model = null;
    originalMaterials.clear();
    skinned = [];
    bones = [];
    fit = null;
    initialMorphs.clear();
    initialQuaternions.clear();
    modifiedBoneAxes.clear();
    morphValues.clear();
    selectedBone = null;
  }

  function getMorph(name: string): number | null {
    for (const mesh of skinned) {
      const index = mesh.morphTargetDictionary?.[name];
      if (index !== undefined && mesh.morphTargetInfluences) {
        return mesh.morphTargetInfluences[index] ?? 0;
      }
    }
    return null;
  }

  function putMorph(name: string, weight: number) {
    const safe = Math.min(1, Math.max(-1, weight));
    skinned.forEach((mesh) => {
      const index = mesh.morphTargetDictionary?.[name];
      if (index !== undefined && mesh.morphTargetInfluences) {
        mesh.morphTargetInfluences[index] = safe;
      }
    });
    morphValues.set(name, safe);
    invalidate();
  }

  function resetMorphs() {
    initialMorphs.forEach((baseline, mesh) => {
      if (!mesh.morphTargetInfluences) return;
      for (let i = 0; i < Math.min(baseline.length, mesh.morphTargetInfluences.length); i++) {
        mesh.morphTargetInfluences[i] = baseline[i];
      }
    });
    morphValues.clear();
    for (const name of FACE_NAMES) {
      const value = getMorph(name);
      if (value !== null) morphValues.set(name, value);
    }
    invalidate();
  }

  function applyPreset(name: PresetName) {
    if (!skinned.length) return;
    if (name === 'neutral') {
      skinned.forEach((mesh) => mesh.morphTargetInfluences?.fill(0));
    } else {
      resetMorphs();
      if (name === 'smirk_A' || name === 'smirk_C') {
        Object.entries(OVERRIDES[name]).forEach(([key, value]) => putMorph(key, value));
      }
    }
    for (const target of FACE_NAMES) {
      const current = getMorph(target);
      if (current !== null) morphValues.set(target, current);
    }
    currentPreset = name;
    preset.value = name;
    rebuildMorphPanel();
    invalidate();
  }

  function rebuildMorphPanel() {
    morphPanel.replaceChildren();
    let found = 0;
    FACE_NAMES.forEach((name) => {
      const value = getMorph(name);
      if (value === null) return;
      found += 1;
      const section = document.createElement('div');
      section.className = 'hsin-lab__morph';
      const line = document.createElement('div');
      line.className = 'hsin-lab__morphline';
      const label = document.createElement('label');
      const id = 'morph-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      label.htmlFor = id;
      label.textContent = name;
      const output = document.createElement('output');
      output.textContent = value.toFixed(2);
      const slider = document.createElement('input');
      slider.type = 'range'; slider.min = '-1'; slider.max = '1';
      slider.step = '.01'; slider.value = String(value); slider.id = id;
      slider.setAttribute('aria-label', name);
      slider.addEventListener('input', () => {
        const next = Number(slider.value);
        output.textContent = next.toFixed(2);
        putMorph(name, next);
        currentPreset = 'custom'; preset.value = 'custom';
      });
      line.append(label, output);
      section.append(line, slider);
      morphPanel.append(section);
    });
    if (!found) {
      const note = document.createElement('p');
      note.className = 'hsin-lab__small';
      note.textContent = 'Morph targets procurados não encontrados; não é possível comparar estes presets.';
      morphPanel.append(note);
    }
  }

  function populateBones(filter: string) {
    const previousName = selectedBone?.name ?? '';
    boneSelect.replaceChildren();
    const empty = new Option('Selecione um osso', '');
    boneSelect.add(empty);
    const priority = /(hand|finger|index|thumb|arm|wrist|head|neck|spine|shoulder)/i;
    const candidates = [...bones].sort((a, b) =>
      Number(priority.test(b.name)) - Number(priority.test(a.name)) || a.name.localeCompare(b.name));
    const matches = candidates.filter((bone) => bone.name.toLowerCase().includes(filter.toLowerCase()));
    matches.slice(0, 100).forEach((bone) => boneSelect.add(new Option(bone.name, bone.uuid)));
    const previousStillPresent = matches.some((bone) => bone.name === previousName);
    selectedBone = previousStillPresent ? matches.find((bone) => bone.name === previousName)! : null;
    boneSelect.value = selectedBone?.uuid ?? '';
    syncBoneAxes();
  }

  function syncBoneAxes() {
    const state = selectedBone ? modifiedBoneAxes.get(selectedBone) : null;
    for (const axis of axes) {
      const key = axis.dataset.hsinAxis as 'x' | 'y' | 'z';
      const degrees = state?.[key] ?? 0;
      axis.value = String(degrees);
      axis.disabled = !selectedBone;
      const output = root.querySelector<HTMLOutputElement>('[data-hsin-out-' + key + ']');
      if (output) output.textContent = degrees + '°';
    }
  }

  function setBoneAxis(bone: Bone, axis: 'x' | 'y' | 'z', degrees: number) {
    if (!THREE) return;
    const rest = initialQuaternions.get(bone);
    if (!rest) return;
    const state = modifiedBoneAxes.get(bone) ?? { x: 0, y: 0, z: 0 };
    state[axis] = degrees;
    modifiedBoneAxes.set(bone, state);
    const toRad = Math.PI / 180;
    const delta = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(state.x * toRad, state.y * toRad, state.z * toRad, 'XYZ'),
    );
    bone.quaternion.copy(rest).multiply(delta);
    bone.updateMatrixWorld(true);
    invalidate();
  }

  function restoreBones() {
    initialQuaternions.forEach((quaternion, bone) => { bone.quaternion.copy(quaternion); });
    modifiedBoneAxes.clear();
    selectedBone?.updateMatrixWorld(true);
    syncBoneAxes();
    invalidate();
  }

  function frameModel(zoom: 'full' | 'face') {
    if (!THREE || !model || !camera || !orbit) return;
    const bounds = new THREE.Box3();
    if (zoom === 'face') {
      const face = skinned.filter((mesh) => {
        const count = mesh.geometry.getAttribute('position')?.count;
        return count === 4320 || /face|head/i.test(mesh.name);
      });
      face.forEach((mesh) => bounds.expandByObject(mesh, true));
      if (bounds.isEmpty()) {
        const head = bones.find((bone) => /(^|[_-])head($|[_-])/i.test(bone.name));
        if (head) {
          const position = new THREE.Vector3();
          head.getWorldPosition(position);
          const radius = (fit?.size ?? 2) * .095;
          bounds.setFromCenterAndSize(position, new THREE.Vector3(radius, radius, radius));
        }
      }
    }
    if (bounds.isEmpty()) {
      skinned.forEach((mesh) => bounds.expandByObject(mesh, true));
    }
    if (bounds.isEmpty()) {
      bounds.expandByObject(model.scene, true);
    }
    if (bounds.isEmpty()) throw new Error('Não foi possível enquadrar as malhas.');
    const center = bounds.getCenter(new THREE.Vector3());
    const sizes = bounds.getSize(new THREE.Vector3());
    const size = Math.max(sizes.x, sizes.y, sizes.z, .005);
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const vertical = size / (2 * Math.tan(fov / 2));
    const horizontal = vertical / Math.max(.6, camera.aspect);
    const distance = Math.max(vertical, horizontal) * (zoom === 'face' ? 1.6 : 1.42);
    viewFocus = zoom;
    const direction = new THREE.Vector3(0, .08, cameraDirection).normalize();
    camera.position.copy(center).addScaledVector(direction, distance);
    camera.near = Math.max(.001, distance / 500);
    camera.far = Math.max(distance * 30, 20);
    camera.updateProjectionMatrix();
    orbit.target.copy(center);
    orbit.minDistance = Math.max(.03, size / 50);
    orbit.maxDistance = Math.max(size * 50, 25);
    orbit.update();
    if (zoom === 'full') fit = { center, size };
    invalidate();
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    fileInput.disabled = true;
    enableControls(false);
    setStatus('Lendo GLB local (' + (file.size / 1048576).toFixed(1) + ' MiB). Nenhum upload será realizado…');
    try {
      if (!file.name.toLowerCase().endsWith('.glb')) throw new Error('Selecione um arquivo .glb.');
      const bytes = await file.arrayBuffer();
      validateGlb(bytes);
      await prepare3D();
      if (!loader || !scene || !THREE) throw new Error('Three.js não disponível.');
      setStatus('Interpretando malhas, rig e texturas incorporadas…');
      const parsed = await new Promise<GLTF>((resolve, reject) => {
        loader!.parse(bytes, '', resolve, reject);
      });
      cleanupModel();
      model = parsed;
      fileMetadata = { name: file.name, bytes: file.size };
      scene.add(parsed.scene);
      parsed.scene.traverse((item) => {
        if (item instanceof THREE!.SkinnedMesh) {
          skinned.push(item);
          originalMaterials.set(item, item.material);
          if (item.morphTargetInfluences) {
            initialMorphs.set(item, [...item.morphTargetInfluences]);
          }
        }
      });
      const distinctBones = new Set<Bone>();
      skinned.forEach((mesh) => mesh.skeleton.bones.forEach((bone) => distinctBones.add(bone)));
      bones = [...distinctBones];
      bones.forEach((bone) => initialQuaternions.set(bone, bone.quaternion.clone()));
      const option = preset.querySelector('option[value="custom"]');
      if (!option) preset.add(new Option('Ajuste manual', 'custom'));
      selectedBone = null;
      resetMorphs();
      populateBones('');
      applyPreset('exported');
      renderMode = 'original';
      renderModeSelect.value = 'original';
      cameraDirection = 1;
      enableControls(true);
      updateMaterialSummary();
      frameModel('full');
      const names = new Set(skinned.flatMap((mesh) => Object.keys(mesh.morphTargetDictionary ?? {})));
      summary.textContent =
        skinned.length + ' SkinnedMesh · ' + bones.length +
        ' ossos distintos · ' + names.size + ' morphs nomeados. ' +
        'Renderização e articulação ainda exigem revisão visual.';
      setStatus('GLB em memória. Se houver apenas silhueta, teste Opacidade diagnóstica e Argila; experimente Frente/Trás.');
    } catch (error) {
      console.error('Hsin GLB load failed', error);
      setStatus('Falha: ' + (error instanceof Error ? error.message : String(error)));
      enableControls(Boolean(model));
    } finally {
      fileInput.disabled = false;
      // Do not retain the chosen File in the DOM after load.
      fileInput.value = '';
    }
  });

  preset.addEventListener('change', () => applyPreset(preset.value as PresetName));
  btnRestoreFace.addEventListener('click', () => applyPreset('exported'));
  btnRestoreBones.addEventListener('click', restoreBones);
  btnFull.addEventListener('click', () => frameModel('full'));
  btnFace.addEventListener('click', () => frameModel('face'));
  frontButton.addEventListener('click', () => { cameraDirection = 1; frameModel(viewFocus); });
  rearButton.addEventListener('click', () => { cameraDirection = -1; frameModel(viewFocus); });
  renderModeSelect.addEventListener('change', () => {
    applyRenderMode(renderModeSelect.value as typeof renderMode);
  });
  boneFilter.addEventListener('input', () => populateBones(boneFilter.value));
  boneSelect.addEventListener('change', () => {
    selectedBone = bones.find((b) => b.uuid === boneSelect.value) ?? null;
    syncBoneAxes();
  });
  axes.forEach((axis) => axis.addEventListener('input', () => {
    if (!selectedBone) return;
    const key = axis.dataset.hsinAxis as 'x' | 'y' | 'z';
    setBoneAxis(selectedBone, key, Number(axis.value));
    const out = root.querySelector<HTMLOutputElement>('[data-hsin-out-' + key + ']');
    if (out) out.textContent = axis.value + '°';
  }));

  btnShot.addEventListener('click', () => {
    if (!renderer || !scene || !camera || lost) return;
    renderer.render(scene, camera);
    renderer.domElement.toBlob((blob) => {
      if (blob) downloadBlob(blob, 'hsin-local-' + currentPreset + '.png');
      else setStatus('Não foi possível gerar a captura. Verifique o contexto WebGL.');
    }, 'image/png');
  });

  btnReport.addEventListener('click', () => {
    if (!fileMetadata) return;
    const changes = [...modifiedBoneAxes.entries()].filter(([, v]) =>
      Math.abs(v.x) + Math.abs(v.y) + Math.abs(v.z) > 0).map(([bone, degrees]) =>
      ({ name: bone.name, degrees }));
    const data = {
      schemaVersion: '1.0', gate: 'VISUAL_REVIEW_REQUIRED',
      privacy: 'Local-file diagnosis, no mesh or image data included',
      source: fileMetadata, capturedAt: new Date().toISOString(),
      preset: currentPreset,
      renderMode, cameraDirection: cameraDirection === 1 ? '+Z' : '-Z',
      materials: materialSummary.textContent,
      face: Object.fromEntries(
        FACE_NAMES.filter((name) => getMorph(name) !== null).map((name) => [name, getMorph(name)]),
      ),
      bones: { total: bones.length, changed: changes },
      skinnedMeshes: skinned.length, renderFrameMs: renderTime,
      note: 'Render duration is not FPS or mobile performance verification.',
    };
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      'hsin-local-diagnostic.json');
  });
}
