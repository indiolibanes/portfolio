/**
 * R6.2 S3 · opt-in culling bounds for skinned meshes under root motion.
 *
 * Three.js computes a SkinnedMesh bounding sphere once (pose at first use) and the renderer never
 * refreshes it; the R6.1 composite moves the body through the Root bone (the mesh object itself stays
 * still), so the stale sphere can leave the frustum while the body is on screen (false culling).
 * This follower replaces only that culling metadata with a conservative sphere built from READ-ONLY
 * bone positions (pelvis, head, hands, feet) plus a margin, and restores the original spheres on release.
 * It never touches bones, geometry, materials, morphs or the GLB, and never disables culling globally.
 */
export const BOUNDS_BONES = Object.freeze(['Bip001Pelvis', 'Bip001Head', 'Bip001RHand', 'Bip001LHand', 'Bip001RFoot', 'Bip001LFoot', 'Bip001Spine2']);

export function createSkinnedBoundsFollower(T, model, {h = null, margin = 0.45} = {}) {
 if (!model?.traverse) throw new TypeError('bounds follower: model required');
 const meshes = []; model.traverse(o => { if (o.isSkinnedMesh) meshes.push(o); });
 const bones = BOUNDS_BONES.map(n => model.getObjectByName(n)).filter(Boolean);
 let height = h;
 if (!(height > 0)) { model.updateMatrixWorld(true); const b = new T.Box3().setFromObject(model); height = b.isEmpty() ? 2 : Math.max(0.1, b.getSize(new T.Vector3()).y); }
 const saved = new Map(), p = new T.Vector3(), box = new T.Box3(), c = new T.Vector3(), inv = new T.Matrix4(), s = new T.Vector3();
 let engaged = false, disposed = false, updates = 0;
 const status = bones.length >= 4 && meshes.length ? 'ACTIVE' : 'UNRESOLVED';
 return {
  /** Call after the body pose for this frame was applied (one call per presentation frame). */
  update() {
   if (disposed || status !== 'ACTIVE') return null;
   if (!engaged) { for (const m of meshes) saved.set(m, m.boundingSphere ? m.boundingSphere.clone() : null); engaged = true; }
   box.makeEmpty();
   for (const b of bones) box.expandByPoint(b.getWorldPosition(p));
   box.getCenter(c); let r = 0; for (const b of bones) r = Math.max(r, b.getWorldPosition(p).distanceTo(c));
   r += margin * height;
   for (const m of meshes) {
    m.updateWorldMatrix(true, false); inv.copy(m.matrixWorld).invert();
    s.setFromMatrixScale(m.matrixWorld); const k = Math.max(s.x, s.y, s.z) || 1;
    if (!m.boundingSphere) m.boundingSphere = new T.Sphere();
    m.boundingSphere.center.copy(c).applyMatrix4(inv); m.boundingSphere.radius = r / k;
   }
   updates++;
   return {center: c.toArray(), radius: r};
  },
  /** Restore the original culling spheres (exactly the objects' previous values). Idempotent. */
  release() {
   if (!engaged) return;
   for (const [m, sp] of saved) m.boundingSphere = sp ? sp.clone() : null;
   saved.clear(); engaged = false;
  },
  dispose() { if (disposed) return; this.release(); disposed = true; },
  get status() { return status; }, get meshes() { return meshes.length; }, get updates() { return updates; }, get engaged() { return engaged; }
 };
}
