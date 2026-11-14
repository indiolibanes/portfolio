// @ts-check
import { defineConfig } from 'astro/config';
import sophiaFaceQa from './scripts/sophia-face-qa-integration.mjs';

export default defineConfig({
  site: 'https://kaue.pages.dev',
  output: 'static',
  integrations: [sophiaFaceQa()],
});
