import * as THREE from 'three';

/**
 * Kit de luzes relativo à câmera (o aspecto se mantém ao orbitar):
 *  - chave quente, alto à esquerda/frente
 *  - contraluz lunar frio (recorte nas orelhas e na pelagem)
 *  - hemisférica azul-noite para encher sombras sem lavar as cores
 * As direções são giradas junto com a câmera a cada atualização.
 * Intensidades calibradas (r186, luzes físicas: diffuse = albedo·E/π) para que o creme
 * atinja ~97 % do brilho do albedo sem tingir: medido em tools/fidelity.py.
 */
export function createLightRig() {
  const group = new THREE.Group();
  group.name = 'sophia-lights';

  const key = new THREE.DirectionalLight('#fff0dc', 2.4);
  const rim = new THREE.DirectionalLight('#9db8ff', 1.5);
  const bounce = new THREE.DirectionalLight('#ffd7a3', 0.3);
  const hemi = new THREE.HemisphereLight('#e9eeff', '#2a2540', 1.5);
  group.add(key, rim, bounce, hemi, key.target, rim.target, bounce.target);

  // direções em espaço da câmera (x→direita, y→cima, z→em direção ao observador)
  const local = {
    key: new THREE.Vector3(-0.9, 1.4, 1.6).normalize(),
    rim: new THREE.Vector3(1.5, 0.9, -1.6).normalize(),
    bounce: new THREE.Vector3(1.0, -0.3, 1.2).normalize(),
  };
  const tmp = new THREE.Vector3();

  function update(camera, target) {
    for (const [name, light] of [['key', key], ['rim', rim], ['bounce', bounce]]) {
      tmp.copy(local[name]).applyQuaternion(camera.quaternion);
      light.position.copy(target).addScaledVector(tmp, 6);
      light.target.position.copy(target);
    }
  }

  return {
    group,
    lights: { key, rim, bounce, hemi }, // exposto p/ ajuste fino/QA
    update,
    setIntensity(k) {
      key.intensity = 2.4 * k;
      rim.intensity = 1.5 * k;
      bounce.intensity = 0.3 * k;
      hemi.intensity = 1.5 * k;
    },
  };
}
