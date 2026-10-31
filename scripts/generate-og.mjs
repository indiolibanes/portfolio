import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

// Open Graph: authorial portfolio and Sophia's established illustration.
// Source of truth is this script: no obsolete meme raster or accessory layer.
const W = 1200, H = 630;
let seed = 23019;
const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
const stars = Array.from({ length: 72 }, () => {
  const x = Math.round(20 + random() * 1160);
  const y = Math.round(18 + random() * 590);
  const r = (0.7 + random() * 1.4).toFixed(1);
  const a = (0.18 + random() * .43).toFixed(2);
  return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#e8d8bd" opacity="' + a + '"/>';
}).join('');

const background = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">',
  '<defs><linearGradient id="night" x1="0" x2="1" y1="0" y2="1">',
  '<stop offset="0" stop-color="#080f25"/><stop offset=".56" stop-color="#121b3f"/>',
  '<stop offset="1" stop-color="#1d2e54"/></linearGradient>',
  '<radialGradient id="halo"><stop stop-color="#a89165" stop-opacity=".3"/>',
  '<stop offset="1" stop-color="#876d60" stop-opacity="0"/></radialGradient></defs>',
  '<rect width="1200" height="630" fill="url(#night)"/>',
  '<ellipse cx="926" cy="310" rx="500" ry="445" fill="url(#halo)"/>',
  stars,
  '<g fill="none" stroke="#d4ac73" opacity=".31" stroke-width="1">',
  '<circle cx="990" cy="320" r="306"/><circle cx="990" cy="320" r="376" stroke-dasharray="2 10"/>',
  '<path d="M810 88L898 142L1020 104L1100 166L1170 130"/></g>',
  '<g fill="#ecc894" opacity=".8">',
  '<circle cx="810" cy="88" r="3"/><circle cx="898" cy="142" r="2.5"/>',
  '<circle cx="1020" cy="104" r="3"/><circle cx="1100" cy="166" r="2.5"/>',
  '<circle cx="1170" cy="130" r="3"/></g></svg>',
].join('');

const typography = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">',
  '<defs><linearGradient id="readability" x1="0" x2="1">',
  '<stop offset="0" stop-color="#080e24" stop-opacity=".95"/>',
  '<stop offset=".39" stop-color="#0c1430" stop-opacity=".91"/>',
  '<stop offset=".63" stop-color="#0c1430" stop-opacity=".38"/>',
  '<stop offset=".82" stop-color="#0c1430" stop-opacity="0"/>',
  '</linearGradient></defs>',
  '<rect width="1200" height="630" fill="url(#readability)"/>',
  '<g fill="none" stroke="#ddbc8c" stroke-width="1.2" opacity=".64">',
  '<path d="M60 126 H520"/><path d="M60 467 H438"/><path d="M60 591 H1140"/></g>',
  '<path d="M62 74 L67 86 L79 91 L67 96 L62 108 L57 96 L45 91 L57 86 Z" fill="#eed1a2"/>',
  '<text x="96" y="96" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-weight="600" font-size="17" letter-spacing="2.9" fill="#efcf9d">PORTFÓLIO · LABORATÓRIO AUTORAL</text>',
  '<text x="58" y="224" font-family="DejaVu Serif, Georgia, serif" font-size="66" font-weight="700" fill="#fff1dc">Kauê Alencar</text>',
  '<text x="60" y="301" font-family="DejaVu Serif, Georgia, serif" font-size="32" font-style="italic" fill="#e2e6ef">Escrita, interfaces</text>',
  '<text x="60" y="347" font-family="DejaVu Serif, Georgia, serif" font-size="32" font-style="italic" fill="#e2e6ef">&amp; mundos possíveis.</text>',
  '<text x="60" y="432" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="15" letter-spacing=".9" fill="#d7ddef">DOCUMENTAÇÃO · DESIGN · EXPERIMENTOS 3D</text>',
  '<text x="60" y="553" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-weight="600" font-size="21" fill="#e9c48e">kaue.pages.dev</text>',
  '<text x="1142" y="592" text-anchor="end" font-family="DejaVu Sans, Arial, sans-serif" font-size="13" letter-spacing="1.3" fill="#ced4e1" opacity=".78">ESCRITA × EXPERIÊNCIA</text>',
  '</svg>',
].join('');

await mkdir('public', { recursive: true });
// Place the original 640x640 transparent Sophia at 2x and crop into the card.
// Keep the original gaze; do not recreate the old glasses or pointing paw.
const sophia = await sharp('public/images/sophia/lab-single-tail.webp')
  .resize(1280, 1280, { fit: 'fill' })
  .extract({ left: 0, top: 194, width: 890, height: H })
  .png()
  .toBuffer();

await sharp(Buffer.from(background))
  .composite([
    { input: sophia, left: 310, top: 0 },
    { input: Buffer.from(typography), left: 0, top: 0 },
  ])
  .jpeg({ quality: 89, chromaSubsampling: '4:4:4', progressive: true })
  .toFile('public/og-portfolio.jpg');

console.log('Generated public/og-portfolio.jpg: authorial OG, 1200 × 630');
