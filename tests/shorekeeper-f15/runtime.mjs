import fs from 'node:fs';
globalThis.self=globalThis; globalThis.createImageBitmap=async()=>({width:2048,height:2048,close(){}});
const T=await import('three'); const {GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js');
const p=process.argv[2]; if(!p)throw Error('Usage: node runtime.mjs /private/model.glb');
const bytes=fs.readFileSync(p); const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const meshes=[];gltf.scene.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o)});gltf.scene.updateMatrixWorld(true);
let bad=0, points=0;const v=new T.Vector3();for(const m of meshes){m.skeleton.update();const pos=m.geometry.attributes.position;for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i);m.applyBoneTransform(i,v);if(![v.x,v.y,v.z].every(Number.isFinite))bad++;points++}}
const sets=gltf.animations.map(c=>new Set(c.tracks.map(t=>t.name)));const shared=[...sets[0]].filter(t=>sets[1].has(t));
const morphs={};for(const m of meshes){let names=m.morphTargetDictionary||{};if(Object.keys(names).length)morphs[m.name]=Object.keys(names).filter(n=>/E_Close|E_Smile|Pupil/.test(n));}
const sparse=json.accessors.filter(a=>a.sparse).length;let finite=true,changed=[];
for(const clip of gltf.animations){const mixer=new T.AnimationMixer(gltf.scene);const before=meshes[0].skeleton.bones.map(b=>b.quaternion.toArray());const action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();for(let i=0;i<100;i++){mixer.update(clip.duration/100);gltf.scene.updateMatrixWorld(true);for(const b of meshes[0].skeleton.bones){if(![...b.position.toArray(),...b.quaternion.toArray(),...b.scale.toArray(),...b.matrixWorld.elements].every(Number.isFinite))finite=false;}}changed.push(meshes[0].skeleton.bones.filter((b,i)=>b.quaternion.toArray().some((x,j)=>Math.abs(x-before[i][j])>1e-6)).length);mixer.stopAllAction();mixer.uncacheRoot(gltf.scene);}
const assets={geometry:new Set(),material:new Set(),texture:new Set(),skeleton:new Set()};for(const m of meshes){assets.geometry.add(m.geometry);assets.skeleton.add(m.skeleton);for(const a of Array.isArray(m.material)?m.material:[m.material]){assets.material.add(a);for(const value of Object.values(a))if(value?.isTexture)assets.texture.add(value)}}
const disposed={};for(const [key,set] of Object.entries(assets)){let events=0;for(const obj of set){obj.addEventListener?.('dispose',()=>events++);obj.dispose();}disposed[key]={objects:set.size,events};}
console.log(JSON.stringify({three:T.REVISION,bytes:bytes.length,meshes:meshes.length,joints:meshes.map(m=>m.skeleton.bones.length),sparse,morphs,neutralSkin:{points,bad},clips:gltf.animations.map((c,i)=>({name:c.name,duration:c.duration,tracks:c.tracks.length,changedBonesAtEnd:changed[i]})),shared:shared.length,finite,disposed,imageDecode:'mocked; no PNG decode or WebGL'},null,2));
