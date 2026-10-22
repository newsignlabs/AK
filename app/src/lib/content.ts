import siteJson from '../../content/site.json';
import pricingJson from '../../content/pricing.json';
import servicesJson from '../../content/services.json';
import testimonialsJson from '../../content/testimonials.json';
import faqJson from '../../content/faq.json';
import categoriesJson from '../../content/gallery/categories.json';
import photosJson from '../../content/gallery/photos.json';
import instagramJson from '../../content/instagram.json';

export type Photo = {
  id: string;
  file: string;
  alt: string;
  category: string;
  caption: string;
  featured: boolean;
  hidden?: boolean;
  w: number;
  h: number;
  widths: number[];
  lqip: string;
};

export type Category = { slug: string; title: string; cover: string };

// Photos without generated sizes (e.g. an upload whose build-time processing
// failed) are left out rather than breaking the page.
export const photos = (photosJson as Partial<Photo>[]).filter((p): p is Photo => Boolean(p.widths?.length && p.w && p.h && p.lqip));
const byId = new Map(photos.map((p) => [p.id, p]));

export const site = siteJson;
export type Logo = { id: string; file: string; w?: number; h?: number };
/** The uploaded logo once the build has processed it, otherwise null (text monogram is shown). */
export const logo: (Logo & { w: number; h: number }) | null = (() => {
  const l = (siteJson as { logo?: Logo | null }).logo;
  return l && l.w && l.h ? (l as Logo & { w: number; h: number }) : null;
})();
export const pricing = pricingJson;
export const services = servicesJson;
export const testimonials = testimonialsJson;
export const faq = faqJson;
export const categories: Category[] = categoriesJson;
export const instagram: { photoId: string; url: string }[] = instagramJson.filter((x) => byId.has(x.photoId));

export const galleryPhotos = photos.filter((p) => !p.hidden);
export const featuredPhotos = galleryPhotos.filter((p) => p.featured);

export function getPhoto(id: string): Photo {
  const p = byId.get(id);
  if (p) return p;
  console.warn(`Photo "${id}" is missing or not processed yet; using a fallback.`);
  return photos[0];
}

export type SocialKey = keyof typeof site.socials;
export const activeSocials = (Object.entries(site.socials) as [SocialKey, string][]).filter(([, url]) => url);
