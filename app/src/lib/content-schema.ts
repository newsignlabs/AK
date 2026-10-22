import { z } from 'zod';

/**
 * Shape of every editable content file. The admin function validates edits
 * with these before committing, so a bad edit can never break the build.
 */

const text = (max: number, min = 0) => z.string().trim().min(min).max(max);
const id = z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}$/, 'Use lowercase letters, numbers and dashes');
const slug = id;
const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\/[^\s]+$/i.test(v), 'Must start with http:// or https://');
const money = z.number().int().min(0).max(100_000_000);

export const siteSchema = z
  .object({
    name: text(80, 1),
    shortName: text(12, 1),
    tagline: text(120, 1),
    description: text(300, 1),
    url: httpUrl.refine((v) => v !== '', 'Required'),
    email: z.email(),
    phone: text(30, 3),
    address: z.object({
      street: text(120),
      city: text(80, 1),
      region: text(80),
      postalCode: text(20),
      country: text(2, 2),
    }),
    geo: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }),
    hours: z.array(z.object({ days: text(40, 1), time: text(40, 1) })).max(10),
    appointmentNote: text(200),
    whatsapp: z.object({
      number: z.string().regex(/^\d{8,15}$/, 'International format, digits only (e.g. 919812345678)'),
      defaultMessage: text(300, 1),
    }),
    socials: z.object({
      instagram: httpUrl,
      facebook: httpUrl,
      youtube: httpUrl,
      pinterest: httpUrl,
      behance: httpUrl,
      linkedin: httpUrl,
      x: httpUrl,
    }),
    googleBusinessUrl: httpUrl,
    defaultCountryCode: text(6),
    stats: z.array(z.object({ value: z.number().int().min(0).max(1_000_000), suffix: text(4), label: text(60, 1) })).max(6),
    about: z.object({
      heading: text(120, 1),
      body: z.array(text(1200, 1)).min(1).max(6),
      portraitId: id,
    }),
    process: z.array(z.object({ title: text(40, 1), text: text(200, 1) })).min(1).max(8),
    marquee: z.array(text(40, 1)).min(1).max(16),
    established: z.number().int().min(1900).max(2100),
    heroId: id,
    // Optional logo (shown in the header instead of the text monogram).
    // w/h are filled in by the image build.
    logo: z
      .object({
        id,
        file: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}\.(jpe?g|png|webp)$/i),
        w: z.number().int().positive().optional(),
        h: z.number().int().positive().optional(),
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict();

const pricingService = z
  .object({
    label: text(60, 1),
    base: money.nullable(),
    includedHours: z.number().min(0).max(24),
    perHour: money,
    unitLabel: text(40, 1),
    includedUnits: z.number().int().min(0).max(100_000),
    perUnit: money,
    defaultUnits: z.number().int().min(1).max(100_000),
  })
  .strict();
const labelled = z.object({ label: text(60, 1), price: money }).strict();

export const pricingSchema = z
  .object({
    currency: z.string().regex(/^[A-Z]{3}$/),
    locale: text(20, 2),
    showPrices: z.boolean(),
    rangeSpread: z.number().min(0).max(2),
    roundTo: z.number().int().min(1).max(100_000),
    services: z.record(z.string(), pricingService),
    editedPhotos: z.object({ included: z.number().int().min(0), step: z.number().int().min(1), perStep: money, max: z.number().int().min(1) }).strict(),
    albums: z.record(z.string(), labelled),
    addons: z.record(z.string(), labelled),
    locationMultiplier: z.record(z.string(), z.object({ label: text(40, 1), value: z.number().min(0.1).max(10) }).strict()),
    budgets: z.record(z.string(), text(60, 1)),
    note: text(300),
  })
  .strict();

export const servicesSchema = z.array(z.object({ slug, name: text(60, 1), blurb: text(200, 1) }).strict()).min(1).max(20);
export const testimonialsSchema = z.array(z.object({ quote: text(400, 1), name: text(80, 1), role: text(80) }).strict()).max(20);
export const faqSchema = z.array(z.object({ q: text(200, 1), a: text(1200, 1) }).strict()).max(30);
export const instagramSchema = z.array(z.object({ photoId: id, url: httpUrl }).strict()).max(12);
export const categoriesSchema = z.array(z.object({ slug, title: text(40, 1), cover: id }).strict()).min(1).max(20);
export const photosSchema = z
  .array(
    z
      .object({
        id,
        file: z.string().regex(/^[a-z0-9][a-z0-9-]{0,62}\.(jpe?g|png|webp)$/i),
        alt: text(250, 3),
        category: z.string().max(63),
        caption: text(200),
        featured: z.boolean(),
        hidden: z.boolean().optional(),
        w: z.number().int().positive().optional(),
        h: z.number().int().positive().optional(),
        widths: z.array(z.number().int().positive()).optional(),
        lqip: z.string().max(4000).optional(),
      })
      .strict(),
  )
  .min(1)
  .max(1000);

/** Repo path (from the repo root) → schema. Only these files can be edited. */
export const CONTENT_FILES = {
  'app/content/site.json': siteSchema,
  'app/content/pricing.json': pricingSchema,
  'app/content/services.json': servicesSchema,
  'app/content/testimonials.json': testimonialsSchema,
  'app/content/faq.json': faqSchema,
  'app/content/instagram.json': instagramSchema,
  'app/content/gallery/categories.json': categoriesSchema,
  'app/content/gallery/photos.json': photosSchema,
} as const;

export type ContentPath = keyof typeof CONTENT_FILES;
export const CONTENT_PATHS = Object.keys(CONTENT_FILES) as ContentPath[];
export const ORIGINALS_DIR = 'app/content/gallery/originals';

export type ContentBundle = {
  site: z.infer<typeof siteSchema>;
  pricing: z.infer<typeof pricingSchema>;
  services: z.infer<typeof servicesSchema>;
  testimonials: z.infer<typeof testimonialsSchema>;
  faq: z.infer<typeof faqSchema>;
  instagram: z.infer<typeof instagramSchema>;
  categories: z.infer<typeof categoriesSchema>;
  photos: z.infer<typeof photosSchema>;
};

export const BUNDLE_KEYS: Record<keyof ContentBundle, ContentPath> = {
  site: 'app/content/site.json',
  pricing: 'app/content/pricing.json',
  services: 'app/content/services.json',
  testimonials: 'app/content/testimonials.json',
  faq: 'app/content/faq.json',
  instagram: 'app/content/instagram.json',
  categories: 'app/content/gallery/categories.json',
  photos: 'app/content/gallery/photos.json',
};

export type ContentIssue = { file: string; path: string; message: string };

/** Turns zod's technical messages into plain language for the editor. */
function friendly(i: z.core.$ZodIssue): string {
  if (i.code === 'too_small' && i.origin === 'string') return Number(i.minimum) <= 1 ? 'Required' : `At least ${i.minimum} characters`;
  if (i.code === 'too_big' && i.origin === 'string') return `At most ${i.maximum} characters`;
  if (i.code === 'too_small' && i.origin === 'array') return `Add at least ${i.minimum}`;
  if (i.code === 'too_big' && i.origin === 'array') return `No more than ${i.maximum}`;
  if (i.code === 'too_small' || i.code === 'too_big') return i.code === 'too_small' ? `Must be at least ${i.minimum}` : `Must be at most ${i.maximum}`;
  if (i.code === 'invalid_type') return 'Required';
  if (i.code === 'invalid_format' && i.format === 'email') return 'Enter a valid email address';
  if (i.code === 'unrecognized_keys') return `Unknown field(s): ${i.keys.join(', ')}`;
  return i.message;
}

/** Validates every file plus the links between them (photo ids, category slugs). */
export function validateBundle(b: Record<string, unknown>): ContentIssue[] {
  const issues: ContentIssue[] = [];
  for (const [key, path] of Object.entries(BUNDLE_KEYS)) {
    const r = CONTENT_FILES[path].safeParse(b[key]);
    if (!r.success) {
      for (const i of r.error.issues) issues.push({ file: key, path: i.path.join('.'), message: friendly(i) });
    }
  }
  if (issues.length) return issues;

  const c = b as unknown as ContentBundle;
  const photoIds = new Set(c.photos.map((p) => p.id));
  const slugs = new Set(c.categories.map((x) => x.slug));
  const need = (file: string, path: string, pid: string) =>
    photoIds.has(pid) || issues.push({ file, path, message: `Photo "${pid}" does not exist` });

  const seen = new Set<string>();
  c.photos.forEach((p, i) => {
    if (seen.has(p.id)) issues.push({ file: 'photos', path: `${i}.id`, message: `Duplicate photo id "${p.id}"` });
    seen.add(p.id);
    if (!p.hidden && !slugs.has(p.category))
      issues.push({ file: 'photos', path: `${i}.category`, message: `Unknown category "${p.category}"` });
  });
  if (new Set(c.categories.map((x) => x.slug)).size !== c.categories.length)
    issues.push({ file: 'categories', path: '', message: 'Category slugs must be unique' });
  need('site', 'heroId', c.site.heroId);
  need('site', 'about.portraitId', c.site.about.portraitId);
  c.categories.forEach((x, i) => need('categories', `${i}.cover`, x.cover));
  c.instagram.forEach((x, i) => need('instagram', `${i}.photoId`, x.photoId));
  if (!c.photos.some((p) => p.featured && !p.hidden))
    issues.push({ file: 'photos', path: '', message: 'Mark at least one gallery photo as featured' });
  return issues;
}
