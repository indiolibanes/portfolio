import test from 'node:test';
import assert from 'node:assert/strict';
import {APPROVED_MANUAL_GESTURES,APPROVED_MANUAL_RECIPES,isApprovedManualGesture} from '../src/scripts/shorekeeper/approved-manual-gallery.mjs';
import {MOUTH_QA_RECIPES} from '../src/scripts/shorekeeper/mouth-qa-probes.mjs';
import {EXPRESSION_RELEASE_PLAN} from '../src/scripts/shorekeeper/expression-release-plan.mjs';
test('approved manual gallery names exact QA variants, never deduplicates R2 into V2',()=>{
  const ids=APPROVED_MANUAL_GESTURES.map(x=>x.id);
  assert.deepEqual(ids,['LITTLE_SMILE_V2','MY_STAR_V2','MY_STAR_R3_EYES_SOFT','HELLO_R2_CANDIDATE','LOVE','HOPE','SURPRISE_SOFT']);
  assert.equal(new Set(ids).size,ids.length);
  for(const id of ids)assert.ok(isApprovedManualGesture(id));
  for(const id of ['WORRIED','GLANCE','MY_STAR_R2_CANDIDATE','LITTLE_SMILE_R2_CANDIDATE','HELLO_R3_OPEN'])assert.equal(isApprovedManualGesture(id),false);
});
test('manual approved recipes preserve original morph weights and cap long QA holds',()=>{
  for(const [id,recipe] of Object.entries(APPROVED_MANUAL_RECIPES)){
    assert.deepEqual(recipe.weights,MOUTH_QA_RECIPES[id].weights);
    assert.ok(recipe.timing.hold>0&&recipe.timing.hold<5);
    assert.equal(recipe.automatic,false);
    assert.equal(recipe.review,'HUMAN_APPEARANCE_APPROVED_PROFILE_PENDING');
  }
});
test('R5 release and auto scheduler stay blocked',()=>{
  assert.equal(EXPRESSION_RELEASE_PLAN.active,false);
  assert.equal(EXPRESSION_RELEASE_PLAN.humanApproval,null);
  assert.equal(EXPRESSION_RELEASE_PLAN.releaseReady,false);
});
