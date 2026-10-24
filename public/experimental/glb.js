// glb.js — leitor mínimo de GLB para a ampulheta (sem dependências).
// Lê só o necessário: malha do vidro, malha de um grão, posição/escala de cada grão
// (cada grão é um nó do GLB) e as poeiras do topo. Unidades: metros, como no arquivo.

export async function loadHourglassGLB(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('não é GLB');
  const jsonLen = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLen)));
  const binStart = 20 + jsonLen + 8;
  const bin = new Uint8Array(buf, binStart);

  const accessor = (i) => {
    const a = json.accessors[i];
    const bv = json.bufferViews[a.bufferView];
    const off = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const n = a.type === 'VEC3' ? 3 : 1;
    const count = a.count * n;
    if (a.componentType === 5126) return new Float32Array(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + count * 4));
    if (a.componentType === 5123) return new Uint16Array(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + count * 2));
    if (a.componentType === 5125) return new Uint32Array(bin.buffer.slice(bin.byteOffset + off, bin.byteOffset + off + count * 4));
    throw new Error('componentType ' + a.componentType);
  };
  const primOf = (meshIndex) => json.meshes[meshIndex].primitives[0];
  const meshData = (meshIndex) => {
    const p = primOf(meshIndex);
    return {
      pos: accessor(p.attributes.POSITION),
      nrm: accessor(p.attributes.NORMAL),
      idx: accessor(p.indices),
    };
  };

  const meshByName = Object.fromEntries(json.meshes.map((m, i) => [m.name, i]));
  const grains = [];
  const dust = [];
  let glassMesh = null;
  let grainMesh = null;
  for (const n of json.nodes) {
    if (!n.mesh && n.mesh !== 0) continue;
    const name = n.name || '';
    const t = n.translation || [0, 0, 0];
    const s = (n.scale || [1, 1, 1])[0];
    if (name.startsWith('Grao_Inf')) grains.push({ x: t[0], y: t[1], z: t[2], s });
    else if (name.startsWith('Poeira_Sup')) dust.push({ x: t[0], y: t[1], z: t[2], s });
    else if (name === 'Vidro') glassMesh = meshData(n.mesh);
  }
  if (!glassMesh) glassMesh = meshData(meshByName['Vidro_Mesh']);
  grainMesh = meshData(meshByName['Grao_Mesh']);
  return { glass: glassMesh, grainGeo: grainMesh, grains, dust };
}
