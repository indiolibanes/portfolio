import * as T from 'three';

const up = new T.Vector3(0, 1, 0);

export function createJourneyJet(height: number) {
  const axisToWorld = new T.Quaternion();
  const core = new T.Color(0xfff1c9);
  const envelope = new T.Color(0xff791f);
  const uniforms = {
    engine: { value: 0 }, time: { value: 0 },
    hot: { value: core }, warm: { value: envelope },
  };
  const material = new T.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    side: T.FrontSide, blending: T.AdditiveBlending,
    vertexShader: `
      varying vec2 profileUv;
      varying vec3 surfaceNormal;
      varying vec3 viewDirection;
      void main() {
        profileUv = uv;
        surfaceNormal = normalize(normalMatrix * normal);
        vec4 eyePosition = modelViewMatrix * vec4(position, 1.0);
        viewDirection = -eyePosition.xyz;
        gl_Position = projectionMatrix * eyePosition;
      }`,
    fragmentShader: `
      uniform float engine;
      uniform float time;
      uniform vec3 hot;
      uniform vec3 warm;
      varying vec2 profileUv;
      varying vec3 surfaceNormal;
      varying vec3 viewDirection;
      void main() {
        float along = 1.0 - profileUv.y;
        float facing = max(0.0, dot(normalize(surfaceNormal), normalize(viewDirection)));
        float flow = 0.85 + 0.15 * sin(along * 33.0 - time * 20.0 + sin(profileUv.x * 12.56637) * 0.85);
        float taper = 1.0 - smoothstep(0.19, 1.0, along);
        float heat = pow(facing, 1.6) * (1.0 - smoothstep(0.04, 0.71, along));
        vec3 flame = mix(warm * 1.15, hot * 3.5, heat);
        gl_FragColor = vec4(flame, taper * pow(facing, 0.72) * flow * engine);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const geometry = new T.LatheGeometry([
    new T.Vector2(0, -1), new T.Vector2(.28, -.84), new T.Vector2(.7, -.52),
    new T.Vector2(.98, -.25), new T.Vector2(1, -.09), new T.Vector2(.83, 0),
  ], 32);
  const jet = new T.Mesh(geometry, material);
  jet.name = 'Journey_Exhaust';
  let length = 0;

  return {
    jet,
    get length() { return length; },
    update(nozzle: T.Vector3, axis: T.Vector3, ground: number, seconds: number, energy: number, shimmer: number) {
      const clearance = Math.max(0, nozzle.y - ground);
      length = energy > .003 ? Math.min(height * (.14 + energy * .95) * shimmer, clearance / Math.max(.18, axis.y)) : 0;
      jet.visible = length > height * .004;
      jet.position.copy(nozzle);
      jet.quaternion.copy(axisToWorld.setFromUnitVectors(up, axis));
      const radius = height * (.056 + .041 * energy);
      jet.scale.set(radius, length, radius);
      uniforms.engine.value = energy;
      uniforms.time.value = seconds;
    },
    dispose() { jet.removeFromParent(); material.dispose(); geometry.dispose(); },
  };
}

export function createWetLaunchDeck(height: number, radius: number) {
  const uniforms = {
    metric: { value: height }, energy: { value: 0 },
    nozzle: { value: new T.Vector3() }, tail: { value: new T.Vector3() },
  };
  const material = new T.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 surface;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        surface = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `
      uniform float metric;
      uniform float energy;
      uniform vec3 nozzle;
      uniform vec3 tail;
      varying vec3 surface;

      // Trace the reflected view ray against luminous volumes along the jet.
      // A widening hit radius models the blur of wet, uneven tarmac.
      float plumeReflection(vec3 rayOrigin, vec3 ray, vec3 emitter, float radius) {
        vec3 toLight = emitter - rayOrigin;
        float t = max(0.0, dot(toLight, ray));
        float d = length(toLight - t * ray);
        return exp(-4.0 * d * d / (radius * radius)) / (1.0 + t * 0.5);
      }

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 c = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(c), hash(c + vec2(1.0, 0.0)), f.x),
                   mix(hash(c + vec2(0.0, 1.0)), hash(c + 1.0), f.x), f.y);
      }

      void main() {
        vec3 viewer = normalize(cameraPosition - surface);
        vec2 p = surface.xz / metric;
        float grain = noise(p * 78.0);
        float wet = smoothstep(0.28, 0.76, noise(p * 5.5));
        vec3 normal = normalize(vec3((grain - 0.5) * 0.027, 1.0, (noise(p * 62.0) - 0.5) * 0.037));
        vec3 reflected = reflect(-viewer, normal);
        float fresnel = 0.15 + 0.85 * pow(1.0 - max(0.0, dot(viewer, normal)), 3.2);
        float spread = metric * mix(0.31, 0.16, wet);
        float rayLight = 0.0;
        if (energy > 0.001) {
          rayLight = plumeReflection(surface, reflected, mix(nozzle, tail, 0.18), spread);
          rayLight += 0.52 * plumeReflection(surface, reflected, mix(nozzle, tail, 0.57), spread * 1.3);
          rayLight += 0.19 * plumeReflection(surface, reflected, mix(nozzle, tail, 0.87), spread * 1.65);
        }
        float range = distance(surface, nozzle) / metric;
        float wash = exp(-range * 3.1) * 0.58;
        float floodlights = exp(-dot(p - vec2(-0.55, -0.26), p - vec2(-0.55, -0.26)) * 1.5) * 0.026;
        float grit = 0.5 + grain * 0.83;
        vec3 pavement = vec3(0.014, 0.017, 0.023) * grit + vec3(1.0, 0.73, 0.52) * floodlights;
        vec3 glow = vec3(1.0, 0.46, 0.17) * energy * (wash + rayLight * fresnel * (0.42 + wet * 1.35));
        float border = 1.0 - smoothstep(1.4, 6.5, length(p));
        gl_FragColor = vec4((pavement + glow) * border, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const ground = new T.Mesh(new T.PlaneGeometry(height * 14, height * 14), material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -height * .091;
  const deck = new T.Mesh(new T.CircleGeometry(radius * .999, 8), material);
  deck.rotation.x = -Math.PI / 2;
  deck.rotation.z = Math.PI / 2;
  deck.position.y = height * .001;
  const group = new T.Group();
  group.name = 'Journey_Wet_Deck';
  group.add(ground, deck);
  return {
    group,
    update(nozzle: T.Vector3, axis: T.Vector3, length: number, intensity: number) {
      uniforms.nozzle.value.copy(nozzle);
      uniforms.tail.value.copy(nozzle).addScaledVector(axis, -length);
      uniforms.energy.value = intensity;
    },
  };
}

export function createJourneyVapor(height: number, radius: number, count: number) {
  const geometry = new T.PlaneGeometry(2, 2);
  const fades = new T.InstancedBufferAttribute(new Float32Array(count), 1);
  geometry.setAttribute('particleFade', fades);
  const uniforms = { power: { value: 0 }, phase: { value: 0 } };
  const material = new T.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: `
      attribute float particleFade;
      varying vec2 puff;
      varying float haze;
      varying float drift;
      void main() {
        vec4 center = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        center.xy += position.xy * length(instanceMatrix[0].xyz);
        puff = uv * 2.0 - 1.0;
        haze = particleFade;
        drift = instanceMatrix[3].x * 12.0 + instanceMatrix[3].z * 8.0;
        gl_Position = projectionMatrix * center;
      }`,
    fragmentShader: `
      uniform float power;
      uniform float phase;
      varying vec2 puff;
      varying float haze;
      varying float drift;
      void main() {
        float eddies = 0.68 + 0.2 * sin(puff.x * 7.2 + puff.y * 4.4 + drift + phase)
                            + 0.12 * sin(puff.x * 14.8 - puff.y * 9.3 - drift);
        float edge = 1.0 - smoothstep(0.25, 1.0, length(puff));
        float density = edge * edge * haze * eddies;
        vec3 smoke = mix(vec3(0.14, 0.17, 0.21), vec3(0.66, 0.37, 0.19), power * (1.0 - (puff.y + 1.0) * 0.45));
        gl_FragColor = vec4(smoke, density);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const vapor = new T.InstancedMesh(geometry, material, count);
  vapor.name = 'VentAndSmoke_Emitter';
  vapor.frustumCulled = false;
  vapor.instanceMatrix.setUsage(T.DynamicDrawUsage);
  fades.setUsage(T.DynamicDrawUsage);
  vapor.renderOrder = 3;
  const shape = new T.Object3D();

  return {
    vapor,
    update(t: number, release: number, power: number, fade: number, reduced: boolean) {
      vapor.visible = power > 0 && fade < 1;
      if (!vapor.visible) return;
      uniforms.power.value = power;
      uniforms.phase.value = reduced ? 0 : t * 1.4;
      for (let i = 0; i < count; i++) {
        const age = reduced ? (i + .5) / count : (t * (.29 + release * .12) + i / count) % 1;
        const direction = i * 2.39996323;
        const spread = radius * (1.05 + age * 1.35) + height * age * release * .42;
        shape.position.set(Math.cos(direction) * spread, height * (.046 + age * .11), Math.sin(direction) * spread);
        shape.scale.setScalar(height * (.045 + age * .22) * (.72 + release * .28));
        shape.updateMatrix();
        vapor.setMatrixAt(i, shape.matrix);
        fades.setX(i, Math.sin(Math.PI * age) * power * (1 - fade) * (reduced ? .22 : .48));
      }
      vapor.instanceMatrix.needsUpdate = true;
      fades.needsUpdate = true;
    },
  };
}
