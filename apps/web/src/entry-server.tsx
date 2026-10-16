import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';
import { metaFor, ROUTES, type Route } from './routes';

export { ROUTES };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function render(route: Route) {
  const m = metaFor(route);
  const html = renderToString(<StrictMode><App route={route} /></StrictMode>);
  const head = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}">`,
    m.noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${m.canonical}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Outhere">`,
    `<meta property="og:title" content="${esc(m.title)}">`,
    `<meta property="og:description" content="${esc(m.description)}">`,
    `<meta property="og:url" content="${m.canonical}">`,
    `<meta property="og:image" content="${m.image}">`,
    `<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">`,
    `<meta property="og:locale" content="en_GB">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ].join('\n    ');
  return { html, head };
}
