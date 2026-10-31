import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

// The original source contains Sophia in the approved raised-paw pose.
// Compose the revised editorial text at build time; never recreate her pose.
const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="editorial-veil" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#090e28" stop-opacity="1"/>
      <stop offset="87%" stop-color="#0b1130" stop-opacity="1"/>
      <stop offset="100%" stop-color="#0b1130" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <!-- Conceal the old caption and labels without moving Sophia's face or raised paw. -->
  <rect x="0" y="0" width="745" height="630" fill="url(#editorial-veil)"/>
  <path d="M60 100 H516" stroke="#d1b47d" stroke-width="1" stroke-opacity=".35"/>
  <path d="M60 533 H516" stroke="#d1b47d" stroke-width="1" stroke-opacity=".45"/>
  <circle cx="512" cy="100" r="3" fill="#e8c78d"/>
  <circle cx="60" cy="533" r="3" fill="#e8c78d"/>
  <text x="60" y="79" font-family="DejaVu Sans, sans-serif" font-size="18" font-weight="600" letter-spacing="1.5" fill="#e8c78d">PORTFÓLIO / LABORATÓRIO AUTORAL</text>
  <text x="56" y="199" font-family="DejaVu Serif, Georgia, serif" font-weight="bold" font-size="62" fill="#f6efdc">Kauê Alencar</text>
  <path d="M60 227 H158" stroke="#e8c78d" stroke-width="3"/>
  <text x="60" y="313" font-family="DejaVu Sans, sans-serif" font-size="39" fill="#d9e9f7">Escrita, sistemas</text>
  <text x="60" y="362" font-family="DejaVu Sans, sans-serif" font-size="39" fill="#d9e9f7">e mundos possíveis.</text>
  <text x="60" y="437" font-family="DejaVu Sans, sans-serif" font-size="23" fill="#b4c8e0">Documentação · interfaces</text>
  <text x="60" y="472" font-family="DejaVu Sans, sans-serif" font-size="23" fill="#b4c8e0">· experiências interativas</text>
  <text x="60" y="574" font-family="DejaVu Sans, sans-serif" font-size="22" fill="#e8c78d">kaue.pages.dev</text>
</svg>`);

// Build continues to emit a broadly supported, static 1200×630 JPEG.
// The optional legacy animated GIF is not used as an Open Graph image.
await mkdir('public', { recursive: true });
await sharp('assets/og-portfolio.png')
  .resize(1200, 630, { fit: 'cover' })
  .composite([{ input: overlay, blend: 'over' }])
  .jpeg({
    quality: 90,
    chromaSubsampling: '4:4:4',
    progressive: true,
  })
  .toFile('public/og-portfolio.jpg');
console.log('Generated public/og-portfolio.jpg — editorial Sophia card');
