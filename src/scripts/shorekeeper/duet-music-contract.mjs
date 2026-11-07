/** Read-only provider recognition. The G11.3/S5 cinematic sequence runs only with authenticated source clips. */
export function duetMusicSnapshot(sample=null){
 const statuses=['no_music','ready','playing','paused','buffering','ended','unavailable'];
 const status=statuses.includes(sample?.status)?sample.status:'no_music';
 const provider=['youtube','spotify'].includes(sample?.provider)?sample.provider:'none';
 const confirmed=provider!=='none'&&status==='playing'&&sample?.playbackConfirmed===true;
 const positive=v=>Number.isFinite(v)&&v>=0?v:null;
 return Object.freeze({state:confirmed?'PLAYING_CONFIRMED':status.toUpperCase(),status,provider,
  playbackConfirmed:confirmed,epoch:Number.isSafeInteger(sample?.epoch)&&sample.epoch>=0?sample.epoch:null,
  positionSeconds:positive(sample?.positionSeconds),observedAt:positive(sample?.observedAt),
  synchronizationQuality:['verified','estimated','unavailable'].includes(sample?.synchronizationQuality)?sample.synchronizationQuality:'unavailable',
  choreography:confirmed?'G113_S5_CINEMATIC_APPROVED':'QUIET_RANDOM_IDLE_FACIAL',beatSynchronization:'NONE'});
}
