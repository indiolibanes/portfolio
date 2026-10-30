import test from 'node:test';
import assert from 'node:assert/strict';
import { SophiaEngine } from '../src/components/sophia7a/presentation/core/engine.js';

// The imperative engine only needs removeEventListener during a failed-start disposal in Node.
globalThis.document = { removeEventListener() {} };

function engine() { return new SophiaEngine({}); }

test('preferences remain authoritative before renderer, starfield and controls exist', () => {
  const e = engine();
  e.setPaused(true);
  e.setEffects(false);
  e.setReducedMotion(true);
  e.setTouchGuard(true);
  e.setEffectIntensity(0.4);
  assert.deepEqual({ paused:e.state.paused, effects:e.state.effects, reduced:e.state.reduced, guard:e.state.touchGuard, intensity:e.opts.effectIntensity },
    { paused:true, effects:false, reduced:true, guard:true, intensity:0.4 });
  e.dispose();
  assert.equal(e.disposeErrors.length, 0);
  assert.equal(e._scope.size, 0);
});

test('preferences changed during partial initialization synchronize when subsystems arrive', () => {
  const e = engine();
  e.setEffects(false); e.setReducedMotion(true); e.setTouchGuard(true);
  e.setEffectIntensity(0.35);
  const values = {};
  e.starfield = { object:{ visible:true }, dispose(){} };
  e.controls = { enabled:true, enableDamping:true, dispose(){} };
  e.renderer = { domElement:{style:{},remove(){},removeEventListener(){}},setAnimationLoop(){},dispose(){},forceContextLoss(){} };
  e.fx = { setEnabled(v){values.enabled=v},setReduced(v){values.reduced=v},setIntensity(v){values.intensity=v},setHalosVisible(v){values.halos=v},dispose(){} };
  e._applyEffectsVisibility();
  e.setEffects(e.state.effects); e.setReducedMotion(e.state.reduced);
  e.setTouchGuard(e.state.touchGuard); e.setEffectIntensity(e.opts.effectIntensity);
  assert.deepEqual(values,{halos:false,enabled:false,reduced:true,intensity:0.35});
  assert.equal(e.starfield.object.visible,false);
  assert.equal(e.controls.enableDamping,false);
  assert.equal(e.controls.enabled,false);
  assert.equal(e.renderer.domElement.style.touchAction,'pan-y');
  e.dispose();
  assert.equal(e.disposeErrors.length,0);
});

test('unexpected missing subsystems in a READY engine remain errors', () => {
  const e=engine();
  e.state.ready=true;
  assert.throws(()=>e.setEffects(true),/Céu estrelado ausente/);
  assert.throws(()=>e.setReducedMotion(true),/Controles ausentes/);
  assert.throws(()=>e.setTouchGuard(true),/Controles ou renderer ausentes/);
  e.dispose();
});

test('failure before starfield or controls stays the original error and can be disposed', async () => {
  for (const stage of ['renderer','starfield','controls']) {
    const e=engine();
    const primary=new Error(`failure-${stage}`);
    if (stage==='renderer') e._createRenderer=()=>{throw primary};
    else {
      e._createRenderer=()=>{e.renderer={domElement:{style:{},remove(){},removeEventListener(){}},setAnimationLoop(){},dispose(){},forceContextLoss(){}}};
      e._resolveQuality=()=>{};
      e._createScene=()=>{
        if (stage==='controls') e.starfield={object:{visible:true},dispose(){}};
        throw primary;
      };
    }
    await assert.rejects(e.start(),err=>err===primary);
    if (stage!=='controls') assert.equal(e.starfield,undefined);
    assert.equal(e.controls,undefined);
    e.setEffects(false); e.setReducedMotion(true); e.setTouchGuard(true);
    e.dispose();
    assert.equal(e.disposeErrors.length,0);
    assert.equal(e._scope.size,0);
  }
});

test('cancel in flight resolves false and repeated disposal leaves no late work', async () => {
  const e=engine();
  let gpuCalls=0;
  e.renderer={setAnimationLoop(){gpuCalls++},dispose(){gpuCalls++},forceContextLoss(){gpuCalls++},domElement:{remove(){},removeEventListener(){}}};
  let complete;
  e._start=()=>new Promise(resolve=>{complete=resolve});
  const promise=e.start();
  e.dispose(); e.setEffects(false); e.setReducedMotion(true); e.setTouchGuard(true);
  const callsAtDispose=gpuCalls;
  complete();
  assert.equal(await promise,false);
  assert.equal(gpuCalls,callsAtDispose);
  assert.equal(e._disposed,true);
  assert.equal(e._scope.size,0);
  assert.equal(e.disposeErrors.length,0);
});
