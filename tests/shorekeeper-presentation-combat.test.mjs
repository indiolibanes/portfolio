import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const page=await readFile('src/pages/experimentos/sk/index.astro','utf8'),runtime=await readFile('src/scripts/shorekeeper-sk-lab.mjs','utf8');
assert(page.includes('data-control="presentationMode"'));for(let i=1;i<=4;i++)assert(page.includes(`SK_ATTACK_0${i}_ORIGINAL`));
assert(page.includes('data-original-file')&&page.includes('multiple'));assert(page.includes('data-action="play"')&&page.includes('data-action="pause"')&&page.includes('data-action="interrupt"'));
assert(runtime.includes('validateCombatLibrary(T,model,result)'));assert(runtime.includes("if(phase()!=='ready'||files.length>4)"));assert(runtime.includes("scheduler?.setEnabled(false)"));assert(runtime.includes('director?.advance(dt)'));assert(!runtime.includes('combatDirector.advance'));
console.log('Presentation combat privacy and control hooks PASS; browser/WebGL QA is separate.');
