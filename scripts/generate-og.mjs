import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

// The card is rasterised by scripts/build-og-card.py (fonts included), so the
// build machine's fonts never matter. This step only encodes it as a JPEG.
await mkdir('public', { recursive: true });

await sharp('assets/og-portfolio.png')
  .resize(1200, 630, { fit: 'cover' })
  .jpeg({
    quality: 90,
    chromaSubsampling: '4:4:4',
    progressive: true,
  })
  .toFile('public/og-portfolio.jpg');

console.log('Generated public/og-portfolio.jpg');
