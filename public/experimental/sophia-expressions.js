// sophia-expressions.js — composição de expressões da Sophia (Three.js r186+) sobre o AnimationMixer.
//
// Os clipes da Sophia (6F/6G) animam o vetor completo de morphs [Blink, Smile, BrowRaise, MouthOpen]
// por canais glTF "weights". O PropertyMixer do Three reescreve morphTargetInfluences a cada
// mixer.update(), apagando expressões aplicadas antes. Use:
//   mixer.update(dt);
//   applyExpressions(root, { smile: .6, browRaise: .2, mouthOpen: 0, blink: 0 });
// Blink final = max(Blink do clipe, blink externo); os demais = valor externo (os clipes os mantêm em 0).
export const SOPHIA_MORPHS = ['Blink', 'Smile', 'BrowRaise', 'MouthOpen'];

export function morphMeshes(root) {
  const out = [];
  root.traverse((o) => {
    if (o.isMesh && o.morphTargetInfluences && o.morphTargetDictionary && 'Blink' in o.morphTargetDictionary) out.push(o);
  });
  return out;
}

export function applyExpressions(root, e = {}, meshes = morphMeshes(root)) {
  const clamp = (v) => Math.min(1, Math.max(0, v || 0));
  for (const m of meshes) {
    const d = m.morphTargetDictionary;
    const inf = m.morphTargetInfluences;
    inf[d.Blink] = Math.max(inf[d.Blink], clamp(e.blink));
    if (e.smile !== undefined) inf[d.Smile] = clamp(e.smile);
    if (e.browRaise !== undefined) inf[d.BrowRaise] = clamp(e.browRaise);
    if (e.mouthOpen !== undefined) inf[d.MouthOpen] = clamp(e.mouthOpen);
  }
  return meshes;
}

// Runtime próprio (gltf-skel.js + gltf-gl.js, sem Three): mesma regra de composição sobre o vetor de pesos do
// esqueleto. Uso: model.morphOverride = composeExpressions(model.skeleton.morphWeights, { smile: .6 }, out);
// (passe um Float32Array(4) reutilizável em `out` para não alocar a cada quadro).
export function composeExpressions(base, e = {}, out = new Float32Array(4)) {
  const clamp = (v) => Math.min(1, Math.max(0, v || 0));
  for (let k = 0; k < 4; k += 1) out[k] = base && k < base.length ? base[k] : 0;
  out[0] = Math.max(out[0], clamp(e.blink));
  if (e.smile !== undefined) out[1] = clamp(e.smile);
  if (e.browRaise !== undefined) out[2] = clamp(e.browRaise);
  if (e.mouthOpen !== undefined) out[3] = clamp(e.mouthOpen);
  return out;
}
