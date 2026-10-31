import { sampleGestureArc } from './hsin-acting-director.mjs';
/**
 * Hsin v1.0.7 — local-only right-hand gesture experiment.
 * No assets, remote calls, external rig or implicit animation.
 *
 * A tap on the actual rendered face defines the target. Damped CCD rotates
 * ONLY the proven contiguous right-arm bone chain. This is diagnostic IK,
 * not a production-ready pose or anatomically validated finger contact.
 */
// PropertyBinding.sanitizeNodeName() in GLTFLoader strips "." and other
// reserved characters: glTF "ORG-Bip001Hand.R" becomes "ORG-Bip001HandR".
// Canonical comparisons also tolerate "_" suffixes and keep sides distinct.
// If duplicate aliases occur, refuse to select rather than guessing a joint.
export function canonicalHsinBoneName(name) {
  return String(name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function resolveHsinBones(boneList, expectedNames) {
  const candidates = new Map();
  for (const bone of boneList) {
    const key = canonicalHsinBoneName(bone.name);
    if (!candidates.has(key)) candidates.set(key, []);
    candidates.get(key).push(bone);
  }
  const resolved = new Map();
  const missing = [];
  const ambiguous = [];
  const matches = {};
  for (const name of expectedNames) {
    const hits = candidates.get(canonicalHsinBoneName(name)) ?? [];
    if (hits.length === 1) {
      resolved.set(name, hits[0]);
      matches[name] = hits[0].name;
    } else if (hits.length === 0) missing.push(name);
    else ambiguous.push({ expected: name, found: hits.map((item) => item.name) });
  }
  return { resolved, missing, ambiguous, matches };
}

export function createHsinGestureLab({ THREE, scene, camera, orbit, canvas, onStatus, invalidate, getFaceMeshes }) {
  const NAMES = {
    // These are the REAL skinned meshes' 823-joint rig (skin 0).
    // The unprefixed Bip001* chain belongs to an unused 498-joint skin.
    clavicle: 'ORG-Bip001Clavicle.R',
    upper: 'ORG-Bip001UpperArm.R',
    forearm: 'ORG-Bip001Forearm.R',
    wrist: 'ORG-Bip001Hand.R',
    fingerBase: 'ORG-Bip001Finger1.R',
    fingerMiddle: 'ORG-Bip001Finger11.R',
    fingerTip: 'ORG-Bip001Finger12.R',
  };
  const LIMITS = [
    [NAMES.wrist, 38],
    [NAMES.forearm, 135],
    [NAMES.upper, 110],
    [NAMES.clavicle, 23],
  ];
  // Hsin's active skin has a second, parallel DEF deformation chain.
  // Both need to move for coherent visible upper-arm and forearm skinning.
  const DEFORM_LINKS = [
    ['ORG-Bip001UpperArm.R', 'DEF-Bip001UpperArm.R'],
    ['ORG-Bip001Forearm.R', 'DEF-Bip001Forearm.R'],
    // Optional secondary acting chains: their exact identities were audited
    // against the user's privately held GLB; none is required for the core IK.
    ['ORG-Bip001Head', 'DEF-Bip001Head'],
    ['ORG-Bip001Finger1.R', 'DEF-Bip001Finger1.R'],
    ['ORG-Bip001Finger11.R', 'DEF-Bip001Finger11.R'],
    ['ORG-Bip001Finger12.R', 'DEF-Bip001Finger12.R'],
    ['ORG-Bip001Finger2.R', 'DEF-Bip001Finger2.R'],
    ['ORG-Bip001Finger3.R', 'DEF-Bip001Finger3.R'],
    ['ORG-Bip001Finger4.R', 'DEF-Bip001Finger4.R'],
  ];
  const ACTOR_EXTRAS = [
    { name: 'ORG-Bip001Head', axis: 'z', maxDegrees: 2.2, role: 'head' },
    { name: 'ORG-Bip001Finger2.R', axis: 'x', maxDegrees: 8, role: 'fingers' },
    { name: 'ORG-Bip001Finger3.R', axis: 'x', maxDegrees: 10, role: 'fingers' },
    { name: 'ORG-Bip001Finger4.R', axis: 'x', maxDegrees: 7, role: 'fingers' },
  ];
  const SOFT_STEP = THREE.MathUtils.degToRad(10);
  const EPSILON = 1e-6;
  const ACTOR_PHASES = [0, .16, .77, 1];
  const ACTING_PROGRESS = {
    clavicle: [0, -.018, .98, 1],
    upper: [0, -.025, .92, 1],
    forearm: [0, 0, .78, 1],
    wrist: [0, 0, .52, 1],
    fingers: [0, 0, .40, 1],
    head: [0, 0, .68, 1],
  };
  // Per-joint temporal staging, not an IK replacement. The final value is
  // exactly the existing validated CCD solution, with optional tiny extras.
  function stagedProgress(normalized, role) {
    const t = Math.max(0, Math.min(1, normalized));
    const values = ACTING_PROGRESS[role] ?? [0, 0, .88, 1];
    let segment = 0;
    while (segment < ACTOR_PHASES.length - 2 && t > ACTOR_PHASES[segment + 1]) segment++;
    const start = ACTOR_PHASES[segment];
    const end = ACTOR_PHASES[segment + 1];
    const local = Math.max(0, Math.min(1, (t - start) / (end - start)));
    const smooth = local * local * (3 - 2 * local);
    return values[segment] + (values[segment + 1] - values[segment]) * smooth;
  }
  const markerGeometry = new THREE.SphereGeometry(0.012, 10, 8);
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffcc70, depthTest: false, depthWrite: false,
    transparent: true, opacity: 0.96, toneMapped: false,
  });
  const marker = new THREE.Mesh(markerGeometry, markerMaterial);
  marker.renderOrder = 10000;
  marker.visible = false;
  scene.add(marker);

  let bones = new Map();
  let matchedBoneNames = {};
  let boneCount = 0;
  let rest = new Map();
  let restWorld = new Map();
  let ready = false;
  let rigMessage = 'Aguardando verificação do rig.';
  let target = null;
  let picking = false;
  let disposed = false;
  let lastError = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  // Motion lasts only for one explicit gesture; never runs continuously.
  // Visibility changes pause its time and rAF, rather than consuming GPU/CPU.
  let motion = null;
  let motionFrame = 0;
  let motionVisible = true;

  function stopMotion() {
    if (motionFrame) cancelAnimationFrame(motionFrame);
    motionFrame = 0;
    motion = null;
  }
  function setVisible(visible) {
    motionVisible = !!visible;
    if (!motionVisible) {
      if (motionFrame) cancelAnimationFrame(motionFrame);
      motionFrame = 0;
      if (motion) motion.lastTime = null;
    } else if (motion) {
      scheduleMotion();
    }
  }
  function scheduleMotion() {
    if (!motion || motionFrame || disposed || !motionVisible ||
        (typeof document !== 'undefined' && document.hidden)) return;
    motionFrame = requestAnimationFrame(stepMotion);
  }
  function stepMotion(now) {
    motionFrame = 0;
    const current = motion;
    if (!current || disposed || !motionVisible ||
        (typeof document !== 'undefined' && document.hidden)) {
      if (current) current.lastTime = null;
      return;
    }
    if (current.lastTime !== null) current.elapsed += Math.max(0, now - current.lastTime);
    current.lastTime = now;
    const t = Math.min(1, current.elapsed / current.duration);
    // Smoothstep: both the raised arm and the return start/stop without snapping.
    const eased = t * t * (3 - 2 * t);
    if (current.spatial) {
      // Each waypoint is solved from the verified neutral rig. This is an
      // experimental CCD trajectory, not a pole-vector or collision solver.
      const { start, end, outward } = current.spatial;
      const waypoint = sampleGestureArc(THREE, start, end, outward, t);
      pose(waypoint, true);
    } else {
      for (const { bone, from, to, role } of current.joints) {
        const progress = current.staged ? stagedProgress(t, role) : eased;
        bone.quaternion.copy(from).slerp(to, progress);
      }
      bones.get(NAMES.clavicle)?.updateWorldMatrix(true, true);
      synchronizeDeformers();
    }
    invalidate();
    if (t >= 1) {
      motion = null;
      current.done?.();
    } else scheduleMotion();
  }
  function playMotion(joints, duration, done, options = {}) {
    stopMotion();
    if (!joints.length) return false;
    const reduce = typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || duration <= 0) {
      for (const { bone, to } of joints) bone.quaternion.copy(to);
      bones.get(NAMES.clavicle)?.updateWorldMatrix(true, true);
      synchronizeDeformers();
      invalidate();
      done?.();
      return false;
    }
    motion = { joints, duration: Math.max(350, Math.min(2400, duration)),
      elapsed: 0, lastTime: null, done, staged: options.staged === true, spatial: options.spatial || null };
    scheduleMotion();
    return true;
  }
  function motionJoints() {
    return LIMITS.map(([name]) => bones.get(name)).filter(Boolean);
  }
  function secondaryJoints(level) {
    if (!(level > 0)) return [];
    return ACTOR_EXTRAS.map((entry) => {
      const bone = bones.get(entry.name);
      if (!bone || !rest.has(bone)) return null;
      const original = rest.get(bone);
      const sign = entry.role === 'head' ? -1 : 1;
      const axis = new THREE.Vector3(
        entry.axis === 'x' ? 1 : 0,
        entry.axis === 'y' ? 1 : 0,
        entry.axis === 'z' ? 1 : 0,
      );
      const delta = new THREE.Quaternion().setFromAxisAngle(
        axis, THREE.MathUtils.degToRad(entry.maxDegrees * level * sign));
      return { bone, target: original.clone().multiply(delta),
        role: entry.role };
    }).filter(Boolean);
  }

  function animateToPose(duration = 1250, options = {}) {
    if (!ready) return { ok: false, message: rigMessage };
    if (!target) return { ok: false, message: 'Primeiro defina um alvo na boca.' };
    stopMotion();
    const joints = motionJoints();
    const useSpatial = options.spatial === true;
    if (useSpatial && joints.some((bone) => !rest.get(bone) || bone.quaternion.angleTo(rest.get(bone)) > .01)) {
      return { ok: false, message: 'Restaure primeiro o braço para comparar a trajetória espacial a partir da pose exportada.' };
    }
    const startTip = useSpatial ? fingertip() : null;
    if (useSpatial && !startTip) return {ok:false, message:'Ponta do indicador indisponível.'};
    const level = Number.isFinite(options.actingLevel) ?
      Math.max(0, Math.min(1, options.actingLevel)) : .55;
    const secondary = secondaryJoints(level);
    const allMoving = [...joints, ...secondary.map((item) => item.bone)];
    const starting = new Map(allMoving.map((bone) => [bone, bone.quaternion.clone()]));
    const startingDeformers = DEFORM_LINKS.map(([, name]) => bones.get(name))
      .filter(Boolean).map((bone) => [bone, bone.quaternion.clone()]);
    // Compute the SAME final pose that already succeeded on Android.
    const result = pose();
    if (!result.ok) return result;
    const solved = new Map(joints.map((bone) => [bone, bone.quaternion.clone()]));
    for (const [bone, quaternion] of [...starting, ...startingDeformers]) {
      bone.quaternion.copy(quaternion);
    }
    bones.get(NAMES.clavicle)?.updateWorldMatrix(true, true);
    const role = new Map([
      [NAMES.clavicle, 'clavicle'],
      [NAMES.upper, 'upper'],
      [NAMES.forearm, 'forearm'],
      [NAMES.wrist, 'wrist'],
    ]);
    const entries = joints.map((bone, index) => ({
      bone, from: starting.get(bone), to: solved.get(bone),
      role: role.get(LIMITS[index][0]),
    }));
    for (const item of secondary) entries.push({
      bone: item.bone, from: starting.get(item.bone), to: item.target, role: item.role,
    });
    const animated = playMotion(entries, duration, () =>
      onStatus('Atuação concluída. Verifique dedos, inclinação da cabeça, cotovelo e contato labial.'),
      { staged: options.staged !== false,
        spatial: useSpatial ? {start:startTip, end:target.clone(), outward:
          new THREE.Vector3(startTip.x < target.x ? -1 : 1, .25, .35).normalize()
            .multiplyScalar(Math.min(.12, startTip.distanceTo(target) * .20))} : null });
    return { ...result, animated,
      message: animated
        ? (useSpatial ? 'Trajetória espacial CCD experimental iniciada · ' : 'Atuação em três etapas iniciada · ') + (duration / 1000).toFixed(2) +
          ' s · intensidade ' + Math.round(level * 100) +
          '%. Observe antecipação, braço, punho, dedos e cabeça.'
        : 'Pose aplicada sem transição por preferência de movimento reduzido.' };
  }
  function animateRestore(duration = 850) {
    if (!ready) return false;
    const joints = [...motionJoints(), ...ACTOR_EXTRAS
      .map((entry) => bones.get(entry.name)).filter(Boolean)];
    const entries = joints.map((bone) => ({
      bone, from: bone.quaternion.clone(), to: rest.get(bone)?.clone(),
    })).filter((entry) => !!entry.to);
    const animated = playMotion(entries, duration, () =>
      onStatus('Braço restaurado suavemente à postura exportada. Alvo preservado.'));
    if (!animated) onStatus('Braço restaurado à postura exportada. Alvo preservado.');
    return true;
  }

  function attach(boneList, originalQuaternions) {
    stopMotion();
    boneCount = boneList.length;
    const expected = [...new Set([...Object.values(NAMES), ...DEFORM_LINKS.flat()])];
    const resolution = resolveHsinBones(boneList, expected);
    // All downstream operations remain keyed by canonical glTF/source aliases.
    // They resolve to the *actual* Three.js Bone instances, never copies.
    bones = resolution.resolved;
    matchedBoneNames = resolution.matches;
    rest = originalQuaternions;
    restWorld.clear();
    ready = false;
    target = null;
    marker.visible = false;
    picking = false;
    orbit.enabled = true;
    lastError = null;
    invalidate();
    const missing = Object.values(NAMES).filter((name) => !bones.has(name));
    const ambiguous = resolution.ambiguous.filter(({ expected }) =>
      Object.values(NAMES).includes(expected));
    if (missing.length || ambiguous.length) {
      rigMessage = 'Falha na resolução de nomes: ' +
        (missing.length ? 'ausentes ' + missing.join(', ') + '. ' : '') +
        (ambiguous.length ? 'ambíguos ' + ambiguous.map((item) => item.expected).join(', ') + '. ' : '') +
        'O loader pode normalizar pontos e outros caracteres. Inspecionados ' +
        boneCount + ' ossos do skin carregado.';
      onStatus(rigMessage);
      return false;
    }
    const hand = bones.get(NAMES.wrist);
    const forearm = bones.get(NAMES.forearm);
    const upper = bones.get(NAMES.upper);
    const clavicle = bones.get(NAMES.clavicle);
    const fb = bones.get(NAMES.fingerBase);
    const fm = bones.get(NAMES.fingerMiddle);
    const ft = bones.get(NAMES.fingerTip);
    if (hand.parent !== forearm || forearm.parent !== upper ||
        upper.parent !== clavicle || fb.parent !== hand ||
        fm.parent !== fb || ft.parent !== fm) {
      rigMessage = 'A hierarquia ORG do skin ativo é diferente da esperada. IK desativado.';
      onStatus(rigMessage);
      return false;
    }
    clavicle.updateWorldMatrix(true, true);
    for (const name of [...Object.values(NAMES), ...DEFORM_LINKS.flat()]) {
      const bone = bones.get(name);
      if (bone) restWorld.set(bone, bone.getWorldQuaternion(new THREE.Quaternion()));
    }
    ready = true;
    rigMessage = DEFORM_LINKS.slice(0, 2).every(([org, def]) => bones.has(org) && bones.has(def)) ?
      'Rig ativo identificado: cadeia ORG e deformadores DEF paralelos.' :
      'Rig ativo identificado, mas faltam deformadores DEF; valide o braço com atenção.';
    rigMessage += ' ' + boneCount + ' joints analisados; braço: ' +
      (matchedBoneNames[NAMES.upper] ?? 'não identificado') + ' → ' +
      (matchedBoneNames[NAMES.forearm] ?? 'não identificado') + ' → ' +
      (matchedBoneNames[NAMES.wrist] ?? 'não identificado') + '.';
    onStatus(rigMessage);
    return true;
  }

  function chooseTarget() {
    if (disposed || !ready) return false;
    stopMotion();
    picking = true;
    orbit.enabled = false;
    canvas.style.cursor = 'crosshair';
    onStatus('Toque no canto dos lábios da Hsin. O alvo será colocado na superfície real da malha facial.');
    return true;
  }
  function cancelTargetSelection() {
    picking = false;
    orbit.enabled = true;
    canvas.style.cursor = '';
  }
  function pointerDown(event) {
    if (!picking || disposed || !event.isPrimary) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const faces = getFaceMeshes().filter((mesh) => mesh.visible);
    const hit = raycaster.intersectObjects(faces, false)[0];
    if (!hit) {
      onStatus('Não encontrei a superfície facial nesse ponto. Enquadre o rosto e toque na região da boca.');
      return;
    }
    // Small camera-facing lift keeps the marker visible and avoids accidental
    // penetration of the face. This offset is visual, not a collision solver.
    const lift = new THREE.Vector3().subVectors(camera.position, hit.point)
      .normalize().multiplyScalar(0.008);
    target = hit.point.clone().add(lift);
    marker.position.copy(target);
    marker.visible = true;
    cancelTargetSelection();
    lastError = null;
    invalidate();
    onStatus('Alvo definido na face. Acione Simular gesto; use Desfazer para restaurar o rig.');
  }
  canvas.addEventListener('pointerdown', pointerDown, true);

  function resetTarget() {
    stopMotion();
    target = null;
    marker.visible = false;
    cancelTargetSelection();
    lastError = null;
    invalidate();
  }
  function getTarget() { return target?.clone() ?? null; }
  function setMarkerVisible(value) {
    marker.visible = !!value && !!target;
    invalidate();
  }
  function fingertip() {
    const middle = bones.get(NAMES.fingerMiddle);
    const distal = bones.get(NAMES.fingerTip);
    if (!middle || !distal) return null;
    const m = middle.getWorldPosition(new THREE.Vector3());
    const d = distal.getWorldPosition(new THREE.Vector3());
    // The fingertip has no explicit terminal bone in the exported skeleton.
    return d.clone().addScaledVector(d.clone().sub(m), 0.70);
  }
  function synchronizeDeformers() {
    // Match the *world-space rotation change* of the real ORG driver to its
    // parallel DEF bone, keeping each DEF rest orientation. Do not copy local
    // quaternions: Rigify exports different parent spaces for these branches.
    for (const [driverName, deformName] of DEFORM_LINKS) {
      const driver = bones.get(driverName);
      const deform = bones.get(deformName);
      if (!driver || !deform || !deform.parent) continue;
      const driverRestWorld = restWorld.get(driver);
      const deformRestWorld = restWorld.get(deform);
      if (!driverRestWorld || !deformRestWorld) continue;
      driver.updateWorldMatrix(true, false);
      const desiredWorld = driver.getWorldQuaternion(new THREE.Quaternion())
        .multiply(driverRestWorld.clone().invert()).multiply(deformRestWorld);
      const parentWorld = deform.parent.getWorldQuaternion(new THREE.Quaternion());
      deform.quaternion.copy(parentWorld.invert().multiply(desiredWorld)).normalize();
      deform.updateWorldMatrix(true, true);
    }
  }
  function resetChain(stop = true) {
    if (stop) stopMotion();
    for (const [name] of LIMITS) {
      const bone = bones.get(name);
      const quaternion = rest.get(bone);
      if (quaternion) bone.quaternion.copy(quaternion);
    }
    for (const { name } of ACTOR_EXTRAS) {
      const bone = bones.get(name);
      const quaternion = rest.get(bone);
      if (quaternion) bone.quaternion.copy(quaternion);
    }
    for (const [, name] of DEFORM_LINKS) {
      const bone = bones.get(name);
      const quaternion = rest.get(bone);
      if (quaternion) bone.quaternion.copy(quaternion);
    }
    bones.get(NAMES.clavicle)?.updateWorldMatrix(true, true);
    lastError = null;
    invalidate();
  }
  function restoreChain() { resetChain(true); }
  function pose(solveTarget = target, duringMotion = false) {
    if (!solveTarget) return { ok: false, message: 'Primeiro escolha um ponto na boca com o botão Definir alvo.' };
    const chain = LIMITS.map(([name, max]) =>
      ({ bone: bones.get(name), limit: THREE.MathUtils.degToRad(max), name }));
    if (chain.some((item) => !item.bone || !rest.get(item.bone))) {
      return { ok: false, message: 'Rig incompleto ou pose original ausente. Não foi aplicado nenhum movimento.' };
    }
    // Each solve starts from the same baseline; never accumulate rotations.
    resetChain(!duringMotion);
    const tip = bones.get(NAMES.fingerTip);
    let iterations = 0;
    for (; iterations < 22; iterations++) {
      let current = fingertip();
      if (!current || current.distanceTo(solveTarget) < 0.012) break;
      for (const { bone, limit } of chain) {
        const joint = bone.getWorldPosition(new THREE.Vector3());
        const currentVec = current.clone().sub(joint);
        const targetVec = solveTarget.clone().sub(joint);
        if (currentVec.lengthSq() < EPSILON || targetVec.lengthSq() < EPSILON) continue;
        const angle = currentVec.angleTo(targetVec);
        if (!Number.isFinite(angle) || angle < 0.0001) continue;
        const axisWorld = currentVec.clone().cross(targetVec);
        if (axisWorld.lengthSq() < EPSILON) continue;
        axisWorld.normalize();
        const parentQ = bone.parent.getWorldQuaternion(new THREE.Quaternion());
        const axisLocal = axisWorld.applyQuaternion(parentQ.invert()).normalize();
        const angleDelta = Math.min(SOFT_STEP, angle * 0.66);
        bone.quaternion.premultiply(
          new THREE.Quaternion().setFromAxisAngle(axisLocal, angleDelta),
        ).normalize();
        const original = rest.get(bone);
        const deviation = original.angleTo(bone.quaternion);
        if (deviation > limit) {
          bone.quaternion.copy(original).slerp(bone.quaternion, limit / deviation);
        }
        bone.updateWorldMatrix(true, true);
        current = fingertip();
      }
    }
    // The IK reaches using the contiguous ORG hand/finger chain. The parallel
    // DEF upper arm and forearm require the same world-space motion.
    synchronizeDeformers();
    const distance = fingertip()?.distanceTo(solveTarget) ?? Infinity;
    lastError = Number.isFinite(distance) ? distance : null;
    invalidate();
    return {
      ok: true, iterations, distance,
      converged: distance <= 0.02,
      message: 'Teste IK: ponta do indicador a ' + distance.toFixed(3) +
        ' unidades do alvo; ' + iterations + ' iterações. Verifique anatomia, cotovelo e clipping.',
    };
  }
  function rotations() {
    return LIMITS.map(([name]) => {
      const bone = bones.get(name);
      if (!bone) return null;
      return { name, quaternion: bone.quaternion.toArray().map((v) => Number(v.toFixed(8))) };
    }).filter(Boolean);
  }
  function restoreRotations(entries) {
    stopMotion();
    if (!Array.isArray(entries) || entries.length > 4) return false;
    const valid = entries.every((entry) =>
      LIMITS.some(([name]) => name === entry?.name) &&
      Array.isArray(entry.quaternion) && entry.quaternion.length === 4 &&
      entry.quaternion.every((value) => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1));
    if (!valid) return false;
    for (const entry of entries) {
      const bone = bones.get(entry.name);
      if (!bone) continue;
      bone.quaternion.fromArray(entry.quaternion).normalize();
    }
    bones.get(NAMES.clavicle)?.updateWorldMatrix(true, true);
    synchronizeDeformers();
    invalidate();
    return true;
  }
  function getDiagnostics() {
    return { ready, picking, rigMessage, boneCount, animating: !!motion,
      elapsedMotionMs: motion?.elapsed ?? null,
      matchedBoneNames: { ...matchedBoneNames },
      secondaryDeformers: DEFORM_LINKS.slice(0, 2).every(([org, def]) => bones.has(org) && bones.has(def)),
      actingDeformers: DEFORM_LINKS.slice(2).filter(([org, def]) => bones.has(org) && bones.has(def)).length,
      target: target?.toArray() ?? null, distance: lastError,
      chain: LIMITS.map(([name, max]) => ({ name, maximumDeviationDegrees: max })),
      actingBones: ACTOR_EXTRAS.filter((entry) => bones.has(entry.name))
        .map((entry) => matchedBoneNames[entry.name]),
    };
  }
  function dispose() {
    if (disposed) return;
    stopMotion();
    disposed = true;
    canvas.removeEventListener('pointerdown', pointerDown, true);
    cancelTargetSelection();
    scene.remove(marker);
    markerGeometry.dispose();
    markerMaterial.dispose();
  }
  return {
    attach, chooseTarget, cancelTargetSelection, resetTarget,
    getTarget, setMarkerVisible, restoreChain, pose, animateToPose, animateRestore,
    stopMotion, setVisible, rotations, restoreRotations, getDiagnostics, dispose,
  };
}
