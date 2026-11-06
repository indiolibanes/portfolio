const owners=new WeakMap();
export function claimCameraOwner(stage,label){if(owners.has(stage))throw Error('Camera already owned by '+owners.get(stage).label);const token={label};owners.set(stage,token);return ()=>{if(owners.get(stage)===token)owners.delete(stage);};}
export function cameraOwner(stage){return owners.get(stage)?.label??null;}
