/**
 * Hit-test barato por esferas-proxy (sem raycast em ~500 mil triângulos).
 * Tudo em arrays [x,y,z] simples; sem three.js.
 */

/** Interseção raio–esfera; devolve o menor t ≥ 0 ou null. `d` deve ser unitário. */
export function raySphere(o, d, c, r) {
  const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2];
  const b = ox * d[0] + oy * d[1] + oz * d[2];
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  const t0 = -b - s;
  const t1 = -b + s;
  if (t1 < 0) return null;
  return t0 >= 0 ? t0 : t1;
}

/** @param {{c:number[], r:number}[]} spheres */
export function rayHitSpheres(o, d, spheres, radiusScale = 1) {
  let best = null;
  for (let i = 0; i < spheres.length; i++) {
    const t = raySphere(o, d, spheres[i].c, spheres[i].r * radiusScale);
    if (t !== null && (best === null || t < best.t)) {
      best = { t, index: i, point: [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t] };
    }
  }
  return best;
}
