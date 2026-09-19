import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

await mkdir('public', { recursive: true });

await sharp('assets/og-portfolio.svg')
  .resize(1200, 630, { fit: 'cover' })
  .jpeg({
    quality: 90,
    chromaSubsampling: '4:4:4',
    progressive: true,
  })
  .toFile('public/og-portfolio.jpg');

console.log('Generated public/og-portfolio.jpg');
