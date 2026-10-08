/**
 * Split Shorekeeper's existing illustration into a fixed flower/background
 * and an in-place cyan-wing overlay. The original pixels are preserved:
 * unlike the previous SVG alpha matrix, this mask never removes pale flower
 * petals simply because they are close to the butterfly.
 *
 * This is generated at build time with Sharp; no canvas or per-frame image
 * processing is performed on visitors' devices.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const source = 'public/shorekeeper-black-shores.png';
const directory = 'public/assets';
const baseTarget = directory + '/about-shorekeeper-base.webp';
const wingsTarget = directory + '/about-shorekeeper-wings.webp';

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const base = Buffer.from(data);
const wings = Buffer.alloc(data.length, 0);

const clamp = (v, low = 0, high = 1) => Math.max(low, Math.min(high, v));
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

let weightedPixels = 0;
let significantPixels = 0;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const pos = (y * width + x) * channels;
    const [red, green, blue, alpha] = data.subarray(pos, pos + 4);
    if (alpha < 5) continue;

    // Spatial region of the original butterfly, feathered at the boundary.
    // Coordinates are defined relative to the SVG source's 800x689 viewBox.
    const dx = (x / width - 0.52) / 0.30;
    const dy = (y / height - 0.40) / 0.275;
    const radial = Math.sqrt(dx * dx + dy * dy);
    const region = 1 - smooth(0.79, 1, radial);
    if (region <= 0) continue;

    // The butterfly is luminous cyan/blue; the pale flower is primarily
    // neutral white. Never use colour alone over the full illustration.
    const coolChromaticity = 0.70 * (blue - red) + 0.30 * (green - red);
    const blueScore = smooth(18, 76, coolChromaticity);
    const foreground = smooth(95, 175, Math.max(green, blue));
    const nonNeutral = smooth(8, 36, Math.max(blue, green) - red);
    const confidence = region * blueScore * foreground * nonNeutral;
    const wingAlpha = Math.round(alpha * confidence);
    if (wingAlpha === 0) continue;

    // Full image dimensions guarantee that the departing wings begin at
    // exactly the original location and size; no thumbnail is introduced.
    wings[pos] = red;
    wings[pos + 1] = green;
    wings[pos + 2] = blue;
    wings[pos + 3] = wingAlpha;
    base[pos + 3] = Math.round(alpha * (1 - confidence));
    weightedPixels += wingAlpha / 255;
    if (wingAlpha > 120) significantPixels++;
  }
}

// If this source is replaced by a differently coloured illustration, fail
// visibly during build instead of silently reintroducing a broken animation.
const coverage = weightedPixels / (width * height);
if (coverage < 0.00045 || coverage > 0.145 || significantPixels < 80) {
  throw new Error(
    `Shorekeeper segmentation inconclusive: ${width}x${height}, ` +
    `wing coverage ${(100 * coverage).toFixed(3)}%, ` +
    `significant pixels ${significantPixels}. Keep original visible; re-evaluate mask.`
  );
}

await mkdir(directory, { recursive: true });
await Promise.all([
  sharp(base, { raw: { width, height, channels } }).webp({ lossless: true, effort: 4 }).toFile(baseTarget),
  sharp(wings, { raw: { width, height, channels } }).webp({ lossless: true, effort: 4 }).toFile(wingsTarget),
]);
console.log(
  `Shorekeeper assets: ${width}x${height}; butterfly coverage ` +
  `${(100 * coverage).toFixed(2)}%; fixed flower kept outside cyan region.`
);
