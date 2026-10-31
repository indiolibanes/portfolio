/** Public-safe diagnostics. Texture pixels and geometry remain in browser memory. */

export function materialFamily(material) {
  const name = material?.name ?? '';
  if (/face/i.test(name)) return 'face';
  if (/eye/i.test(name)) return 'eye';
  return null;
}

export function directMaterial(THREE, source) {
  if (!source?.map?.isTexture) return null;
  const result = new THREE.MeshBasicMaterial({
    map: source.map, color: 0xffffff, side: source.side,
    transparent: false, opacity: 1, toneMapped: false, vertexColors: false,
    alphaTest: 0, blending: THREE.NoBlending, depthWrite: true,
  });
  result.name = `direct sample: ${source.name}`;
  return result;
}

// Encodes UV0/UV1 as red=U, green=V, plus blue checkerboard, no image assets.
// MeshBasicMaterial retains Three.js skinning/morph support and uses the same
// geometry attributes as the selected skinned primitive.
export function createUvMaterial(THREE, channel, side) {
  const size = 256, bytes = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    bytes[i] = x; bytes[i + 1] = y; bytes[i + 2] = ((x >> 5) + (y >> 5)) % 2 ? 255 : 32; bytes[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat);
  texture.channel = channel; texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({map: texture, color: 0xffffff,
    side, transparent: false, opacity: 1, toneMapped: false, vertexColors: false,
    alphaTest: 0, blending: THREE.NoBlending});
  material.name = `UV${channel} debug`;
  return {material, texture};
}

export function inspectBinding(mesh, assigned) {
  const materials = Array.isArray(assigned) ? assigned : [assigned];
  const vector = v => v?.toArray ? v.toArray() : null;
  return {
    mesh: mesh.name, uuid: mesh.uuid, visible: mesh.visible,
    geometry: mesh.geometry.name, groups: mesh.geometry.groups.map(g => ({...g})),
    groupCount: mesh.geometry.groups.length,
    primitiveNote: 'Each GLTFLoader SkinnedMesh is normally one glTF primitive; groups are Three.js draw ranges, not glTF primitive counts.',
    attributes: Object.fromEntries(['position','normal','uv','uv1','color','skinIndex','skinWeight'].map(name => {
      const a = mesh.geometry.getAttribute(name);
      return [name, a ? {count:a.count, itemSize:a.itemSize, normalized:a.normalized} : null];
    })),
    materials: materials.map((m, index) => ({index, name:m?.name, type:m?.type,
      map: m?.map ? {name:m.map.name, present:!!m.map.image,
        width:m.map.image?.width ?? null, height:m.map.image?.height ?? null,
        flipY:m.map.flipY, colorSpace:m.map.colorSpace, offset:vector(m.map.offset),
        repeat:vector(m.map.repeat), rotation:m.map.rotation, center:vector(m.map.center),
        channel:m.map.channel, wrapS:m.map.wrapS, wrapT:m.map.wrapT} : null})),
  };
}
