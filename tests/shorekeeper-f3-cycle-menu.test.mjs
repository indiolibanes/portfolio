import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Static wiring gate: runtime and shader/skin correctness require authenticated WebGL QA.
const html=readFileSync('src/pages/experimentos/sk/index.astro','utf8');
const lab=readFileSync('src/scripts/shorekeeper-sk-lab.mjs','utf8');

test('F3 cycle is primary and G11.3 is visibly separated as Legacy',()=>{
 assert.match(html,/data-r61-start disabled>Reproduzir ciclo · F3<\/button>/);
 assert.match(html,/<details data-r61-legacy hidden>/);
 assert.match(html,/data-r61-legacy-start disabled>Reproduzir ciclo · Legacy G11\.3<\/button>/);
 assert.match(lab,/\$\('\[data-r61-legacy\]'\)\.hidden=false;/);
});

test('explicit playback routing never uses the hidden FIDELIDADE checkbox to choose a presentation',()=>{
 assert.match(lab,/playR61Cycle\(r62Enabled\?PROFILE_FIDELITY:PROFILE_ARTISTIC\)/);
 assert.match(lab,/playR61Cycle\(PROFILE_ARTISTIC\)/);
 assert.match(lab,/const fidelity=r62Enabled&&requestedProfile===PROFILE_FIDELITY;/);
 const handler=lab.slice(lab.indexOf('async function playR61Cycle('),lab.indexOf(' // S6 autonomous rehearsal'));
 assert.doesNotMatch(handler,/data-r61-fidelity/);
});

test('F3 validates the BODY twin; Legacy preserves the original G11.3 entry and S6 choreography',()=>{
 assert.ok(lab.includes("requireCanonicalSources(model.userData.skClips??[],[...R61_SOURCE_IDS,'SK_BURST_02_ORIGINAL_BODY'])"));
 assert.match(lab,/const button=r62Enabled\?\$\('\[data-r61-legacy-start\]'\):\$\('\[data-r61-start\]'\);/);
 assert.match(lab,/\$\('\[data-r61-legacy-start\]'\)\.disabled=!r62Enabled\|\|cycleBlocked;/);
 assert.match(lab,/root\.dataset\.cycleProfile=fidelity\?\(study\?'f14-study':'f3'\):r62Enabled\?'g113-legacy':'r61'/);
});

test('presentation selector remains distinct from unverified canonical source inspection',()=>{
 assert.match(html,/Inspecionar movimentos originais · biblioteca F3 \(QA\)/);
 assert.match(html,/Inspecionar fonte · não certificada/);
 assert.match(lab,/CANONICAL_PENDING/);
});
