import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {LAB_ACCESS,createPresentationMode,resolveLabAccess} from '../src/scripts/hsin-presentation-mode.mjs';

// ---------------------------------------------------------------------------------------------
// 1. Structural modes and load state (lab explicitly allowed for this block).
// ---------------------------------------------------------------------------------------------
const lab=[{hidden:false}],upload=[{hidden:false}],panel={hidden:false};
const button=()=>({hidden:false,setAttribute(){}}),root={dataset:{},querySelectorAll:s=>s==='[data-hsin-lab-only]'?lab:s==='[data-hsin-load-only]'?upload:[]};
const mode=createPresentationMode({root,panel,presentationButton:button(),labButton:button(),access:LAB_ACCESS.lab});
assert.equal(panel.hidden,true);assert.equal(lab[0].hidden,true);assert.equal(upload[0].hidden,false);
mode.setLoaded(true);assert.equal(upload[0].hidden,true);mode.set('lab');assert.equal(panel.hidden,false);assert.equal(upload[0].hidden,false);
mode.set('presentation');assert.equal(panel.hidden,true);assert.equal(upload[0].hidden,true);mode.setLoaded(false);assert.equal(upload[0].hidden,false);

// ---------------------------------------------------------------------------------------------
// 2. Access is read from the URL, never from a visible control. Anything unrecognised is "none".
// ---------------------------------------------------------------------------------------------
for(const [search,expected] of [
  ['','none'],[undefined,'none'],[null,'none'],['?','none'],['?x=1','none'],['?lab=','none'],['?lab=0','none'],['?lab=true','none'],['?lab=sim','none'],['?lab=11','none'],
  ['?lab=1','lab'],['lab=1','lab'],['?a=2&lab=1','lab'],['?lab=1&lab=interno','lab'],
  ['?lab=interno','internal'],['?lab=INTERNO','internal'],['?lab=%20interno%20','internal'],['?lab=internal','none'],['?lab=interno%','none'],
]) assert.equal(resolveLabAccess(search),expected,`access for ${JSON.stringify(search)}`);

// ---------------------------------------------------------------------------------------------
// 3. Gating: without access the lab cannot be opened, whatever calls into it.
// ---------------------------------------------------------------------------------------------
function harness(options={}){
  const gate=[{hidden:false},{hidden:false}],internal=[{hidden:false},{hidden:false}],only=[{hidden:false}];
  const dataset={},controls={panel:{hidden:false},presentation:button(),lab:button()};
  const rootNode={dataset,querySelectorAll:s=>({'[data-hsin-lab-gate]':gate,'[data-hsin-internal-only]':internal,'[data-hsin-lab-only]':only})[s]??[]};
  const events=[];
  const controller=createPresentationMode({root:rootNode,panel:controls.panel,presentationButton:controls.presentation,labButton:controls.lab,onChange:m=>events.push(m),...options});
  return {gate,internal,only,dataset,controls,controller,events};
}
{
  for(const options of [{},{access:'none'},{access:undefined},{access:'bogus'},{access:'INTERNAL'},{access:true},{access:null}]){
    const h=harness(options);
    assert.equal(h.controller.access(),'none',`unknown access ${JSON.stringify(options)} falls back to none`);
    assert.ok(h.gate.every(e=>e.hidden),'the lab switch is hidden');
    assert.ok(h.internal.every(e=>e.hidden),'internal groups are hidden');
    assert.equal(h.controls.lab.hidden,true,'the lab button is hidden');
    assert.equal(h.controller.set('lab'),false,'the lab cannot be opened');
    assert.equal(h.controller.get(),'presentation');assert.equal(h.dataset.experience,'presentation');assert.equal(h.controls.panel.hidden,true);
    assert.ok(h.only.every(e=>e.hidden));
    assert.equal(h.dataset.access,'none');
    assert.equal(h.controller.set('presentation'),true,'presentation still works');
    assert.equal(h.controller.set('nope'),false);
  }
  const lite=harness({access:'lab'});
  assert.ok(lite.gate.every(e=>!e.hidden),'the lab switch is offered');assert.ok(lite.internal.every(e=>e.hidden),'internal diagnostics stay hidden at ?lab=1');
  assert.equal(lite.controls.lab.hidden,false);assert.equal(lite.controller.set('lab'),true);assert.equal(lite.controls.panel.hidden,false);assert.equal(lite.controller.access(),'lab');
  assert.ok(lite.internal.every(e=>e.hidden),'opening the lab does not reveal the internal groups');
  const full=harness({access:'internal'});
  assert.ok(full.gate.every(e=>!e.hidden));assert.ok(full.internal.every(e=>!e.hidden),'internal diagnostics only with ?lab=interno');
  assert.equal(full.controller.set('lab'),true);assert.equal(full.dataset.access,'internal');
  // The default of the library is the safe one.
  const bare=createPresentationMode({root:{dataset:{},querySelectorAll:()=>[]},panel:{hidden:false},presentationButton:button(),labButton:button()});
  assert.equal(bare.set('lab'),false);
}

// ---------------------------------------------------------------------------------------------
// 4. The page: structure, hierarchy and visible text.
// ---------------------------------------------------------------------------------------------
const html=await readFile(new URL('../src/pages/experimentos/hsin-lab/index.astro',import.meta.url),'utf8');
const layout=await readFile(new URL('../src/layouts/HsinPresentationLayout.astro',import.meta.url),'utf8');
const lab_ts=await readFile(new URL('../src/scripts/hsin-local-lab.ts',import.meta.url),'utf8');
assert.ok(html.includes('HsinPresentationLayout'));assert.ok(html.includes('data-hsin-options'));assert.ok(html.includes('data-hsin-laboratory hidden'));
assert.ok(!/PortfolioHeader|PortfolioFooter|RandomEasterSprites/.test(layout));assert.ok(layout.includes('noindex, nofollow, noarchive'));
for(const credit of ['Kuro Games','Lvoxx','imblue__','LSCherry'])assert.ok(html.includes(credit));

const marker='<div id="hsin-laboratory"';const split=html.indexOf(marker);assert.ok(split>0);
// The Astro frontmatter (imports) is code, not rendered text.
const presentationHtml=html.slice(html.indexOf('---',3)+3,split),labHtml=html.slice(split);
const visibleText=(markup)=>markup.replace(/<script[\s\S]*?<\/script>/g,' ').replace(/<!--[\s\S]*?-->/g,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');

// What the audience can reach: the character, a few quiet controls, files and credits. Nothing technical.
for(const attribute of ['data-hsin-atmosphere','data-hsin-b1-auto','data-hsin-chest-auto','data-hsin-replace'])assert.ok(presentationHtml.includes(attribute),`${attribute} belongs to the first-level menu`);
assert.ok(/data-hsin-signature(?![-\w])/.test(presentationHtml),'the signature toggle belongs to the menu');
for(const attribute of ['data-hsin-atmosphere','data-hsin-b1-auto','data-hsin-chest-auto'])assert.ok(!labHtml.includes(attribute),`${attribute} is not duplicated inside the lab`);
assert.ok(!/data-hsin-signature(?![-\w])/.test(labHtml),'the signature toggle is not duplicated inside the lab');
const menuTitles=[...presentationHtml.matchAll(/<h2 id="hsin-menu-[a-z]+">([^<]+)<\/h2>/g)].map(m=>m[1]);
assert.deepEqual(menuTitles,['Hsin','Cena','Arquivo'],'menu order: the character first, then the scene, then the file');
// Attribution is required wording (it names the re-rigger), so credits are checked for presence above, not for vocabulary.
const shown=visibleText(presentationHtml.replace(/<details class="hsin-lab__privacy">[\s\S]*?<\/details>/,''));
for(const forbidden of [/CSP|Content-Security/i,/\bCSS\b/i,/blob/i,/Three\.js|WebGL|skinning|\bIK\b|morph|\bGLB em mem/i,/diagn[óo]stic/i,/Pass [AB]|B\.1|\bPBR\b|UV[01]/i,/candidata|pole vector|rig\b/i,/Argila|Normais|Opacidade/i,/02B|03B|03A/])assert.ok(!forbidden.test(shown),`presentation text mentions ${forbidden}`);
assert.ok(shown.length<1400,`the first-level text stays short (${shown.length} characters)`);
assert.ok(!html.includes('hsin-lab__presentation-hint'),'no instruction paragraph over the stage');
assert.ok(!labHtml.slice(0,labHtml.indexOf('</div>')).includes('data-hsin-csp-status'));
assert.ok(labHtml.includes('data-hsin-csp-status'),'the image-decoding check survives, inside the lab evidence');
assert.ok(!presentationHtml.includes('data-hsin-csp-status'),'and not in the presentation');

// The lab is internal: gated, ordered by relevance, and 02B / 03B are not exposed.
assert.ok(/data-hsin-mode-lab/.test(presentationHtml)&&/data-hsin-lab-gate hidden>\s*<button[^>]*data-hsin-mode-presentation/.test(presentationHtml),'the mode switch exists only behind the access gate');
// Top-level group titles only: nested diagnostic summaries do not count.
const titles=[...labHtml.matchAll(/<details class="hsin-lab__group"[^>]*>\s*<summary>([^<]+)<\/summary>|<h2[^>]*>([^<]+)<\/h2>/g)].map(m=>m[1]??m[2]);
const at=(prefix)=>titles.findIndex(t=>t.startsWith(prefix));
assert.ok(at('Mão esquerda')>=0&&at('Mão direita')===at('Mão esquerda')+1,'the two arm roles lead the lab, side by side');
assert.ok(at('Atuação facial')>at('Mão direita'));
for(const [prefix,label] of [['02B','Diagnóstico visual'],['03B','Articulações individuais']]){
  const block=new RegExp(`<details[^>]*data-hsin-internal-only hidden[^>]*>\\s*<summary>${prefix} · ${label}</summary>`);
  assert.ok(block.test(html),`${prefix} is restricted to the internal mode`);
  assert.ok(at(prefix)>at('04'),`${prefix} comes after the working groups`);
}
assert.equal([...html.matchAll(/data-hsin-internal-only/g)].length,2,'exactly two internal groups');
assert.ok(!/<(?:summary|h2)[^>]*>0(?:2B|3B)/.test(presentationHtml));

// Wiring: the page resolves access from the URL, and loading messages speak plainly.
assert.ok(lab_ts.includes('resolveLabAccess(window.location.search)'));
assert.ok(/if\(presentationMode\.set\('lab'\)\)history\.pushState/.test(lab_ts),'a refused lab does not touch history');
assert.ok(!lab_ts.includes("setStatus('Preparando Three.js")&&!lab_ts.includes("'Lendo GLB local ("),'no engine jargon in the loading messages');
assert.ok(lab_ts.includes('Não foi possível abrir este arquivo.'),'a friendly failure message for the presentation');
assert.ok(lab_ts.includes('imagesBlocked'),'a blocked image decoder is reported in plain words');

// ---------------------------------------------------------------------------------------------
// 5. Preserve the exact solver and envelope from the second choreography delivery.
// ---------------------------------------------------------------------------------------------
for(const [file,expected]of [['hsin-right-signature.mjs','bfc58d9fcee656ee269360c6f8a10ece311c045e57c221d83e285aae76c8f856'],['hsin-pose-transition.mjs','58582bdb9b18d4fb613da7425d6a1749c6c387a64ebfc182e05e551073b8a5ef']]){
 const bytes=await readFile(new URL('../src/scripts/'+file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,'approved right-arm reference changed');
}
console.log('Clean presentation: URL-gated lab, 02B/03B internal-only, quiet first-level menu without technical text, private credits, preserved right gesture PASS');
