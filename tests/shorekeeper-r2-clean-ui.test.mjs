import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../src/pages/experimentos/sk/index.astro', import.meta.url),'utf8');
const code=readFileSync(new URL('../src/scripts/shorekeeper-sk-lab.mjs', import.meta.url),'utf8');
const css=readFileSync(new URL('../src/styles/shorekeeper-material3.css', import.meta.url),'utf8');
test('authenticated R2 model and libraries stay visible and functional',()=>{
 assert.match(html,/data-r2-panel/);
 assert.match(html,/data-r2-recheck/);
 assert.match(html,/data-r2-audit/);
 assert.match(html,/data-r2-quick-burst/);
 assert.match(code,/function syncR2LibraryPanel/);
 assert.match(code,/recheckR2AndLoad/);
});
test('legacy file imports are maintenance-only, but still mounted for recovery',()=>{
 assert.match(html,/<div class="sk-maintenance-only" data-sk-manual-import>/);
 assert.match(html,/<details class="sk-private-r2-panel"/);
 assert.match(html,/class="sk-library-import sk-maintenance-only"/);
 assert.match(html,/class="sk-field sk-maintenance-only">Restaurar configuração local/);
 assert.match(html,/data-original-file/);
 assert.match(html,/data-sk-file/);
 assert.match(code,/root\.dataset\.maintenance=String\(new URLSearchParams\(location\.search\)\.get\('maintenance'\)==='1'\)/);
 assert.match(css,/\.sk-lab:not\(\[data-maintenance="true"\]\) \.sk-maintenance-only\{display:none!important;\}/);
});
test('experimental combat is not mislabeled as automatic facial QA',()=>{
 assert.match(html,/durante a reprodução de combate a face é reservada ao clipe original/);
 assert.match(code,/control\('presentationMode'\)\.value==='combat'/);
 assert.match(html,/data-approved-expression/);
});
