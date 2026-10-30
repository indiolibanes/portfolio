/* Tone the tip of the existing skinned tail using its own joints.
   No geometry editing, external material or modification to the shared cached GLB. */
export function applyConstellationTail(fox) {
  const allocated = new Set();
  fox.traverse((mesh) => {
    if (!mesh.isSkinnedMesh || !mesh.skeleton?.bones?.length) return;
    const tails = mesh.skeleton.bones.map((bone,index) => ({name:bone.name,index}))
      .filter((bone)=>/^tail(?:_|\.|$)/i.test(bone.name));
    if (!tails.length) return;
    const terms = tails.map(({name,index})=>{
      const level = Number(name.match(/(\d+)$/)?.[1]||1);
      const tone = level<=1?0.20:level===2?0.70:1.0;
      const id = index.toFixed(1);
      return '(abs(skinIndex.x-'+id+')<0.5?skinWeight.x:0.0)*'+tone.toFixed(2)
        +' + (abs(skinIndex.y-'+id+')<0.5?skinWeight.y:0.0)*'+tone.toFixed(2)
        +' + (abs(skinIndex.z-'+id+')<0.5?skinWeight.z:0.0)*'+tone.toFixed(2)
        +' + (abs(skinIndex.w-'+id+')<0.5?skinWeight.w:0.0)*'+tone.toFixed(2);
    });
    const originals = Array.isArray(mesh.material)?mesh.material:[mesh.material];
    const modified = originals.map((original) => {
      if (!original?.isMeshStandardMaterial && !original?.isMeshPhysicalMaterial) return original;
      const material=original.clone();allocated.add(material);
      material.onBeforeCompile=(shader)=>{
        const m='varying float vSophiaTailTone;';
        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+m);
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
          '#include <begin_vertex>\n#ifdef USE_SKINNING\nvSophiaTailTone=clamp('+terms.map(t=>'('+t+')').join('+')+',0.0,1.0);\n#else\nvSophiaTailTone=0.0;\n#endif');
        shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+m);
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
          '#include <color_fragment>\nfloat tailInk=smoothstep(0.15,0.88,vSophiaTailTone);\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.055,0.085,0.30),tailInk*0.89);');
      };
      material.customProgramCacheKey=()=> 'sophia-tail-v2-'+tails.map(t=>t.index).join('-');
      material.needsUpdate=true;
      return material;
    });
    mesh.material=Array.isArray(mesh.material)?modified:modified[0];
  });
  return () => { for (const material of allocated) material.dispose(); };
}
