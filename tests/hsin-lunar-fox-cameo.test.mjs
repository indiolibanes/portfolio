// Calling Lunar Fox: the cameo file must be a complete WebP, the button must only appear once the render decodes,
// and the scene pose hold must stay behind laboratory access. No browser, no three.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url));
const asset = await read('../public/assets/hsin-3d-calling-lunar-fox.webp');

// ---------------------------------------------------------------------------------------------
// 1. The file is complete: RIFF length matches, chunks walk exactly to the end, canvas is readable.
//    (The committed file in e32a493 declares 18 374 bytes of RIFF payload but contains 14 981.)
// ---------------------------------------------------------------------------------------------
assert.equal(asset.toString('ascii', 0, 4), 'RIFF', 'RIFF header');
assert.equal(asset.toString('ascii', 8, 12), 'WEBP', 'WEBP signature');
const riffSize = asset.readUInt32LE(4);
assert.equal(riffSize + 8, asset.length, `RIFF declares ${riffSize + 8} bytes but the file has ${asset.length}: truncated`);
let offset = 12, chunks = [];
while (offset + 8 <= asset.length) {
  const type = asset.toString('ascii', offset, offset + 4), size = asset.readUInt32LE(offset + 4);
  chunks.push(type);
  assert.ok(offset + 8 + size <= asset.length, `chunk ${type} runs past the end of the file`);
  offset += 8 + size + (size & 1);
}
assert.equal(offset, asset.length, 'chunks end exactly at the end of the file');
assert.ok(chunks.includes('VP8X') && chunks.some((c) => c === 'VP8 ' || c === 'VP8L'), `image data chunks present: ${chunks.join(', ')}`);
const canvasWidth = 1 + asset.readUIntLE(24, 3), canvasHeight = 1 + asset.readUIntLE(27, 3);
assert.ok(canvasWidth >= 260 && canvasHeight >= 305, `canvas ${canvasWidth}x${canvasHeight} is at least the displayed size`);

// The <img> attributes must describe the same proportion as the file, so the frame reserves the right space.
const shelf = (await read('../src/components/MusicShelf.astro')).toString('utf8');
const imgTag = shelf.match(/<img\s[^>]*data-lunar-fox-image[^>]*>/)?.[0] ?? '';
assert.ok(imgTag, 'the cameo image is marked data-lunar-fox-image');
const attr = (name) => Number(imgTag.match(new RegExp(`${name}="(\\d+)"`))?.[1]);
assert.ok(Math.abs(attr('width') / attr('height') - canvasWidth / canvasHeight) < .02, 'img proportion matches the file');

// ---------------------------------------------------------------------------------------------
// 2. The button is out of the page until the render decodes; a broken file never shows an empty frame.
// ---------------------------------------------------------------------------------------------
const buttonTag = shelf.match(/<button\s[^>]*data-lunar-fox-call[^>]*>/)?.[0] ?? '';
assert.ok(/\shidden[\s>]/.test(buttonTag + ' '), 'the button starts hidden');
assert.ok(shelf.includes('const revealLunarFox'), 'a reveal step exists');
assert.ok(/naturalWidth === 0\) return false/.test(shelf), 'reveal refuses an image that did not decode');
assert.ok(/addEventListener\('load', revealLunarFox/.test(shelf), 'the button appears on load');
assert.ok(/if \(lunarFoxButton\.hidden\) return;/.test(shelf), 'a click cannot activate a hidden call');

// ---------------------------------------------------------------------------------------------
// 3. Design system: the button uses the site's tokens and leaves the blue residue behind.
// ---------------------------------------------------------------------------------------------
const css = (await read('../src/styles/music-gallery.css')).toString('utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const callRules = css.split('}').filter((r) => /music-lunar-fox-call/.test(r)).join('}');
assert.ok(callRules.includes('var(--sun-soft)'), 'button background comes from the site token');
assert.ok(callRules.includes('var(--rose)') && callRules.includes('var(--gold-block-light)'), 'focus and hover use site tokens');
assert.ok(!/rgba\(\s*(157|210|10|17)\s*,/.test(callRules) && !/#9de6ff|#e6f6ff/i.test(callRules), 'no blue residue in the button');

// The frame sits over the 2D Hsin at her scale: nearly the full panel height, not the old half-height strip.
const cameo = css.split('}').filter((r) => /music-lunar-fox-cameo\s*\{/.test(r) && !/\[data-active/.test(r)).join('}');
assert.ok(/height:\s*94%/.test(cameo) && /top:\s*3%/.test(cameo), 'cameo spans the panel height over the central figure');
assert.ok(!/height:\s*49%/.test(cameo), 'the old half-height frame is gone');

// ---------------------------------------------------------------------------------------------
// 4. The scene pose hold is laboratory-only.
// ---------------------------------------------------------------------------------------------
const lab = (await read('../src/scripts/hsin-local-lab.ts')).toString('utf8');
const hold = lab.match(/if \(resolveLabAccess\(window\.location\.search\) !== 'none'[^\n]*\n\s*chestPose\.apply\(1\);/);
assert.ok(hold, '?pose=cena holds the chest pose only with laboratory access');

console.log('Calling Lunar Fox: complete WebP, button only after decode, site tokens, cameo at the 2D Hsin scale, laboratory-only pose PASS');
