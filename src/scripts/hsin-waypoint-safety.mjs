/**
 * Hsin v1.0.9.2 safety gate — generic, asset-free geometric diagnostics.
 *
 * CCD can satisfy fingertip position by selecting discontinuous elbow branches
 * at adjacent waypoints. A smooth quaternion interpolation does NOT make such
 * a sequence anatomically valid. Reject obvious inversions before playback.
 *
 * Only a safeguard: correct anatomical hinge constraints and a pole vector
 * still require a separate rig-specific implementation and visual approval.
 */
export function inspectHsinWaypointContinuity(frames, options = {}) {
  const maxJointStepRadians = options.maxJointStepRadians ?? Math.PI / 3;
  const elbowFlipDot = options.elbowFlipDot ?? -0.1;
  const minBendLength = options.minBendLength ?? 0.008;
  if (!Array.isArray(frames) || frames.length < 2) {
    return { ok: false, reason: 'insufficient-waypoints', maxStepRadians: 0 };
  }
  let maxStepRadians = 0;
  const bendVector = (frame) => {
    if (!frame.shoulder || !frame.elbow || !frame.wrist) return null;
    const arm = frame.wrist.clone().sub(frame.shoulder);
    const elbow = frame.elbow.clone().sub(frame.shoulder);
    const denominator = arm.lengthSq();
    if (denominator < 1e-8) return null;
    const radial = elbow.addScaledVector(arm, -elbow.dot(arm) / denominator);
    if (radial.length() < minBendLength) return null;
    return radial.normalize();
  };
  for (let frameIndex = 1; frameIndex < frames.length; frameIndex++) {
    const previous = frames[frameIndex - 1];
    const current = frames[frameIndex];
    if (!previous?.quaternions || !current?.quaternions ||
        previous.quaternions.length !== current.quaternions.length) {
      return { ok: false, reason: 'inconsistent-joints', maxStepRadians };
    }
    for (let jointIndex = 0; jointIndex < current.quaternions.length; jointIndex++) {
      const a = previous.quaternions[jointIndex];
      const b = current.quaternions[jointIndex];
      const delta = a.angleTo(b);
      if (!Number.isFinite(delta)) {
        return { ok: false, reason: 'invalid-quaternion', maxStepRadians, frameIndex, jointIndex };
      }
      maxStepRadians = Math.max(maxStepRadians, delta);
      if (delta > maxJointStepRadians) {
        return {
          ok: false, reason: 'excessive-joint-step',
          maxStepRadians, frameIndex, jointIndex,
        };
      }
    }
    const a = bendVector(previous);
    const b = bendVector(current);
    if (a && b && a.dot(b) < elbowFlipDot) {
      return {
        ok: false, reason: 'elbow-branch-inversion',
        maxStepRadians, frameIndex,
      };
    }
  }
  return { ok: true, reason: null, maxStepRadians };
}
