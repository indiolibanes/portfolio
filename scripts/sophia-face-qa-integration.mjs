// No route, client bundle, or private assets are added to production builds.
export default function sophiaFaceQa() {
  return {
    name: 'sophia-face-qa-dev-only',
    hooks: {
      'astro:config:setup': ({ command, injectRoute }) => {
        if (command !== 'dev') return;
        injectRoute({
          pattern: '/experimentos/sophia-face-qa/',
          entrypoint: new URL('../src/experiments/sophia-face-qa/Page.astro', import.meta.url).pathname,
          prerender: false,
        });
      },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use((req, res, next) => {
          if (req.url?.split('?')[0].startsWith('/experimentos/sophia-face-qa')) {
            res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
            res.setHeader('Cache-Control', 'no-store');
            res.setHeader('Referrer-Policy', 'no-referrer');
          }
          next();
        });
      },
    },
  };
}
