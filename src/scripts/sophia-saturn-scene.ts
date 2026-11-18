import * as T from 'three';
import { SATURN, SATURN_FLYBY, SATURN_RINGS, sampleSaturnFlyby } from './sophia-saturn-flyby.mjs';

const sunlight = new T.Vector3(-.62, .53, .58).normalize();
const polarRatio = SATURN.polarRadiusKm / SATURN.equatorialRadiusKm;
const palette = [
  0xddd2ac, 0xbc9d73, 0xe3c997, 0xf1dcb0, 0xbfa078,
  0xe8cf9e, 0xd5b481, 0xc4ac8b, 0xe1c9a3,
].map(color => new T.Color(color));

export function createSaturnScene(scene: T.Scene) {
  const planet = new T.Group();
  planet.name = 'Saturn';
  planet.visible = false;
  scene.add(planet);
  const axis = new T.Group();
  axis.rotation.z = SATURN.obliquity;
  planet.add(axis);
  const sunLocal = sunlight.clone().applyAxisAngle(new T.Vector3(0, 0, 1), -SATURN.obliquity);
  const sunUniform = { value: sunLocal };
  const viewBasis = new T.Matrix3();
  const planetBasis = new T.Matrix3();
  const globeMaterial = new T.ShaderMaterial({
    uniforms: { sun: sunUniform, bands: { value: palette },
      equator: { value: SATURN.equatorialRadiusKm }, polarRatio: { value: polarRatio },
      ringEdges: { value: [SATURN_RINGS.bInner, SATURN_RINGS.bOuter, SATURN_RINGS.aInner, SATURN_RINGS.aOuter] } },
    vertexShader: `
      varying vec3 surface;
      varying vec3 lightNormal;
      void main() {
        surface = position;
        lightNormal = normalMatrix * normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      uniform vec3 sun;
      uniform vec3 bands[9];
      uniform float spin, polarRatio, equator, ringEdges[4];
      uniform mat3 lightBasis;
      varying vec3 surface;
      varying vec3 lightNormal;
      void main() {
        vec3 p = normalize(surface);
        float latitude = asin(p.y);
        float longitude = atan(p.z, p.x) + spin;
        float wind = sin(longitude * 3. + latitude * 24.) * .006
                   + sin(longitude * 7. - latitude * 63.) * .002;
        float band = clamp((p.y + wind) * 4. + 4., 0., 8.);
        vec3 color = bands[0];
        for (int i = 1; i < 9; i++) {
          color = mix(color, bands[i], smoothstep(float(i) - .92, float(i), band));
        }
        float streaks = .93 + .05 * sin(latitude * 102. + wind * 31.)
                           + .022 * sin(latitude * 219. - wind * 71.);
        vec3 n = normalize(lightNormal);
        float day = max(dot(n, lightBasis * sun), 0.);
        vec3 oblatePoint = p * vec3(1., polarRatio, 1.);
        float ray = -oblatePoint.y / max(sun.y, .0001);
        float ringHit = length((oblatePoint + sun * ray).xz) * equator;
        float ringShade = .50 * (smoothstep(ringEdges[0] - 150., ringEdges[0] + 150., ringHit)
                        - smoothstep(ringEdges[1] - 150., ringEdges[1] + 150., ringHit))
                        + .31 * (smoothstep(ringEdges[2] - 150., ringEdges[2] + 150., ringHit)
                        - smoothstep(ringEdges[3] - 150., ringEdges[3] + 150., ringHit));
        day *= ray > 0. ? 1. - ringShade : 1.;
        float limb = pow(1. - abs(n.z), 3.);
        vec3 linear = color * streaks * (.033 + 1.05 * pow(day, .7));
        linear += color * limb * day * .20;
        gl_FragColor = vec4(linear, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  globeMaterial.uniforms.spin = { value: 0 };
  globeMaterial.uniforms.lightBasis = { value: new T.Matrix3() };

  const globeGeometry = new T.SphereGeometry(1, 72, 48);
  const globe = new T.Mesh(globeGeometry, globeMaterial);
  globe.scale.y = polarRatio;
  axis.add(globe);

  const { cInner, bInner, bOuter, aInner, aOuter, fCenter } = SATURN_RINGS;
  const ringGeometry = new T.RingGeometry(cInner / SATURN.equatorialRadiusKm,
    (fCenter + 60) / SATURN.equatorialRadiusKm, 160);
  ringGeometry.rotateX(-Math.PI / 2);
  const ringMaterial = new T.ShaderMaterial({
    side: T.DoubleSide,
    transparent: true,
    depthWrite: false,
    uniforms: {
      sun: sunUniform,
      seconds: { value: 0 },
      radii: { value: [bInner, bOuter, aInner, aOuter, fCenter] },
      equator: { value: SATURN.equatorialRadiusKm },
      polarRatio: { value: polarRatio },
      gm: { value: SATURN.gm },
    },
    vertexShader: `
      varying vec3 ringPoint;
      void main() {
        ringPoint = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }`,
    fragmentShader: `
      uniform vec3 sun;
      uniform float seconds, equator, polarRatio, gm, radii[5];
      varying vec3 ringPoint;
      void main() {
        float r = length(ringPoint.xz) * equator;
        float width = max(fwidth(r) * .68, 1.);
        float b = smoothstep(radii[0] - width, radii[0] + width, r);
        float gap = smoothstep(radii[1] - width, radii[1] + width, r);
        float a = smoothstep(radii[2] - width, radii[2] + width, r)
                - smoothstep(radii[3] - width, radii[3] + width, r);
        float fDistance = (r - radii[4]) / max(55., width);
        float f = .16 * exp(-fDistance * fDistance);
        // Filter the ring texture by radial pixel coverage to avoid moiré.
        float broad = .080 * sin(r * .0048) * (1. - smoothstep(110., 490., width));
        float detail = .035 * sin(r * .016 + 1.) * (1. - smoothstep(28., 145., width));
        float fine = .94 + broad + detail;
        float angle = atan(ringPoint.z, ringPoint.x) + seconds * sqrt(gm / (r*r*r));
        float density = ((.19 + .74 * b) * (1. - gap) + a * .62 + f)
                      * fine * (.981 + .019 * sin(angle * 11. + r * .001));
        if (density < .005) discard;
        // Ray from the ring toward the Sun intersecting the oblate globe.
        vec3 p = ringPoint / vec3(1., polarRatio, 1.);
        vec3 l = normalize(sun / vec3(1., polarRatio, 1.));
        float towardSun = -dot(p, l);
        float lit = towardSun > 0. ? smoothstep(.97, 1.02, length(p + l * towardSun)) : 1.;
        vec3 ice = mix(vec3(.62, .57, .47), vec3(.78, .69, .54), a * .6);
        gl_FragColor = vec4(ice * (.13 + .78 * lit), clamp(density, 0., 1.));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const rings = new T.Mesh(ringGeometry, ringMaterial);
  axis.add(rings);

  // Sparse static star field. Geometry is generated once and has no network dependencies.
  const positions = new Float32Array(1050 * 3);
  const colors = new Float32Array(positions.length);
  let seed = 94037;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let i = 0; i < positions.length; i += 3) {
    const y = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    positions.set([r * Math.cos(angle), y, r * Math.sin(angle)], i);
    const intensity = .14 + random() ** 3 * .65;
    colors.set([intensity * .82, intensity * .91, intensity], i);
  }
  const starGeometry = new T.BufferGeometry();
  starGeometry.setAttribute('position', new T.BufferAttribute(positions, 3));
  starGeometry.setAttribute('color', new T.BufferAttribute(colors, 3));
  const starMaterial = new T.PointsMaterial({ size: 1.45, sizeAttenuation: false, vertexColors: true });
  const stars = new T.Points(starGeometry, starMaterial);
  stars.visible = false;
  scene.add(stars);
  const cameraFrame = new T.PerspectiveCamera();
  // Sun and surface normal in the same coordinate system, including user orbit.
  globe.onBeforeRender = (_renderer, _scene, view) => {
    globeMaterial.uniforms.lightBasis.value.multiplyMatrices(
      viewBasis.setFromMatrix4(view.matrixWorldInverse),
      planetBasis.setFromMatrix4(axis.matrixWorld),
    ).multiplyScalar(1 / planet.scale.x);
  };

  function update(time: number, camera: T.PerspectiveCamera, position: T.Vector3,
    target: T.Vector3, unit: number, reduced: boolean) {
    const sample = sampleSaturnFlyby(time);
    planet.visible = stars.visible = sample.visible;
    if (!sample.visible) return;
    cameraFrame.position.copy(position);
    cameraFrame.lookAt(target);
    cameraFrame.updateMatrixWorld(true);
    const distance = Math.max(unit * 1500, 150);
    const halfHeight = distance * Math.tan(T.MathUtils.degToRad(camera.fov / 2));
    const halfWidth = halfHeight * camera.aspect;
    const opening = T.MathUtils.smoothstep(time, SATURN_FLYBY.start, SATURN_FLYBY.start + 2.2);
    const drift = sample.bearing / (Math.PI / 2);
    const x = (1 - opening) * 2.1 + opening * (.31 + drift * .4);
    planet.position.set(x * halfWidth, .17 * halfHeight, -distance);
    planet.position.applyMatrix4(cameraFrame.matrixWorld);
    planet.quaternion.copy(cameraFrame.quaternion);
    planet.rotateX(.46 + drift * .21);
    // A telephoto background widens Saturn's apparent angle in the composition.
    // Its globe and annuli always share the same uniform scale.
    const angularMagnification = Math.min(310, 205 + 70 * camera.aspect);
    planet.scale.setScalar(distance * Math.tan(sample.angularRadius) * angularMagnification);
    globeMaterial.uniforms.spin.value = reduced ? 0 : sample.spin;
    ringMaterial.uniforms.seconds.value = reduced ? 0 : sample.simulatedSeconds;
    stars.position.copy(position);
    stars.scale.setScalar(distance * 1.8);
  }

  return {
    update,
    dispose() {
      planet.removeFromParent();
      stars.removeFromParent();
      for (const geometry of [globeGeometry, ringGeometry, starGeometry]) geometry.dispose();
      for (const material of [globeMaterial, ringMaterial, starMaterial]) material.dispose();
    },
  };
}
