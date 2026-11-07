// Offline evidence only. Run from the repository root with Node.
import fs from 'node:fs';
import {loadRig, forward, sanitize} from './lib/hsin-rig.mjs';

const out = 'docs/hsin-combat-preflight/';
const models = 'public/assets/models/hsin/';
const read = path => JSON.parse(fs.readFileSync(path));
const rig = loadRig(fs.readFileSync(models + 'hsin-v2.0.glb'));
const world = forward(rig);
const profile = read(models + 'hsin-v2.1-profile.json');
const acting = read(models + 'hsin-v2.1-acting.json');
const writers = new Map();
function register(names, property, label) {
  for (const name of names ?? []) {
    const key = name + ':' + property;
    writers.set(key, [...(writers.get(key) ?? []), label]);
  }
}
register(profile.cinematicIdle.reference.map(row => row.name), 'q', 'cinematic baseline');
register(['ORG-Bip001Neck','DEF-Bip001Neck','ORG-Bip001Head','DEF-Bip001Head'], 'q', 'presentation baseline');
for (const [name, pose] of Object.entries({...profile.poses, ...acting.poses})) {
  register(pose.names, 'q', name);
}
for (const version of ['r2','r3','r3-grand']) {
  const data = read('public/assets/animations/hsin/lunar-dance-' + version + '.json');
  register(data.names, 'q', version);
  register(data.secondary?.names, 'q', version + '/secondary');
  register(data.positionNames, 't', version);
}
const weightCounts = new Map();
for (const mesh of rig.meshes) {
  for (let i=0; i<mesh.weights.length; i++) {
    if (mesh.weights[i] <= 0) continue;
    const node = rig.joints[mesh.jointIds[i]];
    weightCounts.set(node, (weightCounts.get(node) ?? 0) + 1);
  }
}
const rows = [['node','raw_name','binding_name','parent_node','skin:joint','local_t','local_q_xyzw','local_s','world_rest_xyz','weighted_slots','quaternion_pose_writers','position_pose_writers','combat_policy']];
for (const [i,node] of rig.json.nodes.entries()) {
  const name = sanitize(node.name), rest = rig.rest[i];
  const skins = rig.json.skins.flatMap((skin,s) => skin.joints.includes(i) ? [s+':'+skin.joints.indexOf(i)] : []);
  const q = writers.get(name+':q') ?? [], t = writers.get(name+':t') ?? [];
  rows.push([i,node.name,name,rig.parent[i],skins,rest.t,rest.q,rest.s,world.slice(i*16+12,i*16+15),weightCounts.get(i) ?? 0,q,t,
    q.length || t.length ? 'exclusive lease; sampled channel O(1)' : 'inherit; no combat write']);
}
const cell = x => '"' + (typeof x === 'object' ? Array.from(x).join(' ') : String(x)).replaceAll('"','""') + '"';
fs.writeFileSync(out+'rig-ownership-matrix.csv',rows.map(row=>row.map(cell).join(',')).join('\n')+'\n');
const atlas = ['# Hsin · atlas de deformação','',
  'Medição no GLB de produção. Pico é a maior norma de deslocamento local de um vértice com peso unitário. Os limites do perfil são tetos operacionais. A aparência e a intensidade segura das combinações de combate ainda exigem comparação frontal, lateral e ¾.','',
  '| Malha | Material | Canal | Vértices móveis | Pico (mm) | Repouso | Teto automático do perfil |','|---|---|---|---:|---:|---:|---:|'];
for (const mesh of rig.meshes) {
  mesh.morphNames.forEach((name,index) => {
    let count=0, peak=0;
    const d=mesh.morphs[index];
    for(let k=0;k<d.length;k+=3) {
      const magnitude=Math.hypot(d[k],d[k+1],d[k+2]);
      if(magnitude>0) count++;
      peak=Math.max(peak,magnitude);
    }
    atlas.push('| '+[mesh.name,mesh.material,name,count,(peak*1000).toFixed(3),mesh.defaultMorph[name] ?? 0,profile.limits[name] ?? 'árbitro/calibração'].join(' | ')+' |');
  });
}
fs.writeFileSync(out+'facial-morph-atlas.md',atlas.join('\n')+'\n\n'+fs.readFileSync(out+'facial-recipes.md','utf8'));
