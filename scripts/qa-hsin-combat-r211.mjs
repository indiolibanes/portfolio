/** Trajectory audit. Does not alter an asset or infer energy from one velocity peak. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {createCombatDirector} from '../src/scripts/hsin-combat-director.mjs';
import {danceRig} from './lib/hsin-dance-rig.mjs';
import {decodeCombatData} from '../src/scripts/hsin-combat-data.mjs';
import {createCombatPose} from '../src/scripts/hsin-combat-pose.mjs';
const [beforePath,afterPath,output]=process.argv.slice(2);
if(!output)throw Error('Usage: BEFORE.json AFTER.json OUT.json');
const before=JSON.parse(await readFile(beforePath)),after=JSON.parse(await readFile(afterPath));
const r=await danceRig(),{T,by,model,bones}=r;
const markers=before.sequence.markers;
const data=decodeCombatData(structuredClone(before)),pose=createCombatPose({T,data,bones,model});
const shoulder=by.get('ORG-Bip001UpperArmR'),hand=by.get('ORG-Bip001HandR'),spine=by.get('ORG-Bip001Spine2');
const points=[],relative=[],reach=[];
const lateral=by.get('ORG-Bip001UpperArmL').getWorldPosition(new T.Vector3()).sub(shoulder.getWorldPosition(new T.Vector3())).setY(0).normalize();
const forward=lateral.clone().cross(new T.Vector3(0,1,0)).normalize();
for(let frame=0;frame<data.frameCount;frame++){
 pose.apply(frame/(data.frameCount-1));model.updateMatrixWorld(true);
 const point=hand.getWorldPosition(new T.Vector3()),origin=shoulder.getWorldPosition(new T.Vector3());
 points.push(point.toArray());relative.push(point.clone().sub(origin).applyQuaternion(spine.getWorldQuaternion(new T.Quaternion()).invert()).toArray());
 reach.push(point.clone().sub(origin).dot(forward));
}
function speed(track,frame){return frame?Math.hypot(...track[frame].map((v,i)=>v-track[frame-1][i]))*30:0;}
function peak(track){let frame=47;for(let i=47;i<=75;i++)if(speed(track,i)>speed(track,frame))frame=i;return {time:frame/30,speedMps:speed(track,frame)};}
const marker=markers.find(([name])=>name==='arc')[1],impactFrame=Math.round(marker*30);
let maxReachFrame=47;for(let i=47;i<=75;i++)if(reach[i]>reach[maxReachFrame])maxReachFrame=i;
const beforeBytes=Buffer.from(before.quaternions,'base64'),afterBytes=Buffer.from(after.quaternions,'base64');
const changed=after.names.filter((name,i)=>{
 const a=beforeBytes,b=afterBytes;
 for(let f=0;f<after.frameCount;f++)for(let k=0;k<4;k++){
  const at=(f*after.names.length*4+i*4+k)*2;if(a.readInt16LE(at)!==b.readInt16LE(at))return true;
 }return false;
});
const runtimeEvents=[];
const director=createCombatDirector({pose:{apply(){},restore(){},beginRecovery(){},recover(){}},sequence:before.sequence,onEvent:name=>{
 const planned=markers.find(([event])=>event===name)?.[1];
 runtimeEvents.push({name,planned,actual:director.sample().time,delayMs:(director.sample().time-planned)*1000});
}});
director.start();for(let frame=0;frame<253;frame++)director.advance(1/30);
const report={runtimeEvents,
 base:'8c4817288702b53c24eb5708e21200d49c03dd9a',
 basic01:{marker,relativePeak:peak(relative),worldPeak:peak(points),speedAtImpact:{relative:speed(relative,impactFrame),world:speed(points,impactFrame)},maxForwardReach:{time:maxReachFrame/30,meters:reach[maxReachFrame]},reachAtImpact:reach[impactFrame],samples:[1.55,1.7333333333333334,1.9,2.066666666666667,2.2,2.3].map(t=>({time:t,world:points[Math.round(t*30)],worldSpeed:speed(points,Math.round(t*30)),relativeSpeed:speed(relative,Math.round(t*30))}))},
 changedQuaternionChannels:changed,
 supportPositionsUnchanged:JSON.stringify(before.positionFrames)===JSON.stringify(after.positionFrames),
 markersUnchanged:JSON.stringify(before.sequence)===JSON.stringify(after.sequence),
 note:'All velocities are finite differences at 30Hz. A marker near maximum reach need not coincide with the peak of the outward sweep.'
};
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.basic01));
