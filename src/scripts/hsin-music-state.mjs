/** Source selection is not playback. Only provider callbacks can confirm PLAYING. No DOM or animation clock. */
export const MUSIC_STATUS=Object.freeze({NO_MUSIC:'no_music',PLAYER_READY:'ready',PLAYING:'playing',PAUSED:'paused',BUFFERING:'buffering',ENDED:'ended',UNAVAILABLE:'unavailable'});
const providers=new Set(['none','youtube','spotify']),statuses=new Set(Object.values(MUSIC_STATUS)),sessions=new WeakMap();
const seconds=v=>Number.isFinite(v)&&v>=0?v:null;
export function createMusicState({now=()=>performance.now()}={}){
 let epoch=0,disposed=false;const listeners=new Set();
 const empty=()=>({provider:'none',status:'no_music',trackId:null,positionSeconds:null,durationSeconds:null,observedAt:null,synchronizationQuality:'unavailable',playbackConfirmed:false,epoch});
 let state=Object.freeze(empty());const emit=next=>{state=Object.freeze(next);for(const listener of listeners)listener(state);return state;};
 return {
  select(provider){if(disposed||!providers.has(provider))return null;epoch++;emit({...empty(),provider,status:provider==='none'?'no_music':'ready',epoch});return epoch;},
  observe(token,report){
   if(disposed||token!==epoch||state.provider==='none'||!statuses.has(report.status))return false;
   const position=seconds(report.positionSeconds),duration=seconds(report.durationSeconds);
   emit({...state,status:report.status,trackId:typeof report.trackId==='string'?report.trackId:null,positionSeconds:position,durationSeconds:duration,observedAt:now(),playbackConfirmed:report.status==='playing',synchronizationQuality:report.status==='unavailable'?'unavailable':position===null?'estimated':'verified'});return true;
  },
  sample:()=>state,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  dispose(){if(disposed)return;epoch++;emit({...empty(),epoch});disposed=true;listeners.clear();},
 };
}
/** The stage passes the contract to the director; the director never inspects an iframe or DOM. */
export function musicForStage(stage){let controller=sessions.get(stage);if(!controller){controller=createMusicState();sessions.set(stage,controller);}return controller;}
export function youtubeReport(player,state){
 const status=({[-1]:'ready',0:'ended',1:'playing',2:'paused',3:'buffering',5:'ready'})[state]??'unavailable';
 return {status,trackId:player.getVideoData?.().video_id??null,positionSeconds:player.getCurrentTime?.()??null,durationSeconds:player.getDuration?.()??null};
}
export function spotifyReport(data,started=false){
 const duration=seconds(data?.duration),position=seconds(data?.position),ended=data?.isPaused===true&&duration>0&&position>=duration-150;
 return {status:started?'playing':data?.isBuffering===true?'buffering':ended?'ended':data?.isPaused===true?'paused':data?.isPaused===false?'playing':'unavailable',trackId:typeof data?.playingURI==='string'?data.playingURI:null,positionSeconds:position===null?null:position/1000,durationSeconds:duration===null?null:duration/1000};
}
