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

export const site = siteJson;
export const pricing = pricingJson;
export const services = servicesJson;
export const testimonials = testimonialsJson;
export const faq = faqJson;
export const categories: Category[] = categoriesJson;
export const photos = photosJson as Photo[];
export const instagram: { photoId: string; url: string }[] = instagramJson;

export const galleryPhotos = photos.filter((p) => !p.hidden);
export const featuredPhotos = galleryPhotos.filter((p) => p.featured);

const byId = new Map(photos.map((p) => [p.id, p]));
export function getPhoto(id: string): Photo {
  const p = byId.get(id);
  if (!p) throw new Error(`Unknown photo id "${id}" — check content/gallery/photos.json`);
  return p;
}

export type SocialKey = keyof typeof site.socials;
export const activeSocials = (Object.entries(site.socials) as [SocialKey, string][]).filter(([, url]) => url);
