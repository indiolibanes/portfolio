/**
 * Private runner for the G7 mechanical A/B. Run on the owner's machine, inside a checkout of the S5 head with
 * node_modules installed, against the private G11.3 kit (canonical model + basic/advanced/burst libraries).
 *
 *   node .qa-s6a/g7/run-g7-ab-private.mjs PRIVATE_KIT_DIR PRIVATE_OUTPUT_DIR
 *
 * PRIVATE_KIT_DIR must hold shorekeeper-f20a.glb, basic.glb, advanced.glb, burst.glb and expected.json
 * ({"files":{"<name>":{"sha256":"…","bytes":N}}} or {"<name>":"<sha256>"}). Every byte is hashed before parsing.
 * The output directory must be outside any Git checkout; files are created exclusively (never overwritten).
 * Nothing is fetched, uploaded, rendered or written back to the sources.
 */
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
import * as T from 'three';
import {parseDataOnly} from '../../scripts/shorekeeper/audit-private-source.mjs';
import {validateCombatLibrary} from '../../src/scripts/shorekeeper/combat-director.mjs';
import {createRebasedBurstClip,createBindRootBurstClip} from '../../src/scripts/shorekeeper/liberation-rotation.mjs';
import {disposeObject} from '../../src/scripts/shorekeeper/local-model.mjs';
import {auditG7} from './g7-ab-mechanical.mjs';
const [kit, output] = process.argv.slice(2).map(p => p && path.resolve(p));
if (!kit || !output) { console.error('Usage: node .qa-s6a/g7/run-g7-ab-private.mjs PRIVATE_KIT_DIR PRIVATE_OUTPUT_DIR'); process.exit(1); }
const insideGit = p => { try { execFileSync('git', ['-C', p, 'rev-parse', '--is-inside-work-tree'], {stdio: 'pipe'}); return true; } catch { return false; } };
await fs.mkdir(path.dirname(output), {recursive: true});
if (insideGit(path.dirname(output))) throw Error('Private output must be outside any Git checkout');
await fs.mkdir(output, {mode: 0o700});
const expectedRaw = JSON.parse(await fs.readFile(path.join(kit, 'expected.json'), 'utf8')), expected = expectedRaw.files ?? expectedRaw;
const want = name => { const e = expected[name]; return typeof e === 'string' ? {sha256: e} : e; };
const scenes = [];
async function load(name) {
  const bytes = await fs.readFile(path.join(kit, name)), sha256 = createHash('sha256').update(bytes).digest('hex'), e = want(name);
  if (!e || e.sha256 !== sha256 || (e.bytes !== undefined && e.bytes !== bytes.length)) throw Error('Hash/size mismatch for ' + name + ' — refusing to audit unverified bytes');
  const {gltf} = await parseDataOnly(bytes); scenes.push(gltf.scene); return gltf;
}
try {
  const model = await load('shorekeeper-f20a.glb'), library = [];
  for (const name of ['basic.glb', 'advanced.glb', 'burst.glb']) {
    const data = await load(name);
    for (const c of validateCombatLibrary(T, model.scene, data)) { library.push(c); if (/^SK_BURST_0[12]_ORIGINAL$/.test(c.name)) library.push(createRebasedBurstClip(T, model.scene, c).clip, createBindRootBurstClip(T, model.scene, c).clip); }
  }
  for (const c of model.animations ?? []) if (!library.some(x => x.name === c.name)) library.push(c);
  const report = auditG7(T, model.scene, library);
  report.inputs = 'VERIFIED_AGAINST_EXPECTED_JSON (hashes intentionally not copied into this report)';
  await fs.writeFile(path.join(output, 'S6A_G7_AB_PRIVATE.json'), JSON.stringify(report, null, 2), {mode: 0o600, flag: 'wx'});
  const lines = ['variant,from,to,t_seq,fade,gap_mean_deg,gap_max_deg,gap_max_bone,root_disp_m,root_yaw_deg,pelvis_disp_m,step30_max_deg,step30_world_m,step60_max_deg,step60_world_m'];
  for (const [v, r] of Object.entries(report.variants)) (r.transitions ?? []).forEach((tr, j) => lines.push([v, tr.from, tr.to, tr.sequenceTime, tr.fade, tr.sourceGap.meanLocalDeg, tr.sourceGap.maxLocalDeg, tr.sourceGap.maxLocalBone, tr.sourceGap.world.Root?.displacementM, tr.sourceGap.world.Root?.yawDeltaDeg, tr.sourceGap.world.Bip001Pelvis?.displacementM, r.blended[30].perTransition[j].maxLocalStepDeg, r.blended[30].perTransition[j].maxWorldStepM, r.blended[60].perTransition[j].maxLocalStepDeg, r.blended[60].perTransition[j].maxWorldStepM].join(',')));
  await fs.writeFile(path.join(output, 'S6A_G7_AB_PRIVATE.csv'), lines.join('\n') + '\n', {mode: 0o600, flag: 'wx'});
  console.log('G7 A/B written to', output, '— numeric only; G7 stays NO_GO until reviewed.');
} finally { for (const s of scenes) disposeObject(s); }
