// Renders every route to static HTML after `vite build` so crawlers and link
// previews (WhatsApp, Instagram, Facebook) get real content and meta tags.
// Also writes 404.html, sitemap.xml and robots.txt.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const ssr = await import(pathToFileURL(path.join(root, 'dist-ssr/entry-server.js')).href);
const { render, pages, notFoundMeta, adminMeta, site, categories } = ssr;
const template = await readFile(path.join(dist, 'index.html'), 'utf8');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const abs = (p) => new URL(p, site.url).href;
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');

const business = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': `${site.url}/#studio`,
  name: site.name,
  description: site.description,
  url: site.url,
  image: abs('/og-image.jpg'),
  email: site.email,
  telephone: site.phone,
  address: {
    '@type': 'PostalAddress',
    streetAddress: site.address.street,
    addressLocality: site.address.city,
    addressRegion: site.address.region,
    postalCode: site.address.postalCode,
    addressCountry: site.address.country,
  },
  geo: { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng },
  sameAs: Object.values(site.socials).filter(Boolean),
};

function head(meta) {
  const url = abs(meta.path === '/404' ? '/' : meta.path);
  const image = abs(meta.image ?? '/og-image.jpg');
  const ld = [business];
  if (meta.path.startsWith('/gallery')) {
    ld.push({ '@context': 'https://schema.org', '@type': 'ImageGallery', name: meta.title, url, author: { '@id': `${site.url}/#studio` } });
  }
  return [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    meta.path === '/404' || meta.path === '/admin' ? '<meta name="robots" content="noindex, nofollow" />' : `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(site.name)}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    `<link rel="preload" as="image" type="image/avif" imagesrcset="/images/hero-480.avif 480w, /images/hero-960.avif 960w, /images/hero-1600.avif 1600w, /images/hero-2400.avif 2400w" imagesizes="100vw" />`,
    ...ld.map((o) => `<script type="application/ld+json">${json(o)}</script>`),
  ]
    .filter((l) => meta.path === '/' || !l.includes('rel="preload"'))
    .join('\n    ');
}

async function write(route, meta) {
  const html = template
    .replace('<!--app-head-->', head(meta))
    .replace('<div id="root">', `<div id="root" data-route="${route}">`)
    .replace('<!--app-html-->', await render(route));
  // Hosts differ on mapping /gallery → gallery.html or gallery/index.html; write both.
  const files =
    route === '/404'
      ? [path.join(dist, '404.html')]
      : route === '/'
        ? [path.join(dist, 'index.html')]
        : [path.join(dist, route, 'index.html'), path.join(dist, `${route}.html`)];
  for (const file of files) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, html);
  }
  console.log(`  prerendered ${route}`);
}

for (const meta of pages) await write(meta.path, meta);
await write('/404', notFoundMeta);
await write('/admin', adminMeta); // client-only editor shell; not in the sitemap

const today = new Date().toISOString().slice(0, 10);
await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map((p) => `  <url><loc>${abs(p.path)}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
);
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin\n\nSitemap: ${abs('/sitemap.xml')}\n`);
// Published so the enquiry function prices quotes with the latest admin edits.
await writeFile(path.join(dist, 'pricing.json'), await readFile(path.join(root, 'content/pricing.json'), 'utf8'));
await rm(path.join(root, 'dist-ssr'), { recursive: true, force: true });
console.log(`Prerendered ${pages.length + 1} pages (${categories.length} gallery categories).`);
