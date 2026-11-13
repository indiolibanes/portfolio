import test from 'node:test';import assert from 'node:assert/strict';
import {createLaunchAudio} from '../src/scripts/sophia-launch-audio.ts';
const param=()=>({value:0,setValueAtTime(){},setTargetAtTime(){},exponentialRampToValueAtTime(){}});
const node=()=>({gain:param(),frequency:param(),threshold:param(),ratio:param(),connect(target){return target;},disconnect(){}});
function mockAudio(t){const sources=[];let context,fetches=0;
 class Context {constructor(){context=this;this.currentTime=100;this.sampleRate=8000;this.destination=node();this.state='suspended';this.gains=[];}createGain(){const g=node();this.gains.push(g);return g;}createDynamicsCompressor(){return node();}createBiquadFilter(){return node();}createBuffer(){return {name:'noise',getChannelData:()=>new Float32Array(8000)};}decodeAudioData(bytes){return Promise.resolve({name:new TextDecoder().decode(bytes)});}createBufferSource(){const s={...node(),loop:false,buffer:null,start(when){this.when=when;sources.push(this);},stop(){this.onended?.();}};return s;}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}}
 const old=globalThis.AudioContext;globalThis.AudioContext=Context;t.after(()=>{if(old===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=old;});
 t.mock.method(globalThis,'fetch',async url=>{fetches++;return {ok:true,arrayBuffer:async()=>new TextEncoder().encode(String(url).split('/').at(-1).replace('.mp3','')).buffer};});
 return {sources,get context(){return context;},get fetches(){return fetches;}};
}
test('audio is gesture-gated, voice cues use six exact scene boundaries, replay is clean',async t=>{
 const m=mockAudio(t),a=createLaunchAudio(()=>{});assert.equal(m.fetches,0);assert.equal(m.context,undefined);
 a.unlock();await new Promise(r=>setImmediate(r));assert.equal(m.fetches,7);a.start();
 for(let i=0;i<6;i++){const time=2.1+i;m.context.currentTime=100+time;a.update(time,.7);a.update(time,.7);}
 const voices=m.sources.filter(s=>/^\d$/.test(s.buffer.name));assert.deepEqual(voices.map(s=>s.buffer.name),['5','4','3','2','1','0']);
 voices.forEach((s,i)=>assert.ok(Math.abs(s.when-(102.1+i))<1e-9));
 a.pause(true);assert.equal(m.context.state,'suspended');a.pause(false);assert.equal(m.context.state,'running');
 a.reset();a.start();m.context.currentTime=200;a.update(2.1,.7);assert.equal(m.sources.filter(s=>s.buffer.name==='5').length,2);
 a.dispose();assert.equal(m.context.state,'closed');a.dispose();
});
test('a failed local sound never blocks launch and reports once',async t=>{
 const m=mockAudio(t);t.mock.method(globalThis,'fetch',async()=>{throw Error('404');});let reports=0;
 const a=createLaunchAudio(()=>reports++);a.unlock();await new Promise(r=>setImmediate(r));assert.equal(reports,1);assert.equal(a.state.failed,true);a.start();assert.doesNotThrow(()=>a.update(7.1,1));a.dispose();
});

test('mute selected before Start is honored when the audio graph is first created',async t=>{
 const m=mockAudio(t),a=createLaunchAudio(()=>{});a.setMuted(true);assert.equal(m.context,undefined);a.unlock();
 await new Promise(r=>setImmediate(r));assert.equal(a.state.muted,true);assert.equal(m.context.gains[0].gain.value,0);a.dispose();
});
