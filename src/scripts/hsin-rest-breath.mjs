import {breathSignal} from './hsin-limb-motion.mjs';
/** Sub-millimetric torso sway at rest, removed exactly before any baked arm trajectory.
 * A separate spine channel; arm, finger and facial channels are untouched. */
export function createRestBreath({THREE,bone,update=()=>bone?.updateWorldMatrix(true,true)}){
 const baseline=bone?.quaternion.clone(),axis=new THREE.Vector3(1,0,0);let time=0;
 return {
  advance(dt){if(!baseline||!Number.isFinite(dt)||dt<0)return;time+=dt;bone.quaternion.copy(baseline).multiply(new THREE.Quaternion().setFromAxisAngle(axis,breathSignal(time)*.0015));update();},
  restore(){if(!baseline)return;bone.quaternion.copy(baseline);update();},
 };
}
