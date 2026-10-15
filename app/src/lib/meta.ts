import { useEffect } from 'react';
import siteJson from '../../content/site.json';
import categoriesJson from '../../content/gallery/categories.json';

export type PageMeta = { path: string; title: string; description: string; image?: string };

const s = siteJson;

/** Every prerendered route with its SEO metadata. Also drives sitemap.xml. */
export const pages: PageMeta[] = [
  { path: '/', title: `${s.name} — Photography Studio`, description: s.description },
  { path: '/gallery', title: `Gallery — ${s.name}`, description: `Selected weddings, portraits, fashion and commercial work by ${s.name}.` },
  ...categoriesJson.map((c) => ({
    path: `/gallery/${c.slug}`,
    title: `${c.title} — Gallery — ${s.name}`,
    description: `${c.title} photography by ${s.name}.`,
    image: `/images/${c.cover}-1600.jpg`,
  })),
  { path: '/quote', title: `Get a Quote — ${s.name}`, description: `Tell us about your shoot and get an indicative estimate from ${s.name} in a minute.` },
  { path: '/contact', title: `Contact — ${s.name}`, description: `Get in touch with ${s.name}: email, phone, WhatsApp or visit the studio.` },
  { path: '/privacy', title: `Privacy Policy — ${s.name}`, description: `How ${s.name} handles the information you share with us.` },
];

export const notFoundMeta: PageMeta = { path: '/404', title: `Page not found — ${s.name}`, description: s.description };

export function metaFor(path: string): PageMeta {
  const clean = path.replace(/\/+$/, '') || '/';
  return pages.find((p) => p.path === clean) ?? notFoundMeta;
}

/** Keeps the document title in sync on client-side navigation. */
export function useDocumentTitle(path: string): void {
  useEffect(() => {
    const m = metaFor(path);
    document.title = m.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', m.description);
  }, [path]);
}
