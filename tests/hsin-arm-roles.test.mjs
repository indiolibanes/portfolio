// Arm roles: right arm = signature under the chin, left arm = hand on the chest. No THREE, no rig, no GLB.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ARM_ROLES, assertDisjointRoles, classifyArmSides, oppositeSide} from '../src/scripts/hsin-arm-roles.mjs';
import {createChestPose} from '../src/scripts/hsin-chest-gesture.mjs';

// ---------------------------------------------------------------------------------------------
// 1. The table itself.
// ---------------------------------------------------------------------------------------------
assert.equal(ARM_ROLES.signature.side, 'R');
assert.equal(ARM_ROLES.chest.side, 'L');
assert.equal(ARM_ROLES.signature.gesture, 'under-chin');
assert.equal(ARM_ROLES.chest.gesture, 'hand-on-chest');
assert.ok(Object.isFrozen(ARM_ROLES) && Object.isFrozen(ARM_ROLES.signature) && Object.isFrozen(ARM_ROLES.chest));
assert.equal(assertDisjointRoles(), true);
assert.throws(() => assertDisjointRoles({a: {side: 'R'}, b: {side: 'R'}}), /share the same arm/);
assert.throws(() => assertDisjointRoles({a: {side: 'X'}}), /side L or R/);
assert.equal(oppositeSide('L'), 'R');
assert.equal(oppositeSide('R'), 'L');

// ---------------------------------------------------------------------------------------------
// 2. The chest gesture can never run on the signature arm, and its default is the chest arm.
// ---------------------------------------------------------------------------------------------
const noRig = {bones: [], meshes: [], head: null, calibration: {ready: false}};
const refused = createChestPose({THREE: undefined, ...noRig, side: ARM_ROLES.signature.side});
assert.equal(refused.diagnostics().ready, false);
assert.equal(refused.diagnostics().role, 'REFUSED');
assert.match(refused.diagnostics().reason, /não executa o gesto de peito/);
assert.equal(refused.apply(1), false);
assert.equal(refused.atBaseline(), false);
refused.restore(); // must be a harmless no-op: it owns no bone
const byDefault = createChestPose({THREE: undefined, ...noRig});
assert.notEqual(byDefault.diagnostics().role, 'REFUSED', 'the default side must be the chest arm');

// ---------------------------------------------------------------------------------------------
// 3. Anatomical side classification from geometry.
// ---------------------------------------------------------------------------------------------
// Character faces +Z (toward the viewer) with +Y up: its right hand is at -X.
const facingViewer = {root: [0, 1, 0], up: [0, 1, 0], forward: [0, 0, 1]};
const matches = classifyArmSides({...facingViewer, shoulderR: [-.2, 1.4, 0], shoulderL: [.2, 1.4, 0]});
assert.equal(matches.status, 'MATCHES_ROLES');
assert.ok(matches.separation > 0);
const mirrored = classifyArmSides({...facingViewer, shoulderR: [.2, 1.4, 0], shoulderL: [-.2, 1.4, 0]});
assert.equal(mirrored.status, 'MIRRORED');
assert.match(mirrored.reason, /espelhado/);
// The answer must not depend on how the character is placed in the world.
const facingX = {root: [0, 1, 0], up: [0, 1, 0], forward: [1, 0, 0]}; // right hand toward forward × up = +Z
assert.equal(classifyArmSides({...facingX, shoulderR: [0, 1.4, .2], shoulderL: [0, 1.4, -.2]}).status, 'MATCHES_ROLES');
assert.equal(classifyArmSides({...facingX, shoulderR: [0, 1.4, -.2], shoulderL: [0, 1.4, .2]}).status, 'MIRRORED');
// Forward need not be perpendicular to up (it is measured from the eyes): the vertical part is discarded.
const tilted = classifyArmSides({root: [0, 1, 0], up: [0, 1, 0], forward: [0, .6, 1], shoulderR: [-.2, 1.4, 0], shoulderL: [.2, 1.4, 0]});
assert.equal(tilted.status, 'MATCHES_ROLES');
// Shoulder height must not change the answer either.
assert.equal(classifyArmSides({...facingViewer, shoulderR: [-.2, 5, 3], shoulderL: [.2, -4, -2]}).status, 'MATCHES_ROLES');
// Refuses to guess.
assert.equal(classifyArmSides({...facingViewer, shoulderR: [0, 1.4, 0], shoulderL: [0, 1.4, 0]}).status, 'INDETERMINATE');
assert.equal(classifyArmSides({root: [0, 0, 0], up: [0, 0, 0], forward: [0, 0, 1], shoulderR: [-1, 0, 0], shoulderL: [1, 0, 0]}).status, 'INDETERMINATE');
assert.equal(classifyArmSides({root: [0, 0, 0], up: [0, 1, 0], forward: [0, 1, 0], shoulderR: [-1, 0, 0], shoulderL: [1, 0, 0]}).status, 'INDETERMINATE');
assert.equal(classifyArmSides({root: [0, 0, 0], up: [0, 1, 0], forward: [0, 0, 1], shoulderR: [NaN, 0, 0], shoulderL: [1, 0, 0]}).status, 'INDETERMINATE');
assert.equal(classifyArmSides({}).status, 'INDETERMINATE');

// ---------------------------------------------------------------------------------------------
// 4. Static ownership: each arm's module names only its own bones, and the lab wires the table.
// ---------------------------------------------------------------------------------------------
const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const signatureSource = await read('../src/scripts/hsin-right-signature.mjs');
const chestSource = await read('../src/scripts/hsin-chest-gesture.mjs');
const labSource = await read('../src/scripts/hsin-local-lab.ts');
assert.ok(!/Bip001\w*\.L\b/.test(signatureSource), 'the signature module must name only .R bones');
assert.ok(/Bip001\w*\.R\b/.test(signatureSource));
assert.ok(!/side\s*=\s*'R'/.test(chestSource), 'the chest pose must not default to the right arm');
assert.ok(chestSource.includes('ARM_ROLES.chest.side'));
const chestCall = labSource.replace(/\s+/g, ' ').match(/createChestPose\(.{0,600}?\}\)/)?.[0] ?? '';
assert.ok(chestCall.includes('side:ARM_ROLES.chest.side'), 'the lab must pass the chest role side explicitly');
assert.ok(!chestCall.includes("side:'R'") && !chestCall.includes("side:'L'"), 'no literal side in the lab call');

console.log('Arm roles: right=under-chin, left=chest, disjoint, chest refuses the signature arm, anatomical side classified from geometry PASS');
