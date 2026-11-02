import * as T from 'three';
export function boneGroup(name){if(/Hair/i.test(name))return 'Cabelo';if(/Skirt/i.test(name))return 'Saia';if(/Piao|Ribbon|Accessory/i.test(name))return 'Fitas e acessórios';if(/Neck|Head/i.test(name))return 'Pescoço e cabeça';if(/Arm|Hand|Finger|Clavicle/i.test(name))return 'Braços e mãos';if(/Thigh|Calf|Foot|Toe|Leg/i.test(name))return 'Pernas';return 'Corpo';}
export function morphGroup(name,mesh=''){if(/Down|Alpha/.test(mesh)||/^[LR]_/.test(name))return 'Acessórios / tecido';if(/^Pupil/.test(name))return 'Olhar e pupilas';if(/^B_/.test(name))return 'Sobrancelhas';if(/^E_/.test(name))return 'Pálpebras';if(/^(M_|P_M|[AEIOU]|Aa$)/.test(name))return 'Boca';return 'Expressões compostas';}
export const FACE_PRESETS={neutral:{},blink:{E_Close:1},smile:{E_Smile_L:.25,E_Smile_R:.25,M_Smile_L:.4,M_Smile_R:.4,B_Happy:.2},sad:{B_Sad:.4,E_Sad:.3},attention:{E_Focus:.3},lateral:{Pupil_L:.35}};
export function createInspection(model){
 const bones=[],meshes=[],morphMeshes=[],rest=new Map(),offsets=new Map(),weights={},variants=new Map();
 model.traverse(o=>{if(o.isBone){bones.push(o);rest.set(o,{position:o.position.clone(),quaternion:o.quaternion.clone(),scale:o.scale.clone()});}if(o.isMesh){meshes.push(o);if(o.morphTargetDictionary)morphMeshes.push(o);}});
 const originals=meshes.map(mesh=>({mesh,array:Array.isArray(mesh.material),materials:Array.isArray(mesh.material)?mesh.material:[mesh.material]}));
 const names=[...new Set(morphMeshes.flatMap(m=>Object.keys(m.morphTargetDictionary)))].sort();
 const applyMorphs=()=>{for(const m of morphMeshes)for(const [n,i] of Object.entries(m.morphTargetDictionary))m.morphTargetInfluences[i]=weights[n]??0;};
 let materialMode='original',wireframe=false;
 return {bones,meshes,morphMeshes,names,rest,weights,offsets,
 setMorph(name,value){if(!names.includes(name))return false;if(!Number.isFinite(value)||value<0||value>1)throw Error('Peso fora de 0–1');weights[name]=value;applyMorphs();return true;},
 preset(config){for(const n of names)weights[n]=0;for(const [n,v] of Object.entries(config))if(names.includes(n))weights[n]=Math.max(0,Math.min(1,v));applyMorphs();},
 rotate(bone,xyz){if(!rest.has(bone)||xyz.some(x=>!Number.isFinite(x)||Math.abs(x)>45))throw Error('Rotação inválida');bone.quaternion.copy(rest.get(bone).quaternion).multiply(new T.Quaternion().setFromEuler(new T.Euler(...xyz.map(T.MathUtils.degToRad),'XYZ')));offsets.set(bone.name,[...xyz]);model.updateMatrixWorld(true);},
 restore(){for(const [bone,r] of rest){bone.position.copy(r.position);bone.quaternion.copy(r.quaternion);bone.scale.copy(r.scale);}offsets.clear();model.updateMatrixWorld(true);},
 restError(){let error=0;for(const [b,r] of rest){error=Math.max(error,b.position.distanceTo(r.position),b.scale.distanceTo(r.scale),...b.quaternion.toArray().map((x,i)=>Math.abs(x-r.quaternion.toArray()[i])));}return error;},
 boneInfo(bone){if(!bone)return null;const affected=[];for(const m of meshes){const i=m.skeleton?.bones.indexOf(bone)??-1;if(i<0)continue;const joint=m.geometry.attributes.skinIndex,weight=m.geometry.attributes.skinWeight;let vertices=0;if(joint&&weight)for(let v=0;v<joint.count;v++){for(let c=0;c<4;c++)if(joint[['getX','getY','getZ','getW'][c]](v)===i&&weight[['getX','getY','getZ','getW'][c]](v)>0){vertices++;break;}}if(vertices)affected.push({mesh:m.name,vertices});}return {name:bone.name,parent:bone.parent?.name||'(raiz)',children:bone.children.filter(b=>b.isBone).map(b=>b.name),position:bone.position.toArray(),quaternion:bone.quaternion.toArray(),affected};},
 materials(mode,wire=wireframe){materialMode=mode;wireframe=wire;for(const row of originals){const selected=row.materials.map(m=>{if(mode==='original'){m.wireframe=wire;return m;}const key=m.uuid+':'+mode;if(!variants.has(key)){if(mode==='neutral')variants.set(key,new T.MeshStandardMaterial({color:0xc4cbd0,roughness:1,side:m.side}));else if(mode==='mask'&&/Bangs|Alpha/i.test(m.name)){const v=m.clone();v.transparent=false;v.alphaTest=.5;v.depthWrite=true;variants.set(key,v);}else return m;}const result=variants.get(key);result.wireframe=wire;return result;});row.mesh.material=row.array?selected:selected[0];}},
 get materialMode(){return materialMode;},get extraMaterials(){return [...originals.flatMap(r=>r.materials),...variants.values()];},
 summary(){return {meshes:meshes.length,bones:bones.length,morphs:morphMeshes.reduce((s,m)=>s+m.morphTargetInfluences.length,0),triangles:meshes.reduce((s,m)=>s+(m.geometry.index?.count??m.geometry.attributes.position.count)/3,0)};}
 };
}
