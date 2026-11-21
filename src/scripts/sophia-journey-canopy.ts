import * as T from 'three';

/** Retain the original livery and swap its upper ogive for a glazed cabin. */
export function prepareJourneyCanopy(hull: T.Object3D, airframe: T.Object3D) {
  const mesh = hull as T.Mesh<T.BufferGeometry, T.MeshStandardMaterial>;
  if (!mesh.isMesh || !mesh.material?.isMeshStandardMaterial) return null;
  const geometry = mesh.geometry;
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  const fullHeight = bounds.max.y - bounds.min.y;
  const cut = bounds.min.y + fullHeight * .77;
  const domeHeight = bounds.max.y - cut;
  const latitudes = new Map<number, number>();
  const positions = geometry.getAttribute('position');
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const r = Math.hypot(positions.getX(i), positions.getZ(i));
    latitudes.set(y, Math.max(latitudes.get(y) ?? 0, r));
  }
  const rows = [...latitudes].sort(([a], [b]) => a - b);
  function radiusAt(y: number) {
    const next = rows.findIndex(row => row[0] >= y);
    if (next <= 0) return rows[next < 0 ? rows.length - 1 : 0][1];
    const [a, b] = rows.slice(next - 1, next + 1);
    return T.MathUtils.lerp(a[1], b[1], (y - a[0]) / (b[0] - a[0]));
  }

  const localSection = new T.Plane(new T.Vector3(0, -1, 0), cut);
  const section = localSection.clone();
  const originalPaint = mesh.material;
  // Fins share the enamel. Retain the atlas and darken its reflectance for the night palette.
  originalPaint.color.multiply(new T.Color(0x9a9299));
  originalPaint.roughness = .43;
  originalPaint.clippingPlanes = [section];

  const baseRadius = radiusAt(cut);
  const profile = (u: number) => baseRadius * Math.max(0, 1 - u ** 2.45) ** .6;
  const window = new T.Mesh(
    new T.LatheGeometry(Array.from({ length: 29 }, (_, i) => new T.Vector2(profile(i / 28), cut + domeHeight * i / 28)), 64),
    new T.MeshPhysicalMaterial({
      color: 0x557385, metalness: .37, roughness: .22, clearcoat: .87, clearcoatRoughness: .17,
      opacity: .76, transparent: true, depthWrite: false,
    }),
  );
  window.name = 'Journey_Panoramic_Canopy';
  window.renderOrder = 2;
  hull.add(window);

  const bronze = new T.MeshStandardMaterial({ color: 0x655044, metalness: .68, roughness: .29 });
  const bezel = new T.Mesh(new T.TorusGeometry(baseRadius, fullHeight * .011, 8, 64), bronze);
  bezel.rotation.x = Math.PI / 2;
  bezel.position.y = cut + .001;
  hull.add(bezel);
  const cabinFloor = new T.Mesh(
    new T.CylinderGeometry(baseRadius * .93, baseRadius * .93, fullHeight * .018, 48),
    new T.MeshStandardMaterial({ color: 0x131d25, roughness: .59, metalness: .18 }),
  );
  cabinFloor.position.y = cut + domeHeight * .04;
  hull.add(cabinFloor);

  for (let rib = 0; rib < 4; rib++) {
    const points = Array.from({ length: 13 }, (_, i) => {
      const u = i / 12 * .9;
      const angle = .34 + rib * Math.PI / 2 + .10 * u;
      const r = profile(u);
      return new T.Vector3(Math.sin(angle) * r, cut + u * domeHeight, Math.cos(angle) * r);
    });
    hull.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 20, fullHeight * .0049, 6, false), bronze));
  }

  for (const name of ['Nose_Star_Front', 'Nose_Star_Back']) {
    const star = airframe.getObjectByName(name);
    if (!star?.parent) continue;
    const position = hull.worldToLocal(star.getWorldPosition(new T.Vector3()));
    const starY = cut - fullHeight * .055;
    const r = radiusAt(starY) + fullHeight * .007;
    const angle = Math.atan2(position.x, position.z);
    position.set(Math.sin(angle) * r, starY, Math.cos(angle) * r);
    star.position.copy(star.parent.worldToLocal(hull.localToWorld(position)));
  }

  return {
    update() { section.copy(localSection).applyMatrix4(hull.matrixWorld); },
  };
}
