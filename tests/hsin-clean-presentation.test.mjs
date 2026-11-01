import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createPresentationMode} from '../src/scripts/hsin-presentation-mode.mjs';
const lab=[{hidden:false}],upload=[{hidden:false}],panel={hidden:false};
const button=()=>({setAttribute(){}}),root={dataset:{},querySelectorAll:s=>s==='[data-hsin-lab-only]'?lab:s==='[data-hsin-load-only]'?upload:[]};
const mode=createPresentationMode({root,panel,presentationButton:button(),labButton:button()});
assert.equal(panel.hidden,true);assert.equal(lab[0].hidden,true);assert.equal(upload[0].hidden,false);
mode.setLoaded(true);assert.equal(upload[0].hidden,true);mode.set('lab');assert.equal(panel.hidden,false);assert.equal(upload[0].hidden,false);
mode.set('presentation');assert.equal(panel.hidden,true);assert.equal(upload[0].hidden,true);mode.setLoaded(false);assert.equal(upload[0].hidden,false);
const html=await readFile(new URL('../src/pages/experimentos/hsin-lab/index.astro',import.meta.url),'utf8');
const layout=await readFile(new URL('../src/layouts/HsinPresentationLayout.astro',import.meta.url),'utf8');
assert.ok(html.includes('HsinPresentationLayout'));assert.ok(html.includes('data-hsin-options'));assert.ok(html.includes('data-hsin-laboratory hidden'));
assert.ok(!/PortfolioHeader|PortfolioFooter|RandomEasterSprites/.test(layout));assert.ok(layout.includes('noindex, nofollow, noarchive'));
for(const credit of ['Kuro Games','Lvoxx','imblue__','LSCherry'])assert.ok(html.includes(credit));
// Preserve the exact solver and envelope from the second choreography delivery.
for(const [file,expected]of [['hsin-right-signature.mjs','bfc58d9fcee656ee269360c6f8a10ece311c045e57c221d83e285aae76c8f856'],['hsin-pose-transition.mjs','58582bdb9b18d4fb613da7425d6a1749c6c387a64ebfc182e05e551073b8a5ef']]){
 const bytes=await readFile(new URL('../src/scripts/'+file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,'approved right-arm reference changed');
}
console.log('Clean presentation: structural modes/load state, private credits, isolated layout and preserved right gesture PASS');
