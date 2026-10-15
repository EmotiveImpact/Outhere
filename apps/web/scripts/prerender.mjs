/* global process, console */
// Writes every route as static HTML (dist/<path>/index.html) from the SSR build,
// plus the sitemap. Run by `pnpm build` after the client and server builds.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const ssr = join(root, 'dist-ssr', 'entry-server.js');
const site = (process.env.VITE_SITE_URL || 'https://weouthere.app').replace(/\/$/, '');

const { render, ROUTES } = await import(pathToFileURL(ssr).href);
const template = readFileSync(join(dist, 'index.html'), 'utf8');

for (const route of ROUTES) {
  const { html, head } = render(route);
  const page = template.replace('<!--head-->', head).replace('<!--app-->', html);
  const file = route.page === 'notfound' ? join(dist, '404.html') : join(dist, route.path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page);
}

const urls = ROUTES.filter((r) => r.page !== 'notfound' && r.path !== '/boroughs').map((r) => `  <url><loc>${site}${r.path === '/' ? '/' : r.path}</loc></url>`);
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
rmSync(join(root, 'dist-ssr'), { recursive: true, force: true });
console.log(`prerendered ${ROUTES.length} pages`);
