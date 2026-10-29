// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://kaue.pages.dev',
  output: 'static',
  integrations: [react()],
});
