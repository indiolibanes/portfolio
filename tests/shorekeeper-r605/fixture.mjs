import * as T from 'three';
/** Synthetic calibration rig only. No game geometry, animation or reference image. */
export function makeAuditFixture(){
 const model=new T.Group(),root=new T.Bone();root.name='Root';model.add(root);
 const bip=new T.Bone();bip.name='Bip001';root.add(bip);
 for(const [name,x,y] of [['Bip001Pelvis',0,1],['Bip001Head',0,1.8],['Bip001LHand',-.4,1.3],['Bip001RHand',.4,1.3],['LFoot',-.2,0],['RFoot',.2,0]]){const b=new T.Bone();b.name=name;b.position.set(x,y,0);bip.add(b);}
 const bones=[];model.traverse(b=>{if(b.isBone)bones.push(b);});model.updateMatrixWorld(true);
 const g=new T.BufferGeometry(),positions=[-.25,0,0,-.15,0,0,-.2,0,.15,.15,0,0,.25,0,0,.2,0,.15];g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.computeVertexNormals();
 const indices=[],weights=[];for(let i=0;i<6;i++){indices.push(bones.findIndex(b=>b.name===(i<3?'LFoot':'RFoot')),0,0,0);weights.push(1,0,0,0);}
 g.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4));
 const mesh=new T.SkinnedMesh(g,new T.MeshBasicMaterial({color:0x64bef5,side:T.DoubleSide}));mesh.name='SyntheticSoles';model.add(mesh);mesh.bind(new T.Skeleton(bones));
 const times=Array.from({length:9},(_,i)=>i*.25).concat(3),values=[];
 for(let i=0;i<times.length;i++)new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI+Math.min(i,8)*Math.PI/2).toArray(values,i*4);
 const clip=new T.AnimationClip('SK_BURST_01_ORIGINAL',3,[new T.QuaternionKeyframeTrack('Root.quaternion',times,values),new T.VectorKeyframeTrack('Root.position',[0,.5,1,1.5,2,3],[0,0,0,0,1,0,0,2,0,0,1,0,0,0,0,0,0,0])]);
 const calibration={evidence:'SYNTHETIC_FIXTURE_ONLY',units:'fixture_unit',floorY:0,forwardLocalByBone:{Root:[0,0,1],Bip001:[0,0,1]},heightTolerance:.001,velocityTolerance:.01,sustainSeconds:.15,soles:[{side:'L',mesh:mesh.name,indices:[0,1,2],evidence:'fixture geometry'},{side:'R',mesh:mesh.name,indices:[3,4,5],evidence:'fixture geometry'}]};
 return {model,clip,calibration};
}
