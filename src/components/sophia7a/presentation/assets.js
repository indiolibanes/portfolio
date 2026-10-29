// Recursos DERIVADOS (não fazem parte do GLB). Importados como URL/JSON pelo bundler
// (Vite, Astro, webpack, esbuild). Podem ser substituídos via props.
import maskUrl from './assets/constellation-mask.png';
import anchors from './assets/sophia.anchors.json';

export const defaultMaskUrl = maskUrl;
export const defaultAnchors = anchors;

/** SHA-256 do GLB original do Tripo (Fase 7A). */
export const ORIGINAL_GLB_SHA256 = 'b0f2c2e9106768b74b0582a703cf5b1c4d4ac2aac57b461ddc22f5696791c53a';
export const ORIGINAL_GLB_BYTES = 17054692;
