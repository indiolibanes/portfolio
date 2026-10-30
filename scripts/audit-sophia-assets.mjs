// Read-only GLB structural audit. No Blender or canvas required.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const paths = [
  'public/experimental/sophia-alpha.glb',
  'public/experimental/sophia.glb',
  'public/experimental/sophia-vetorial.glb',
];
const key = /livro|book|page|pagina|página|pen|pencil|paper|quill|scroll|notebook|journal|caderno|caneta|tail|cauda|fur|pelo|constel|eye|iris|head|cabeca|head|sophia|hand|arm/i;
function describe(path) {
  const buf = readFileSync(path);
  if (buf.toString('ascii', 0, 4) !== 'glTF') throw Error('Not GLB: ' + path);
  const len = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString('utf8', 20, 20 + len));
  const nodes = json.nodes || [], meshes = json.meshes || [], mats = json.materials || [];
  const skins = json.skins || [], access = json.accessors || [];
  const images = json.images || [], textures = json.textures || [];
  const subjects = nodes.map((n, i) => ({
    i, name: n.name || '', mesh: n.mesh, skin: n.skin,
    parent: nodes.findIndex(p => p.children?.includes(i)),
    translation: n.translation, scale: n.scale,
  }));
  const named = subjects.filter(n => key.test(n.name));
  const meshInfo = meshes.map((m, i) => ({
    i, name: m.name || '', primitives: m.primitives?.map(p => ({
      mode: p.mode || 4, material: p.material, vertices: access[p.attributes?.POSITION]?.count || 0,
      indices: access[p.indices]?.count || 0, joints: Boolean(p.attributes?.JOINTS_0),
      targetCount: p.targets?.length || 0, attrs: Object.keys(p.attributes||{}),
      positionRange: {
        min:access[p.attributes?.POSITION]?.min,
        max:access[p.attributes?.POSITION]?.max,
      }
    })),
    linkedNodes: subjects.filter(n=>n.mesh === i).map(n=>({i:n.i,name:n.name,skin:n.skin}))
  }));
  const materialInfo = mats.map((m,i)=>({
    i, name:m.name, color:m.pbrMetallicRoughness?.baseColorFactor,
    metallic:m.pbrMetallicRoughness?.metallicFactor,
    roughness:m.pbrMetallicRoughness?.roughnessFactor,
    baseColorTexture:m.pbrMetallicRoughness?.baseColorTexture?.index,
    normalTexture:m.normalTexture?.index, emissiveTexture:m.emissiveTexture?.index,
    doubleSided:m.doubleSided
  }));
  const imageInfo=images.map((img,i)=>{
    let dims=null;
    const view=json.bufferViews?.[img.bufferView];
    if(view){
      const offset=20+len+8 + (8+(len%4?4-len%4:0)) + 0; // approximate, not used to infer PNG width
      void offset;
    }
    return {i, name:img.name, mimeType:img.mimeType, uri:img.uri?.slice(0,40), byteLength:view?.byteLength||0,dims};
  });
  const result={
    path,byteSize:buf.length,asset:json.asset,
    nodeCount:nodes.length, meshCount:meshes.length, materialCount:mats.length,
    images:imageInfo, textureCount:textures.length,
    animations:(json.animations||[]).map(a=>({name:a.name,channels:a.channels?.length})),
    skins:skins.map((s,i)=>({i,joints:s.joints?.length,rootNode:s.skeleton,jointNames:s.joints?.map(j=>nodes[j]?.name).filter(n=>key.test(n)).slice(0,60)})),
    namedCandidates:named,
    materialInfo, meshInfo,
    overallVerts:meshInfo.flatMap(m=>m.primitives||[]).reduce((sum,p)=>sum+p.vertices,0),
    extras:json.scene, generator:json.asset?.generator
  };
  return result;
}
const out = paths.map(describe);
mkdirSync('qa-results/sophia-asset-audit', {recursive:true});
writeFileSync('qa-results/sophia-asset-audit/report.json',JSON.stringify(out,null,2));
for (const r of out) {
  console.log('\nMODEL', r.path, r.byteSize, 'bytes,', r.overallVerts, 'vertices,',r.meshCount,'meshes,',r.images.length,'images');
  console.log('GENERATOR',r.generator,'SKINS',JSON.stringify(r.skins));
  console.log('NAMED NODES',JSON.stringify(r.namedCandidates));
  console.log('MESHES',JSON.stringify(r.meshInfo.map(m=>({i:m.i,name:m.name,v:m.primitives?.map(p=>p.vertices),node:m.linkedNodes}))));
  console.log('MATERIALS',JSON.stringify(r.materialInfo));
  console.log('IMAGES',JSON.stringify(r.images));
}
