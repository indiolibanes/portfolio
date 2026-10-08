import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
const sources = ['assets/luna-sailor-moon.webp', 'assets/typing-left.webp', 'assets/typing-right.webp', 'assets/violet-evergarden.webp', 'shannon-blackboard-transparent.gif'];
await mkdir('public/assets/motion-stills', { recursive: true });
for (const src of sources) {
  const name = src.split('/').pop().replace(/\.[^.]+$/, '');
  await sharp(`public/${src}`, { page: 0, pages: 1 }).webp({ quality: 85 }).toFile(`public/assets/motion-stills/${name}.webp`);
}
