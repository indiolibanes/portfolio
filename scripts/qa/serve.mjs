/** Minimal static server for the visual QA harness. Serves public/ first, then the repository root. No write access. */
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {extname, join, normalize} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const types = {'.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.glb': 'model/gltf-binary', '.css': 'text/css'};
async function locate(path) {
 const clean = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, '');
 for (const base of [join(root, 'public'), root]) {
  const file = join(base, clean);
  if (!file.startsWith(base)) continue;
  try { if ((await stat(file)).isFile()) return file; } catch { /* next base */ }
 }
 return null;
}
export function serve(port = 0) {
 const server = createServer(async (request, response) => {
  const file = await locate(new URL(request.url, 'http://x').pathname);
  if (!file) { response.writeHead(404).end('not found'); return; }
  response.writeHead(200, {'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store'});
  response.end(await readFile(file));
 });
 return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({server, port: server.address().port, url: `http://127.0.0.1:${server.address().port}`})));
}
