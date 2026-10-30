/**
 * Sophia's original 6H GLB uses white base colors for Sophia_tail and
 * Sophia_tail_locks. The renderer previously attempted to recolor all skinned
 * materials, missing the tail and risking damage to the coat/face.
 *
 * Change ONLY tail materials. A navy fallback color works even if shader
 * customization is unavailable. On WebGL, blend ivory-to-navy by the already
 * rigged tail joints. Retain the original emissive constellation texture.
 */
export function applyConstellationTail(fox) {
  const owned = new Set();
  const changed = [];

  fox.traverse((object) => {
    if (!object.isSkinnedMesh || !object.skeleton?.bones) return;
    const tailBones = object.skeleton.bones.map((bone, index) => {
      const m = /^tail_(\d+)$/i.exec(bone.name);
      return m ? { index, order: Number(m[1]) } : null;
    }).filter(Boolean);
    if (!tailBones.length) return;

    const terms = tailBones.map(({ index, order }) => {
      const weight = Math.max(0.06, Math.min(1, (order - 1) / 5));
      const id = Number(index).toFixed(1);
      const member = ['x','y','z','w'].map(
        (axis) => '(abs(skinIndex.' + axis + '-' + id + ')<0.5?skinWeight.' + axis + ':0.0)'
      ).join('+');
      return '(' + member + ')*' + weight.toFixed(3);
    });
    const reference = Array.isArray(object.material) ? object.material : [object.material];
    const replacement = reference.map((original) => {
      const name = original?.name || '';
      if (!/^Sophia_tail(?:_locks)?$/i.test(name)) return original;
      if (!original.isMeshStandardMaterial && !original.isMeshPhysicalMaterial) return original;

      const material = original.clone();
      // Strong deterministic fallback: never leave the tail white on a device
      // where the skinning shader hook cannot run.
      material.color.set('#253b77');
      material.roughness = 0.84;
      material.metalness = 0;
      material.onBeforeCompile = (shader) => {
        const varying = 'varying float vSophiaTailGradient;';
        shader.vertexShader = shader.vertexShader.replace(
          '#include <common>', '#include <common>\n' + varying
        );
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n#ifdef USE_SKINNING\n'
          + 'vSophiaTailGradient=clamp(' + terms.join('+') + ',0.0,1.0);\n'
          + '#else\nvSophiaTailGradient=0.8;\n#endif'
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <common>', '#include <common>\n' + varying
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          '#include <color_fragment>\n'
          + 'float sophiaInk=smoothstep(0.13,0.72,vSophiaTailGradient);\n'
          + 'vec3 sophiaIvory=vec3(0.88,0.80,0.66);\n'
          + 'vec3 sophiaNavy=vec3(0.035,0.06,0.25);\n'
          + 'diffuseColor.rgb=mix(sophiaIvory,sophiaNavy,sophiaInk);'
        );
      };
      material.customProgramCacheKey = () => 'sophia-tail-specific-v3-' + tailBones.map(t=>t.index).join('-');
      material.needsUpdate = true;
      owned.add(material);
      changed.push(name);
      return material;
    });
    object.material = Array.isArray(object.material) ? replacement : replacement[0];
  });
  return { changed, dispose: () => { for (const material of owned) material.dispose(); } };
}
