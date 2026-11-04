// The influence arrays, rather than the inspection wrapper, identify the live face.
const owners = new WeakMap();
export const facialMeshes = inspection => (inspection.morphMeshes ?? []).filter(m => ['Shorekeeper_Face', 'Shorekeeper_Eye'].includes(m.name));
export function claimFacialWriter(inspection, label) {
  const keys = facialMeshes(inspection).map(m => m.morphTargetInfluences);
  if (keys.some(k => owners.has(k))) throw Error('Face/Eye already have a facial writer');
  const token = {label};
  for (const k of keys) owners.set(k, token);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    for (const k of keys) if (owners.get(k) === token) owners.delete(k);
  };
}
export function facialOwner(inspection) {
  return facialMeshes(inspection).map(m => ({mesh: m.name, owner: owners.get(m.morphTargetInfluences)?.label ?? null}));
}
