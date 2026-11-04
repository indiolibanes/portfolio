import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../src/pages/experimentos/sk/index.astro',import.meta.url),'utf8');
const runtime=readFileSync(new URL('../src/scripts/shorekeeper-sk-lab.mjs',import.meta.url),'utf8');
test('mobile UI calls same-origin authenticated read-only R2 diagnostics',()=>{
 assert.match(page,/data-r2-audit-status/);
 assert.match(page,/data-r2-audit-results/);
 assert.match(page,/data-r2-audit/);
 assert.match(runtime,/fetch\('\/api\/shorekeeper\/diagnostics'/);
 assert.match(runtime,/credentials:'same-origin',cache:'no-store'/);
});
test('diagnostics differentiates Access AUD, Pages binding and R2 object errors',()=>{
 for(const expected of ['private_access_config_unavailable','pages_r2_binding_missing',
 'manifest_invalid_or_r2_error','manifest_missing','size_mismatch','missing','present'])
  assert.ok(runtime.includes(expected));
 assert.match(runtime,/Verifique o binding SHOREKEEPER_ASSETS_R2/);
});
