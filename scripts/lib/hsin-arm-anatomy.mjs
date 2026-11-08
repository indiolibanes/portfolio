/**
 * Hsin Combat R2.0.1 — arm anatomy for the offline bake and the QA harness. Never imported by the stage.
 *
 * Rig facts this module relies on (measured from hsin-v2.0.glb, see docs/hsin-combat-r201/diagnosis.md):
 *  - ORG chain Clavicle → UpperArm → Forearm → Hand drives; DEF mirrors it through split bones
 *    DEF-UpperArm → DEF-UpperArm.001 → DEF-Forearm → DEF-Forearm.001 → DEF-Hand.
 *  - Skin: upper arm on DEF-UpperArm / DEF-UpperArm.001, the whole forearm on DEF-Forearm.001, hand and palm on ORG-Hand.
 *  - Bones point along local +Y. The elbow's rest bend is a rotation about the forearm's local +X: that is the hinge.
 * Every measurement here is in model world space (metres, degrees) unless a name says local.
 */
export const SIDES = Object.freeze(['R', 'L']);
const DEG = 180 / Math.PI;

export function armNames(side) {
  return {
    clav: 'ORG-Bip001Clavicle' + side, upper: 'ORG-Bip001UpperArm' + side, fore: 'ORG-Bip001Forearm' + side, hand: 'ORG-Bip001Hand' + side,
    defClav: 'DEF-Bip001Clavicle' + side, defUpper: 'DEF-Bip001UpperArm' + side, defUpper2: 'DEF-Bip001UpperArm' + side + '001',
    defFore: 'DEF-Bip001Forearm' + side, defFore2: 'DEF-Bip001Forearm' + side + '001', defHand: 'DEF-Bip001Hand' + side,
    index: 'ORG-Bip001Finger1' + side, pinky: 'ORG-Bip001Finger4' + side, midBase: 'ORG-Bip001Finger2' + side, midTip: 'ORG-Bip001Finger22' + side,
  };
}

/** Rest geometry of one arm, captured once from the presentation reference. */
export function measureArmRest(T, by, side) {
  const n = armNames(side), need = Object.values(n).filter(x => !by.get(x));
  if (need.length) throw Error('Missing arm bones: ' + need.join(', '));
  const P = k => by.get(n[k]).getWorldPosition(new T.Vector3()), Q = k => by.get(n[k]).getWorldQuaternion(new T.Quaternion()).normalize();
  const S = P('upper'), E = P('fore'), W = P('hand'), C = P('clav');
  const u = E.clone().sub(S).normalize(), f = W.clone().sub(E).normalize();
  const hinge = new T.Vector3(1, 0, 0).applyQuaternion(Q('upper')), normal = u.clone().cross(f).normalize();
  const sigma = Math.sign(hinge.dot(normal)) || 1;
  const handQ = Q('hand'), inv = handQ.clone().invert();
  const fingerWorld = P('midBase').sub(W).normalize(), across = P('index').sub(P('pinky')).normalize();
  let palm = fingerWorld.clone().cross(across).normalize();
  // Palm side is where the resting fingers curl.
  const curl = P('midTip').sub(P('midBase')); curl.addScaledVector(fingerWorld, -curl.dot(fingerWorld));
  if (curl.lengthSq() > 1e-10 && palm.dot(curl) < 0) palm.negate();
  const spine = by.get('ORG-Bip001Spine2').getWorldQuaternion(new T.Quaternion()).normalize();
  return {
    side, names: n, S, E, W, C, l1: S.distanceTo(E),
    clavicleSpineLocal: S.clone().sub(C).normalize().applyQuaternion(spine.clone().invert()),
    handOverDistalForearm: Q('defFore2').invert().multiply(handQ.clone()), l2: E.distanceTo(W), flex: Math.acos(Math.min(1, u.dot(f))) * DEG, sigma,
    hingeOffPlaneDegrees: Math.acos(Math.min(1, Math.abs(hinge.dot(normal)))) * DEG,
    world: Object.fromEntries(['clav', 'upper', 'fore', 'hand', 'defClav', 'defUpper', 'defUpper2', 'defFore', 'defFore2', 'defHand'].map(k => [k, Q(k)])),
    local: Object.fromEntries(['clav', 'upper', 'fore', 'hand', 'defUpper2', 'defFore2'].map(k => [k, by.get(n[k]).quaternion.clone()])),
    fingerLocal: fingerWorld.clone().applyQuaternion(inv), palmLocal: palm.clone().applyQuaternion(inv),
    defDistances: {upper: by.get(n.defUpper).getWorldPosition(new T.Vector3()).distanceTo(by.get(n.defFore).getWorldPosition(new T.Vector3())), fore: by.get(n.defFore).getWorldPosition(new T.Vector3()).distanceTo(by.get(n.defHand).getWorldPosition(new T.Vector3()))},
  };
}

/** Swing–twist split of q about unit axis (local). Returns twist angle in degrees and swing angle in degrees. */
export function swingTwist(T, q, axis) {
  const p = new T.Vector3(q.x, q.y, q.z), proj = axis.clone().multiplyScalar(p.dot(axis));
  const twist = new T.Quaternion(proj.x, proj.y, proj.z, q.w);
  if (twist.lengthSq() < 1e-12) twist.set(0, 0, 0, 1); else twist.normalize();
  const swing = q.clone().multiply(twist.clone().invert());
  const ang = x => { const w = Math.min(1, Math.abs(x.w)); return 2 * Math.acos(w) * DEG; };
  const sign = Math.sign(new T.Vector3(twist.x, twist.y, twist.z).dot(axis) * (twist.w < 0 ? -1 : 1)) || 1;
  return {twistDegrees: sign * ang(twist), swingDegrees: ang(swing)};
}

/**
 * Per-frame anatomical state of one arm. `rest` from measureArmRest on the same rig in the reference pose.
 * No thresholds here: the test and the diagnosis decide.
 */
export function armState(T, by, rest) {
  const n = rest.names, P = k => by.get(n[k]).getWorldPosition(new T.Vector3()), Q = k => by.get(n[k]).getWorldQuaternion(new T.Quaternion()).normalize();
  const S = P('upper'), E = P('fore'), W = P('hand'), C = P('clav');
  const u = E.clone().sub(S), f = W.clone().sub(E), l1 = u.length(), l2 = f.length(); u.normalize(); f.normalize();
  const hinge = new T.Vector3(1, 0, 0).applyQuaternion(Q('upper')), cross = u.clone().cross(f), sinA = cross.length();
  const signedFlex = Math.atan2(cross.dot(hinge) * rest.sigma, u.dot(f)) * DEG;
  const offPlane = sinA > Math.sin(8 / DEG) ? Math.acos(Math.min(1, Math.abs(hinge.dot(cross.normalize())))) * DEG : 0;
  const Y = new T.Vector3(0, 1, 0);
  const foreLocal = rest.local.fore.clone().invert().multiply(by.get(n.fore).quaternion).normalize(), foreSplit = swingTwist(T, foreLocal, Y);
  // The axis of a near-identity rotation is noise: judge the hinge direction only once the forearm has moved 3°.
  const foreSwingAxis = new T.Vector3(foreLocal.x, foreLocal.y, foreLocal.z), foreAngle = 2 * Math.acos(Math.min(1, Math.abs(foreLocal.w))) * DEG;
  const foreSwingOffHinge = foreAngle > 3 && foreSwingAxis.lengthSq() > 1e-12 ? Math.acos(Math.min(1, Math.abs(foreSwingAxis.normalize().x))) * DEG : 0;
  const handLocal = rest.local.hand.clone().invert().multiply(by.get(n.hand).quaternion).normalize(), handSplit = swingTwist(T, handLocal, Y);
  const fore2 = swingTwist(T, rest.local.defFore2.clone().invert().multiply(by.get(n.defFore2).quaternion).normalize(), Y);
  // Clavicle motion relative to the chest that carries it (a torso yaw is not a shoulder shrug).
  const spineQ = by.get('ORG-Bip001Spine2').getWorldQuaternion(new T.Quaternion()).normalize();
  const clavElevation = Math.acos(Math.min(1, S.clone().sub(C).normalize().applyQuaternion(spineQ.clone().invert()).dot(rest.clavicleSpineLocal))) * DEG;
  const overDistal = rest.handOverDistalForearm.clone().invert().multiply(Q('defFore2').invert().multiply(Q('hand'))).normalize(), wristOverSkin = swingTwist(T, overDistal, Y);
  const handQ = Q('hand'), finger = rest.fingerLocal.clone().applyQuaternion(handQ), palm = rest.palmLocal.clone().applyQuaternion(handQ);
  const tip = P('midTip');
  const dS = by.get(n.defUpper).getWorldPosition(new T.Vector3()), dE = by.get(n.defFore).getWorldPosition(new T.Vector3()), dW = by.get(n.defHand).getWorldPosition(new T.Vector3());
  return {
    S, E, W, C, tip, u, f, finger, palm,
    lengthDeltaMm: {upper: (l1 - rest.l1) * 1000, fore: (l2 - rest.l2) * 1000, defUpper: (dS.distanceTo(dE) - rest.defDistances.upper) * 1000, defFore: (dE.distanceTo(dW) - rest.defDistances.fore) * 1000},
    orgDefGapMm: Math.max(S.distanceTo(dS), E.distanceTo(dE), W.distanceTo(dW)) * 1000,
    signedFlexDegrees: signedFlex, hingeOffPlaneDegrees: offPlane,
    forearmTwistDegrees: foreSplit.twistDegrees, forearmSwingOffHingeDegrees: foreSwingOffHinge,
    // Pronation is a forearm rotation; on this rig it is shared by the distal forearm skin bone and the hand.
    wristSwingDegrees: handSplit.swingDegrees, pronationDegrees: handSplit.twistDegrees, wristTwistDegrees: wristOverSkin.twistDegrees, distalForearmTwistDegrees: fore2.twistDegrees,
    // How far the hand deviates from continuing the forearm: 0 = straight line elbow→wrist→fingers.
    wristBendDegrees: Math.acos(Math.max(-1, Math.min(1, f.dot(finger)))) * DEG,
    clavicleDegrees: clavElevation,
    elevationDegrees: Math.acos(Math.max(-1, Math.min(1, u.dot(new T.Vector3(0, -1, 0))))) * DEG,
  };
}

/** Screen-space chain for silhouette checks. Cameras are plain {matrixWorldInverse, projectionMatrix} three cameras. */
export function projectedChain(T, state, camera, aspect = 1) {
  const pts = [state.S, state.E, state.W, state.tip].map(p => { const v = p.clone().project(camera); return new T.Vector2(v.x * aspect, v.y); });
  // Foreshortening: 1 when a segment lies in the image plane, 0 when it points at the camera. A projected angle at a
  // joint is only a silhouette fact when both adjacent segments are visibly long.
  const seen = (a, b) => { const s = b.clone().sub(a), c = a.clone().add(b).multiplyScalar(.5).sub(camera.position).normalize(), l = s.length(); return l > 1e-9 ? s.addScaledVector(c, -s.dot(c)).length() / l : 0; };
  const fu = seen(state.S, state.E), ff = seen(state.E, state.W), fh = seen(state.W, state.tip);
  const bend = (a, b, c) => { const x = b.clone().sub(a), y = c.clone().sub(b); if (x.length() < 1e-6 || y.length() < 1e-6) return 0; return Math.acos(Math.max(-1, Math.min(1, x.normalize().dot(y.normalize())))) * DEG; };
  const turn = (a, b, c) => { const x = b.clone().sub(a), y = c.clone().sub(b); return Math.sign(x.x * y.y - x.y * y.x); };
  return {elbowBend: bend(pts[0], pts[1], pts[2]), wristBend: bend(pts[1], pts[2], pts[3]), elbowTurn: turn(pts[0], pts[1], pts[2]),
    elbowVisible: Math.min(fu, ff) > .45, wristVisible: Math.min(ff, fh) > .45, foreshortening: [fu, ff, fh],
    upperScreen: pts[0].distanceTo(pts[1]), foreScreen: pts[1].distanceTo(pts[2])};
}

/** Distance between segments [a,b] and [c,d]. */
export function segmentDistance(T, a, b, c, d) {
  const u = b.clone().sub(a), v = d.clone().sub(c), w = a.clone().sub(c), A = u.dot(u), B = u.dot(v), C = v.dot(v), D = u.dot(w), E = v.dot(w), den = A * C - B * B;
  let s = den > 1e-12 ? (B * E - C * D) / den : 0; s = Math.max(0, Math.min(1, s));
  let t = C > 1e-12 ? (B * s + E) / C : 0; t = Math.max(0, Math.min(1, t)); s = A > 1e-12 ? Math.max(0, Math.min(1, (B * t - D) / A)) : 0;
  return a.clone().addScaledVector(u, s).distanceTo(c.clone().addScaledVector(v, t));
}

/**
 * Two-bone arm solve with an explicit hand target, elbow pole and hand intent. Pure orientation maths on the real bones.
 * - upper arm: minimal swing from its rest direction, then roll about its own axis so its hinge (+X) is normal to
 *   the shoulder–elbow–wrist plane with the rest bend sign: the elbow can only flex in its own plane.
 * - forearm: minimal swing from its current direction to the solved one. Because both lie in the hinge plane,
 *   that swing is a pure rotation about the hinge — no forearm roll is ever introduced.
 * - hand: follows the forearm with its rest relation, then pronation about the forearm axis (split 50 % to the distal
 *   forearm skin bone, which carries the whole forearm skin), then wrist extension towards the back of the hand.
 * - clavicle: elevates only for hands above shoulder level, at a scapulohumeral ratio, clamped.
 */
export function createArmSolver(T, by, model, rest, {clavicleRatio = .3, clavicleMax = 14, maxFlexDegrees = 85} = {}) {
  const n = rest.names, bone = k => by.get(n[k]);
  const setWorld = (b, q) => { b.quaternion.copy(b.parent.getWorldQuaternion(new T.Quaternion()).invert().multiply(q)).normalize(); b.updateMatrix(); b.updateMatrixWorld(true); };
  const W = k => bone(k).getWorldQuaternion(new T.Quaternion()).normalize(), P = k => bone(k).getWorldPosition(new T.Vector3());
  const corr = k => rest.world[k === 'defClav' ? 'clav' : k === 'defUpper' || k === 'defUpper2' ? 'upper' : k === 'defFore' || k === 'defFore2' ? 'fore' : 'hand'].clone().invert().multiply(rest.world[k]);
  const corrections = Object.fromEntries(['defClav', 'defUpper', 'defUpper2', 'defFore', 'defFore2', 'defHand'].map(k => [k, corr(k)]));
  const restU = rest.E.clone().sub(rest.S).normalize();
  let lastPerp = null, lastPronation = null;
  // Pronation is rate-limited (degrees per baked frame): a palm request that changes reachability must not spin the hand.
  function solve({target, pole, palm = null, extension = 0, frame, maxPronation = 70, pronationRate = 3.5}) {
    // Clavicle: only when the hand rises above the shoulder.
    bone('clav').quaternion.copy(rest.local.clav); bone('clav').updateMatrix(); bone('clav').updateMatrixWorld(true);
    const C = P('clav'), S0 = P('upper'), reachDir = target.clone().sub(S0).normalize(), up = frame.up;
    const elevation = Math.acos(Math.max(-1, Math.min(1, reachDir.dot(up.clone().negate())))) * DEG;
    const lift = Math.max(0, Math.min(clavicleMax, (elevation - 80) * clavicleRatio));
    if (lift > 0) { const out = S0.clone().sub(C).normalize(), axis = out.clone().cross(up).normalize(); if (axis.lengthSq() > 1e-8) setWorld(bone('clav'), new T.Quaternion().setFromAxisAngle(axis, lift / DEG).multiply(W('clav'))); }
    const S = P('upper'), l1 = rest.l1, l2 = rest.l2, toTarget = target.clone().sub(S);
    // Deep flexion collapses the elbow crease on this rig (the whole forearm skin rides one bone): cap it by reach.
    const maxReach = (l1 + l2) * .985, minReach = Math.sqrt(l1 * l1 + l2 * l2 + 2 * l1 * l2 * Math.cos(maxFlexDegrees / DEG));
    const d = Math.max(minReach, Math.min(maxReach, toTarget.length())), e = toTarget.normalize();
    const reachClamped = Math.abs(d - target.clone().sub(S).length()) > 1e-4;
    const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    // Elbow pole, kept temporally coherent when the authored pole nearly aligns with the reach direction.
    const perp = pole.clone().addScaledVector(e, -pole.dot(e)), strength = perp.length();
    if (lastPerp) { const prior = lastPerp.clone().addScaledVector(e, -lastPerp.dot(e)); const k = Math.max(0, Math.min(1, (strength - .2) / .25)); perp.multiplyScalar(k).addScaledVector(prior, 1 - k); }
    if (perp.lengthSq() < 1e-8) throw Error('Degenerate elbow pole ' + rest.side);
    perp.normalize(); lastPerp = perp.clone();
    const elbow = S.clone().addScaledVector(e, x).addScaledVector(perp, h), wrist = S.clone().addScaledVector(e, d);
    const u1 = elbow.clone().sub(S).normalize(), f1 = wrist.clone().sub(elbow).normalize();
    // Upper arm: swing from rest direction (after the clavicle moved its parent) then roll the hinge onto the plane normal.
    bone('upper').quaternion.copy(rest.local.upper); bone('upper').updateMatrix(); bone('upper').updateMatrixWorld(true);
    const uNow = P('fore').sub(P('upper')).normalize();
    let qU = new T.Quaternion().setFromUnitVectors(uNow, u1).multiply(W('upper'));
    const normal = u1.clone().cross(f1).normalize().multiplyScalar(rest.sigma), hinge = new T.Vector3(1, 0, 0).applyQuaternion(qU);
    hinge.addScaledVector(u1, -hinge.dot(u1)).normalize();
    const roll = Math.atan2(hinge.clone().cross(normal).dot(u1), hinge.dot(normal));
    qU = new T.Quaternion().setFromAxisAngle(u1, roll).multiply(qU); setWorld(bone('upper'), qU);
    // Forearm: back to its rest local relation, then a swing that is a pure hinge rotation.
    bone('fore').quaternion.copy(rest.local.fore); bone('fore').updateMatrix(); bone('fore').updateMatrixWorld(true);
    // Exact hinge: rotate about the upper arm's +X only, matching the in-plane direction. The rest pose's own small
    // out-of-plane offset is kept rather than corrected with a forearm roll.
    const fNow = P('hand').sub(P('fore')).normalize(), axis = new T.Vector3(1, 0, 0).applyQuaternion(W('upper')).normalize();
    const pa = fNow.clone().addScaledVector(axis, -fNow.dot(axis)).normalize(), pb = f1.clone().addScaledVector(axis, -f1.dot(axis)).normalize();
    setWorld(bone('fore'), new T.Quaternion().setFromAxisAngle(axis, Math.atan2(pa.clone().cross(pb).dot(axis), pa.dot(pb))).multiply(W('fore')));
    // Hand: rest relation to the forearm, then pronation and extension.
    bone('hand').quaternion.copy(rest.local.hand); bone('hand').updateMatrix(); bone('hand').updateMatrixWorld(true);
    let qH = W('hand'), pronation = 0;
    if (palm) {
      const current = rest.palmLocal.clone().applyQuaternion(qH), a = current.clone().addScaledVector(f1, -current.dot(f1)), b = palm.clone().addScaledVector(f1, -palm.dot(f1));
      // A palm direction almost along the forearm cannot be reached by pronation: fade its influence instead of spinning.
      const reach = b.length(), weight = Math.max(0, Math.min(1, (reach - .25) / .3));
      if (a.lengthSq() > 1e-8 && b.lengthSq() > 1e-8) { a.normalize(); b.normalize(); pronation = weight * Math.max(-maxPronation / DEG, Math.min(maxPronation / DEG, Math.atan2(a.clone().cross(b).dot(f1), a.dot(b)))); }
    }
    if (lastPronation !== null) pronation = Math.max(lastPronation - pronationRate / DEG, Math.min(lastPronation + pronationRate / DEG, pronation));
    lastPronation = pronation;
    qH = new T.Quaternion().setFromAxisAngle(f1, pronation).multiply(qH);
    if (extension) {
      const finger = rest.fingerLocal.clone().applyQuaternion(qH), palmNow = rest.palmLocal.clone().applyQuaternion(qH), axis = finger.clone().cross(palmNow.negate()).normalize();
      qH = new T.Quaternion().setFromAxisAngle(axis, extension / DEG).multiply(qH);
    }
    setWorld(bone('hand'), qH);
    // DEF mirror with twist distribution: the proximal upper-arm skin bone takes half the shoulder roll and the distal
    // forearm skin bone takes half the pronation, so neither segment wrings its skin at one end.
    setWorld(bone('defClav'), W('clav').multiply(corrections.defClav));
    // Twist about each skin bone's own long axis (+Y), so the split never moves a joint.
    const ownAxis = q => new T.Vector3(0, 1, 0).applyQuaternion(q).normalize();
    const defUpperFull = W('upper').multiply(corrections.defUpper);
    setWorld(bone('defUpper'), new T.Quaternion().setFromAxisAngle(ownAxis(defUpperFull), -roll * .5).multiply(defUpperFull));
    setWorld(bone('defUpper2'), W('upper').multiply(corrections.defUpper2));
    setWorld(bone('defFore'), W('fore').multiply(corrections.defFore));
    const defFore2Rest = W('fore').multiply(corrections.defFore2);
    setWorld(bone('defFore2'), new T.Quaternion().setFromAxisAngle(ownAxis(defFore2Rest), pronation * .5).multiply(defFore2Rest));
    setWorld(bone('defHand'), W('hand').multiply(corrections.defHand));
    return {elbow, wrist, reachClamped, wristError: P('hand').distanceTo(wrist), elbowError: P('fore').distanceTo(elbow), clavicleLift: lift, rollDegrees: roll * DEG, pronationDegrees: pronation * DEG, flexDegrees: Math.acos(Math.max(-1, Math.min(1, u1.dot(f1)))) * DEG};
  }
  return {solve, restU};
}
