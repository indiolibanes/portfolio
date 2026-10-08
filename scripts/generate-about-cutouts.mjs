/** Build the two static Shorekeeper layers from a reviewed spatial mask.
 * The source butterfly keeps its original RGBA pixels; no color keying is used.
 * The occluded part of the flower is restored under its original visible pixels.
 */
import sharp from 'sharp';
import { readFile, mkdir } from 'node:fs/promises';

const outputDir = 'public/assets/about';
await mkdir(outputDir, { recursive: true });

const source = await sharp('public/shorekeeper-black-shores.png')
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const { data: sourcePixels, info } = source;
const { width, height } = info;
if (width !== 1477 || height !== 1065) {
  throw new Error('Shorekeeper source dimensions changed; review both hand-drawn masks.');
}

const butterflySvg = await readFile('assets/about/shorekeeper-butterfly-mask.svg');
const flowerSvg = await readFile('assets/about/shorekeeper-flower-envelope.svg');
const [butterflyMask, flowerEnvelope, restoration] = await Promise.all([
  sharp(butterflySvg).resize(width, height).ensureAlpha().raw().toBuffer(),
  sharp(flowerSvg).resize(width, height).ensureAlpha().raw().toBuffer(),
  sharp('assets/about/flower-restoration.webp').ensureAlpha().raw().toBuffer(),
]);
if (restoration.length !== sourcePixels.length) {
  throw new Error('Flower restoration dimensions must match the original artwork.');
}

const butterfly = Buffer.from(sourcePixels);
const originalFlower = Buffer.from(sourcePixels);
const restoredFlower = Buffer.from(restoration);

// The repair zone overlaps the hand-traced shared edge. Soft coverage removes
// the butterfly's luminous fringe from the stationary flower without RGB tests.
const repairSvg = Buffer.from(butterflySvg.toString()
  .replace('fill="white"', 'fill="white" stroke="white" stroke-width="16"'));
const repairMask = await sharp(repairSvg).resize(width, height).blur(5).ensureAlpha().raw().toBuffer();

for (let i = 0; i < sourcePixels.length; i += 4) {
  const silhouette = butterflyMask[i + 3] / 255;
  const envelope = flowerEnvelope[i + 3] / 255;
  const removed = repairMask[i + 3] / 255;
  butterfly[i + 3] = Math.round(sourcePixels[i + 3] * silhouette);
  originalFlower[i + 3] = Math.round(sourcePixels[i + 3] * (1 - removed) * envelope);
  // Clip every generated pixel to the hand-drawn flower boundary. This avoids
  // stray restoration alpha outside the petals and keeps the flower stationary.
  restoredFlower[i + 3] = Math.round(restoration[i + 3] * envelope);
}

await sharp(butterfly, { raw: { width, height, channels: 4 } })
  .webp({ lossless: true })
  .toFile(`${outputDir}/shorekeeper-butterfly.webp`);

const flowerBase = await sharp(restoredFlower, { raw: { width, height, channels: 4 } }).png().toBuffer();
await sharp(flowerBase)
  .composite([{ input: await sharp(originalFlower, { raw: { width, height, channels: 4 } }).png().toBuffer() }])
  .webp({ lossless: true })
  .toFile(`${outputDir}/shorekeeper-flower.webp`);
