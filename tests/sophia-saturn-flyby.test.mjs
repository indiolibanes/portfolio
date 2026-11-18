import test from 'node:test';
import assert from 'node:assert/strict';
import { SATURN, SATURN_FLYBY, SATURN_RINGS, ringAngularSpeed, sampleSaturnFlyby } from '../src/scripts/sophia-saturn-flyby.mjs';

test('Saturn flyby remains outside the aphelion Hill estimate and clears continuously', () => {
  const { start, closest, end, hillKm, impactKm } = SATURN_FLYBY;
  assert.equal(sampleSaturnFlyby(start - .01).visible, false);
  assert.equal(sampleSaturnFlyby(closest).distanceKm, impactKm);
  assert.ok(impactKm > hillKm && hillKm > 65e6 && hillKm < 71e6);
  let previous = impactKm;
  for (let t = closest; t <= end; t += .05) {
    const { distanceKm } = sampleSaturnFlyby(t);
    assert.ok(distanceKm >= previous);
    previous = distanceKm;
  }
  assert.ok(sampleSaturnFlyby(end).angularRadius < sampleSaturnFlyby(closest).angularRadius / 6);
  assert.deepEqual(sampleSaturnFlyby(end + 10), sampleSaturnFlyby(end));
});

test('the oblate globe, Cassini Division and differential ring motion use Saturn dimensions', () => {
  assert.ok(SATURN.polarRadiusKm / SATURN.equatorialRadiusKm < .91);
  assert.equal(SATURN_RINGS.aInner - SATURN_RINGS.bOuter, 4833);
  assert.ok(ringAngularSpeed(SATURN_RINGS.bInner) > ringAngularSpeed(SATURN_RINGS.aOuter));
  const t = SATURN_FLYBY.start + SATURN.spinSeconds / SATURN_FLYBY.simulatedSecondsPerSecond;
  assert.ok(Math.abs(sampleSaturnFlyby(t).spin - 2 * Math.PI) < 1e-10);
});
