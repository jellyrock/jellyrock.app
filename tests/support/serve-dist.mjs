// Serves dist/ the way production does (Caddy `file_server` on the VPS), so the browser
// tests see what visitors see: the production security headers, a 308 to the trailing-slash
// URL for directories, index.html for directories, and Caddy's plain-text error body.
// The first-party analytics proxy (/_a/*) is stubbed; it reverse-proxies to Umami in production.
//
// Usage: node tests/support/serve-dist.mjs [port]   (default 4322, root ./dist)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../dist');
const port = Number(process.argv[2] ?? process.env.PORT ?? 4322);
const securityHeaders = JSON.parse(await readFile(path.join(here, 'production-headers.json'), 'utf8'));
delete securityHeaders.$comment;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const send = (res, status, body, type, extra = {}) => {
  res.writeHead(status, { ...securityHeaders, 'Content-Type': type, ...extra });
  res.end(body);
};

const isFile = async (p) => (await stat(p).catch(() => null))?.isFile() ?? false;
const isDir = async (p) => (await stat(p).catch(() => null))?.isDirectory() ?? false;

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/_a/script.js') return send(res, 200, '', types['.js']);
  if (pathname.startsWith('/_a/')) return send(res, 204, '', types['.txt']);

  const target = path.join(root, pathname);
  if (!target.startsWith(root)) return send(res, 404, '404 Not Found', types['.txt']);

  if (await isDir(target)) {
    if (!pathname.endsWith('/')) return send(res, 308, '', types['.txt'], { Location: `${pathname}/${url.search}` });
    const index = path.join(target, 'index.html');
    if (await isFile(index)) return send(res, 200, await readFile(index), types['.html']);
  } else if (await isFile(target)) {
    return send(res, 200, await readFile(target), types[path.extname(target)] ?? 'application/octet-stream');
  }
  return send(res, 404, '404 Not Found', types['.txt']);
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`));
