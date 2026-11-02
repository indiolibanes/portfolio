/**
 * Face skin response.
 *
 * Diagnosis (V2.0.1): the production GLB marks the face material KHR_materials_unlit, so three.js builds a
 * MeshBasicMaterial. The face therefore shows its recovered diffuse at 100 % under any light: a near-white pink
 * (median sRGB 251/213/213) with no response to the key, rim or ambient light, while the body skin is lit PBR at
 * roughly 40-60 % of its albedo. Vertex colours are all 1.0, the map is sRGB, the renderer outputs sRGB with
 * NoToneMapping: there is no colour-space error, only a missing light response.
 *
 * Fix: replace only the face material by a MeshLambertMaterial that reuses the same texture object and adds
 *   out = albedo * (tint * irradiance / PI + floor)
 * `floor` is a warm, view-independent term (emissive * the same map) that keeps the shaded side of the face in
 * soft anime shadow instead of going grey. It is face-only, preserves skinning and morph targets (the GLB has no
 * morph normals, so the base normals stay valid), adds no pass, texture, light or render target, and is
 * reversible with restore(). Eyes, hair, clothing and scenery are not touched.
 */
export const HSIN_FACE_SKIN = Object.freeze({
 version: '2.0.1-face-r2',
 enabled: true,
 // Linear multipliers, chosen by looking at real WebGL frames of four candidates (r1 and its cooler siblings read grey;
 // a rosier variant drifted toward artificial pink). tint scales the lit response, floor is the warm shadow floor.
 tint: Object.freeze([.76, .83, .81]),
 floor: Object.freeze([.50, .35, .21]),
});

export const srgbToLinear = (v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
export const linearToSrgb = (v) => { const c = Math.min(1, Math.max(0, v)); return c <= .0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - .055; };
export const hexToLinear = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((c) => srgbToLinear(c / 255));

/** Irradiance reaching a surface, as the three.js Lambert shader sees it (physically based, no PI factor). */
export function stageIrradiance(rig, nDotKey, nDotRim = 0) {
 const ambient = hexToLinear(rig.ambient.color).map((c) => c * rig.ambient.intensity);
 const key = hexToLinear(rig.key.color).map((c) => c * rig.key.intensity * Math.max(0, nDotKey));
 const rim = hexToLinear(rig.rim.color).map((c) => c * rig.rim.intensity * Math.max(0, nDotRim));
 return ambient.map((a, i) => a + key[i] + rim[i]);
}

/** Linear colour of a lit surface with a Lambert BRDF (albedo / PI). */
export const lambertResponse = (albedo, irradiance) => albedo.map((a, i) => a * irradiance[i] / Math.PI);

/** What the replacement face material renders for a linear albedo and an irradiance. */
export function faceSkinResponse(albedo, irradiance, params = HSIN_FACE_SKIN) {
 return albedo.map((a, i) => a * (params.tint[i] * irradiance[i] / Math.PI + params.floor[i]));
}

/** The original unlit face: the texture, unchanged, whatever the light. */
export const unlitResponse = (albedo) => [...albedo];

export const relativeLuminance = ([r, g, b]) => .2126 * r + .7152 * g + .0722 * b;
export const toSrgb8 = (rgb) => rgb.map((v) => Math.round(linearToSrgb(v) * 255));

const FACE = /face/i;
const materialsOf = (mesh) => Array.isArray(mesh.material) ? mesh.material : [mesh.material];

/** Plain-data audit of the materials that decide how skin and eyes are lit. Safe to log and to diff. */
export function auditFaceMaterials(meshes) {
 const rows = [];
 for (const mesh of meshes) for (const m of materialsOf(mesh)) {
  if (!m) continue;
  rows.push({
   mesh: mesh.name, material: m.name, type: m.type,
   lit: !m.isMeshBasicMaterial, toneMapped: m.toneMapped, vertexColors: m.vertexColors, side: m.side,
   mapColorSpace: m.map?.colorSpace ?? null, normalMapColorSpace: m.normalMap?.colorSpace ?? null,
   morphTargets: mesh.morphTargetInfluences?.length ?? 0, hasMorphNormals: !!mesh.geometry?.morphAttributes?.normal,
   roughness: m.roughness ?? null, metalness: m.metalness ?? null, emissiveMap: !!m.emissiveMap,
  });
 }
 return rows;
}

/**
 * Swaps the unlit face material for the lit skin material. Idempotent; restore() puts back the exact original
 * object and disposes the replacement. If the face is already lit (a future GLB) nothing is replaced.
 */
export function createFaceSkin({THREE: T, meshes, config = HSIN_FACE_SKIN}) {
 const swapped = [];
 let active = false;
 const build = (source) => {
  const material = new T.MeshLambertMaterial({
   map: source.map, side: source.side, transparent: false, opacity: 1, alphaTest: 0,
   toneMapped: source.toneMapped, vertexColors: false, fog: source.fog,
  });
  material.color.setRGB(...config.tint, T.LinearSRGBColorSpace);
  material.emissive.setRGB(...config.floor, T.LinearSRGBColorSpace);
  material.emissiveMap = source.map;
  material.name = `${source.name} · lit skin ${config.version}`;
  material.userData.hsinFaceSkin = config.version;
  return material;
 };
 return {
  get active() { return active; },
  apply() {
   if (active || !config.enabled) return active;
   for (const mesh of meshes) {
    if (Array.isArray(mesh.material) || !FACE.test(mesh.material?.name ?? '')) continue;
    const source = mesh.material;
    if (!source.isMeshBasicMaterial || !source.map) continue;
    swapped.push({mesh, source});
    mesh.material = build(source);
   }
   active = swapped.length > 0;
   return active;
  },
  restore() {
   for (const {mesh, source} of swapped) { const lit = mesh.material; mesh.material = source; if (lit !== source) lit.dispose(); }
   swapped.length = 0; active = false;
  },
  diagnostics: () => ({version: config.version, enabled: config.enabled, active, replaced: swapped.map(({mesh}) => mesh.name)}),
 };
}
