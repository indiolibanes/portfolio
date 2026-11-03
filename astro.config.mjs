// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://kaue.pages.dev',
  output: 'static',
  // Exact host used by the managed development preview; no production access change.
  vite: { server: { allowedHosts: ['terminal.local'] } },
});
