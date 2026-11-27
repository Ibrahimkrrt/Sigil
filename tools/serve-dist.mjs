// Serves the production build with the single-page fallback a static host needs:
// any path that is not a file answers with index.html. Usage: node tools/serve-dist.mjs [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist/sigil-angular/browser');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.png': 'image/png' };
createServer(async (request, response) => {
  const name = decodeURIComponent(new URL(request.url, 'http://x').pathname);
  const file = path.join(root, path.normalize(name));
  for (const candidate of [file, path.join(root, 'index.html')]) {
    if (!candidate.startsWith(root)) continue;
    try {
      const body = await readFile(candidate);
      response.writeHead(200, { 'content-type': types[path.extname(candidate)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      response.end(body);
      return;
    } catch { /* not a file: fall through to index.html */ }
  }
  response.writeHead(404).end();
}).listen(Number(process.argv[2] ?? 4200), () => console.log('serving', root));
