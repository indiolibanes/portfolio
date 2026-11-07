import test from 'node:test';import assert from 'node:assert/strict';
import {createMusicState} from '../src/scripts/hsin-music-state.mjs';
import {duetMusicSnapshot} from '../src/scripts/shorekeeper/duet-music-contract.mjs';
test('selection is not playback; confirmed reports carry epoch, observed position and quality without invented beats',()=>{
 const c=createMusicState({now:()=>1200}),epoch=c.select('youtube');assert.equal(duetMusicSnapshot(c.sample()).playbackConfirmed,false);
 c.observe(epoch,{status:'playing',positionSeconds:23.5});const s=duetMusicSnapshot(c.sample());assert.equal(s.state,'PLAYING_CONFIRMED');assert.equal(s.epoch,epoch);assert.equal(s.positionSeconds,23.5);assert.equal(s.synchronizationQuality,'verified');assert.equal(s.choreography,'BASIC_ROTATION_USER_APPROVED');assert.equal(s.beatSynchronization,'NONE');assert.ok(!('beat' in s));
 const stale=c.sample();c.select('spotify');assert.equal(c.observe(epoch,{status:'playing'}),false);assert.equal(duetMusicSnapshot(c.sample()).playbackConfirmed,false);assert.equal(duetMusicSnapshot(stale).positionSeconds,23.5);c.dispose();
});
test('paused, buffering, ended, unavailable and no_music remain explicit without advancing any pose clock',()=>{
 for(const status of ['paused','buffering','ended','unavailable','no_music']){
  const s=duetMusicSnapshot({provider:'spotify',status,playbackConfirmed:false,epoch:3,positionSeconds:2,synchronizationQuality:'estimated'});
  assert.equal(s.status,status);assert.equal(s.playbackConfirmed,false);assert.equal(s.positionSeconds,2);assert.equal(s.choreography,'QUIET_RANDOM_IDLE_FACIAL');
 }
 assert.equal(duetMusicSnapshot({provider:'none',status:'playing',playbackConfirmed:true}).playbackConfirmed,false);
 assert.equal(duetMusicSnapshot({positionSeconds:-2}).positionSeconds,null);
});
