/** Material, texture and mesh audit of the production GLB, read straight from its JSON chunk (no three, no WebGL).
 * Usage: node scripts/audit-hsin-materials.mjs [GLB] [OUT.json] */
import {readFile, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

export function auditGlb(buffer) {
 const jsonLength = buffer.readUInt32LE(12), json = JSON.parse(buffer.toString('utf8', 20, 20 + jsonLength));
 const textureUse = new Map();
 const materials = json.materials.map((m, index) => {
  const p = m.pbrMetallicRoughness ?? {}, uses = {baseColor: p.baseColorTexture?.index, normal: m.normalTexture?.index, emissive: m.emissiveTexture?.index, occlusion: m.occlusionTexture?.index, metalRough: p.metallicRoughnessTexture?.index};
  for (const [slot, texture] of Object.entries(uses)) if (texture !== undefined) textureUse.set(texture, slot);
  const meshes = json.meshes.flatMap((mesh, mi) => mesh.primitives.some((pr) => pr.material === index) ? [mesh.name ?? 'mesh ' + mi] : []);
  const unlit = !!m.extensions?.KHR_materials_unlit;
  return {index, name: m.name, unlit, threeMaterial: unlit ? 'MeshBasicMaterial' : 'MeshStandardMaterial', respondsToLights: !unlit,
   baseColorFactor: p.baseColorFactor ?? null, roughness: p.roughnessFactor ?? null, metalness: p.metallicFactor ?? null, alphaMode: m.alphaMode ?? 'OPAQUE', doubleSided: !!m.doubleSided, textures: uses, usedBy: meshes};
 });
 const bin = buffer.subarray(28 + jsonLength);
 const accessor = (i) => json.accessors[i];
 const meshes = json.meshes.map((mesh, index) => mesh.primitives.map((p) => {
  const color = p.attributes.COLOR_0 !== undefined ? accessor(p.attributes.COLOR_0) : null;
  let min = null;
  if (color && color.componentType === 5121 && color.normalized) {
   const bv = json.bufferViews[color.bufferView], offset = (bv.byteOffset ?? 0) + (color.byteOffset ?? 0), stride = bv.byteStride ?? (color.type === 'VEC4' ? 4 : 3);
   min = 255; for (let i = 0; i < color.count; i++) for (let c = 0; c < 3; c++) min = Math.min(min, bin[offset + i * stride + c]);
   min /= 255;
  }
  return {mesh: mesh.name, material: json.materials[p.material]?.name, vertices: accessor(p.attributes.POSITION).count, triangles: (p.indices !== undefined ? accessor(p.indices).count : accessor(p.attributes.POSITION).count) / 3,
   morphTargets: p.targets?.length ?? 0, morphNormals: !!p.targets?.some((t) => t.NORMAL !== undefined), vertexColorMinimum: min};
 })).flat();
 return {
  sha256: createHash('sha256').update(buffer).digest('hex'), bytes: buffer.length, generator: json.asset?.generator, extensionsRequired: json.extensionsRequired ?? [], extensionsUsed: json.extensionsUsed ?? [],
  skins: json.skins.map((s) => ({name: s.name, joints: s.joints.length})), nodes: json.nodes.length, animations: json.animations?.length ?? 0,
  images: json.images.map((im, i) => ({index: i, name: im.name, mime: im.mimeType, bytes: json.bufferViews[im.bufferView].byteLength, slot: textureUse.get(i) ?? 'unused'})),
  materials, meshes, totalTriangles: meshes.reduce((n, m) => n + m.triangles, 0),
 };
}

if (import.meta.url === `file://${process.argv[1]}`) {
 const [input = 'public/assets/characters/hsin/models/hsin-v2.0.glb', output] = process.argv.slice(2);
 const report = auditGlb(await readFile(input)), text = JSON.stringify(report, null, 1) + '\n';
 if (output) await writeFile(output, text); else process.stdout.write(text);
}
