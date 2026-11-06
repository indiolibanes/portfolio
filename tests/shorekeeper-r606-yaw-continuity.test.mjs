import test from 'node:test';
import assert from 'node:assert/strict';
import {makeAuditFixture} from './shorekeeper-r605/fixture.mjs';
import {sampleSourceMotion} from '../src/scripts/shorekeeper/source-motion-audit.mjs';
import {summarizeMotionAudit} from '../src/scripts/shorekeeper/motion-landmarks.mjs';

const source={sourceHash:'a'.repeat(64),clipHash:'b'.repeat(64),provenance:'SYNTHETIC_FIXTURE'};

test('yaw summary rejects a projection singularity inside otherwise valid endpoints',()=>{
 const {model,clip,calibration}=makeAuditFixture();
 const trace=sampleSourceMotion(model,clip,{...source,fps:60,calibration});
 const continuous=summarizeMotionAudit(trace);
 assert.equal(continuous.orientation.Bip001.yawContinuity,'SAMPLED_PROJECTION_CONTINUOUS');
 assert.equal(continuous.orientation.Bip001.yawDeltaDeg,720);

 // An undefined intermediate forward projection makes unwrapped revolutions
 // ambiguous even when the first and last sampled yaw remain numerically valid.
 const middle=Math.floor(trace.rows.length/2);
 assert.ok(middle>0&&middle<trace.rows.length-1);
 trace.rows[middle].bones.Bip001.yawUnwrapped=null;
 const uncertain=summarizeMotionAudit(trace);
 assert.equal(uncertain.orientation.Bip001.yawDeltaDeg,null);
 assert.equal(uncertain.orientation.Bip001.yawContinuity,'INDETERMINATE_PROJECTION_GAP');
 assert.equal(uncertain.orientation.Root.yawDeltaDeg,720);
 assert.deepEqual(uncertain.semanticMarkers,[]);
 assert.equal(uncertain.identity,'MANUAL_QA_PENDING');
});

test('a missing yaw endpoint is also indeterminate, never zero degrees',()=>{
 const {model,clip,calibration}=makeAuditFixture();
 const trace=sampleSourceMotion(model,clip,{...source,fps:30,calibration});
 trace.rows.at(-1).bones.Root.yawUnwrapped=null;
 const result=summarizeMotionAudit(trace);
 assert.equal(result.orientation.Root.yawDeltaDeg,null);
 assert.equal(result.orientation.Root.yawContinuity,'INDETERMINATE_PROJECTION_GAP');
});
