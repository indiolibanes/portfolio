import test from 'node:test';
import assert from 'node:assert/strict';
import {EXPRESSION_RELEASE_PLAN as p} from '../src/scripts/shorekeeper/expression-release-plan.mjs';

const byId = id => p.proposals.find(x => x.id === id);
test('human acceptance does not activate runtime presets or release', () => {
  assert.equal(p.active, false);
  assert.equal(p.releaseReady, false);
  assert.match(p.geometry, /TO_LOCK/);
  assert.ok(p.approvalContract.require.some(x => x.includes('morph weight map')));
});
test('approved Little Smile V2 remains distinct from R2/R3', () => {
  const v = byId('LITTLE_SMILE');
  assert.equal(v.sourceQa, 'LITTLE_SMILE_V2');
  assert.equal(v.appearance, 'HUMAN_APPROVED');
  assert.notEqual(v.separateVariant, v.sourceQa);
  assert.ok(!v.aliases.includes(v.separateVariant));
  assert.equal(v.duplicateCandidate, 'LITTLE_SMILE_R3_CANDIDATE');
});
test('My Star full and soft-eyes intermediate are preserved separately', () => {
  const v = byId('MY_STAR');
  assert.equal(v.sourceQa, 'MY_STAR_V2');
  assert.equal(v.intermediateQa, 'MY_STAR_R3_EYES_SOFT');
  assert.notEqual(v.sourceQa, v.intermediateQa);
  assert.equal(v.intermediateAppearance, 'HUMAN_APPROVED');
  assert.ok(!v.aliases.includes(v.intermediateQa));
});
test('Hello R2 is not silently replaced by open-mouth original', () => {
  const v = byId('HELLO');
  assert.equal(v.sourceQa, 'HELLO_R2_CANDIDATE');
  assert.equal(v.appearance, 'HUMAN_APPROVED');
  assert.equal(v.separateVariant, 'HELLO');
  assert.equal(v.aliases.length, 0);
});
test('uncertain emotional naming remains explicitly unbound', () => {
  for (const id of ['TENDERNESS','SERENITY']) assert.equal(byId(id).binding, 'VERIFY_EXACT_QA_PRESENTATION');
});
test('concern and lateral gaze remain actionable, not approved', () => {
  for(const id of ['WORRIED','GLANCE']) {
    assert.equal(byId(id).appearance, 'REWORK_REQUIRED');
    assert.ok(byId(id).repair.length);
  }
});
test('no QA aliases are implicitly promoted',()=>{
  assert.ok(p.proposals.every(x=>Array.isArray(x.aliases)&&x.aliases.length===0));
});
