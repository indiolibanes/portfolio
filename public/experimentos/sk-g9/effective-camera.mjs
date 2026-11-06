/** Read-only capture metadata. Does not own a camera, RAF, mixer or presentation clock. */
const arrays={position:3,target:3,worldMatrix:16,projectionMatrix:16};
const scalars=['fov','aspect','dpr','near','far','pixelWidth','pixelHeight'];
function valid(s){return !!s&&Object.entries(arrays).every(([k,n])=>Array.isArray(s[k])&&s[k].length===n&&s[k].every(Number.isFinite))&&scalars.every(k=>Number.isFinite(s[k]))&&s.aspect>0&&s.dpr>0&&s.pixelWidth>0&&s.pixelHeight>0;}
export function readEffectiveCamera(stage){
 const c=stage.camera;
 const s={position:c.position.toArray(),target:stage.orbit.target.toArray(),worldMatrix:c.matrixWorld.toArray(),projectionMatrix:c.projectionMatrix.toArray(),fov:c.fov,aspect:c.aspect,dpr:stage.renderer.getPixelRatio(),near:c.near,far:c.far,pixelWidth:stage.canvas.width,pixelHeight:stage.canvas.height};
 if(!valid(s))throw Error('Invalid effective camera metadata');
 return Object.freeze({...s,...Object.fromEntries(Object.keys(arrays).map(k=>[k,Object.freeze(s[k])]))});
}
export function compareEffectiveCameras(a,b,tolerance=1e-9){
 if(!Number.isFinite(tolerance)||tolerance<0)throw Error('Invalid camera tolerance');
 if(!valid(a)||!valid(b))return {status:'INVALID_METADATA',cameraEqualityOnly:true};
 const differences={};
 for(const k of Object.keys(arrays)){const d=Math.max(...a[k].map((x,i)=>Math.abs(x-b[k][i])));if(d>tolerance)differences[k]=d;}
 for(const k of scalars){const d=Math.abs(a[k]-b[k]);if(d>tolerance)differences[k]=d;}
 return {status:Object.keys(differences).length?'CAMERA_MISMATCH':'CAMERA_MATCH',differences,tolerance,cameraEqualityOnly:true,humanVisualAcceptance:'PENDING'};
}
