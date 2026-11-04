// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://kaue.pages.dev',
  output: 'static',
  vite: { server: { allowedHosts: ['terminal.local'] } },
  vite: { server: { allowedHosts: ['terminal.local'] } },
});
