export function decodeCombatData(data){
 if(!['combat-r1','combat-r2'].includes(data.version)||!Array.isArray(data.names)||new Set(data.names).size!==data.names.length||data.rest.length!==data.names.length*4||!Number.isSafeInteger(data.frameCount)||data.frameCount<2)throw Error('Invalid combat bake');
 const raw=Uint8Array.from(atob(data.quaternions),c=>c.charCodeAt(0));
 if(raw.byteLength!==data.frameCount*data.rest.length*2)throw Error('Invalid combat buffer');
 const view=new DataView(raw.buffer);
 data.frames=Array.from({length:data.frameCount},(_,f)=>Float32Array.from({length:data.rest.length},(_,k)=>view.getInt16((f*data.rest.length+k)*2,true)/32767));
 if(data.recovery){
  const rawRecovery=Uint8Array.from(atob(data.recovery.quaternions),c=>c.charCodeAt(0)),viewRecovery=new DataView(rawRecovery.buffer);
  const count=data.frameCount*data.recovery.steps*data.recovery.names.length*4;
  if(rawRecovery.length!==count*2)throw Error('Invalid recovery buffer');
  data.recovery.values=Float32Array.from({length:count},(_,i)=>viewRecovery.getInt16(i*2,true)/32767);
 }
 data.frames[0]=data.rest;data.frames[data.frames.length-1]=data.rest;
 delete data.quaternions;
 if(data.recovery)delete data.recovery.quaternions;
 return data;
}
