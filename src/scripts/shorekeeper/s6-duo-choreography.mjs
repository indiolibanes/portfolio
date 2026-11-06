/**
 * S6-E: music/quiet conductor with no timers, renderers or animation writers.
 * Requires PLAYING + playbackConfirmed; selection/ready/buffering are quiet.
 * It never claims a beat-synchronous or game-canonical combat sequence.
 */
export const S6_DUO_MODES=Object.freeze({QUIET:'quiet',MUSIC:'music',PAUSED:'paused'});
export function s6MusicActive(music){
  return music?.status==='playing'&&music?.playbackConfirmed===true&&
    music?.provider!=='none'&&music?.synchronizationQuality!=='unavailable';
}
export function createS6DuoChoreographer({onEnterMusic,onEnterQuiet,onBeat,quietTick,musicTick}){
  if([onEnterMusic,onEnterQuiet,quietTick,musicTick].some(f=>typeof f!=='function'))throw Error('Missing duo choreography callback');
  let mode=S6_DUO_MODES.QUIET,transitions=0,seconds=0,disposed=false;
  const advance=(dt,{music,paused=false,reducedMotion=false}={})=>{
    if(disposed||!Number.isFinite(dt)||dt<0)throw Error('Invalid duo elapsed time');
    if(!dt||paused||reducedMotion)return;
    const requested=s6MusicActive(music)?S6_DUO_MODES.MUSIC:S6_DUO_MODES.QUIET;
    if(requested!==mode){
      if(requested===S6_DUO_MODES.MUSIC){
        if(onEnterMusic()===false){quietTick(dt);return;}
      } else onEnterQuiet();
      mode=requested;transitions++;seconds=0;
    }
    seconds+=dt;
    if(mode===S6_DUO_MODES.MUSIC){musicTick(dt);onBeat?.(music,dt);}
    else quietTick(dt);
  };
  return {advance,dispose(){disposed=true;},
    get state(){return {mode,transitions,seconds,release:'S6E_PRIVATE_PREVIEW_G7_NO_GO'};}};
}
