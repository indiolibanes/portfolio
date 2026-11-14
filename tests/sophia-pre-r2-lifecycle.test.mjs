import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { browserFixture, ActorElement, flush } from './sophia-r15-fixture.mjs';

const bytes = fs.readFileSync('public/assets/models/sophia/sophia-lab.glb');
let serial = 0;
async function setup(elements) {
  const f = browserFixture(elements); let fetches = 0, releases = 0;
  globalThis.fetch = async () => { fetches++; return new Response(bytes); };
  f.gl.getExtension = name => name === 'WEBGL_lose_context' ? { loseContext() { releases++; } } : null;
  const id = serial++;
  const source = process.env.SOPHIA_ACTOR_BASELINE;
  const specifier = source ? 'data:text/javascript;base64,' + Buffer.from(fs.readFileSync(source, 'utf8').replaceAll("from './", `from '${new URL('../public/experimental/', import.meta.url).href}`) + `\n// scenario ${id}`).toString('base64') : `../public/experimental/sophia-actor.js?lifecycle=${id}`;
  const mod = await import(specifier);
  const mutate = () => f.mos.find(o => o.opts?.childList)?.cb([]);
  return { f, mod, mutate, get fetches() { return fetches; }, get releases() { return releases; } };
}

test('hidden initial intersection does not fetch or create a context; visible tab resumes', async () => {
  const el = new ActorElement('runner', 'Correr_R6'); const s = await setup([el]);
  document.hidden = true; s.f.ios[0].trigger(true); await flush();
  assert.equal(s.fetches, 0); assert.equal(s.f.glCanvases, 0);
  document.hidden = false; document.dispatchEvent(new Event('visibilitychange')); await flush();
  assert.equal(el.dataset.sophia3d, 'on'); assert.equal(s.fetches, 1);
});

test('last actor removal releases GPU context, stops director, and drops cached source; remount stays bounded', async () => {
  const el = new ActorElement('runner', 'Correr_R6'); const s = await setup([el]);
  let stopped = 0;
  for (let i = 0; i < 4; i++) {
    el.isConnected = true; s.mod.mountActors(); s.f.ios[0].trigger(true); await flush();
    const actor = s.mod.actorOf(el); assert.ok(actor);
    actor.director = { stop() { stopped++; } };
    el.isConnected = false; s.mutate(); await flush();
    assert.equal(s.mod.actorOf(el), null); assert.equal(el.children.length, 0);
  }
  console.log(JSON.stringify({ cycles: 4, contextsCreated: s.f.glCanvases, contextsReleased: s.releases, fetches: s.fetches, directorsStopped: stopped }));
  assert.equal(s.releases, 4); assert.equal(stopped, 4);
  assert.equal(s.fetches, 4, 'source cache is gone when the model has no consumers');
  assert.equal(s.f.rafs.size, 0);
});

test('removing one consumer preserves the shared stage, source and independent pose of the other', async () => {
  const runner = new ActorElement('runner', 'Correr_R6'), lab = new ActorElement('lab', 'Sophia_ExpressionFlow_R6');
  const s = await setup([runner, lab]); s.f.ios[0].trigger(true); await flush();
  const keep = s.mod.actorOf(lab), gone = s.mod.actorOf(runner);
  assert.equal(keep.stage, gone.stage); assert.notEqual(keep.sk, gone.sk);
  runner.isConnected = false; s.mutate(); await flush();
  assert.equal(s.releases, 0); assert.equal(s.mod.actorOf(lab), keep); assert.equal(s.fetches, 1);
  s.f.pump(1000); s.f.pump(1040); assert.ok(keep.ctx.draws > 1);
});

test('consumer detached during pending load leaves no orphan context or canvas', async () => {
  const el = new ActorElement('runner', 'Correr_R6'); const s = await setup([el]); let resolve;
  globalThis.fetch = () => new Promise(r => { resolve = r; });
  s.f.ios[0].trigger(true); el.isConnected = false; s.mutate(); resolve(new Response(bytes)); await flush();
  assert.equal(s.mod.actorOf(el), null); assert.equal(el.children.length, 0);
  assert.equal(s.f.ios[0].items.has(el), false, 'pending detached element is unobserved');
  assert.equal(s.releases, s.f.glCanvases);
});

test('pagehide in bfcache blocks late first-frame publication until pageshow', async () => {
  const el = new ActorElement('runner', 'Correr_R6'); const s = await setup([el]); let resolve;
  globalThis.fetch = () => new Promise(r => { resolve = r; });
  s.f.ios[0].trigger(true);
  const hide = new Event('pagehide'); Object.defineProperty(hide, 'persisted', { value: true }); window.dispatchEvent(hide);
  resolve(new Response(bytes)); await flush();
  assert.equal(s.mod.actorOf(el), null); assert.notEqual(el.dataset.sophia3d, 'on');
  globalThis.fetch = async () => new Response(bytes);
  const show = new Event('pageshow'); Object.defineProperty(show, 'persisted', { value: true }); window.dispatchEvent(show); await flush();
  assert.equal(el.dataset.sophia3d, 'on');
});
