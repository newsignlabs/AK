import { z } from 'zod';
import pricingJson from '../../content/pricing.json';
import type { AddonKey, AlbumKey, LocationKey, ServiceKey } from './estimate';

const keys = <T extends string>(o: Record<T, unknown>) => Object.keys(o) as [T, ...T[]];

export const SERVICE_KEYS = keys(pricingJson.services) as [ServiceKey, ...ServiceKey[]];
export const ALBUM_KEYS = keys(pricingJson.albums) as [AlbumKey, ...AlbumKey[]];
export const ADDON_KEYS = keys(pricingJson.addons) as [AddonKey, ...AddonKey[]];
export const LOCATION_KEYS = keys(pricingJson.locationMultiplier) as [LocationKey, ...LocationKey[]];
export const BUDGET_KEYS = keys(pricingJson.budgets);
export const CONTACT_METHODS = ['email', 'phone', 'whatsapp'] as const;
export const SUBJECTS = ['General', 'Booking', 'Collaboration', 'Press'] as const;

/** YYYY-MM-DD for "yesterday" in UTC, so a client a few time zones ahead isn't rejected. */
function earliestDate(): string {
  return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
}

const trimmed = (max: number) => z.string().trim().max(max);
const phoneRe = /^\+?[0-9\s\-()]{7,20}$/;

const person = {
  name: trimmed(80).min(2, 'Please enter your name'),
  email: z.string().trim().toLowerCase().pipe(z.email('Please enter a valid email')),
  phone: trimmed(24).refine((v) => v === '' || phoneRe.test(v), 'Please enter a valid phone number'),
  consent: z.boolean().refine((v) => v, 'Please accept to continue'),
};

export const quoteSchema = z
  .object({
    service: z.enum(SERVICE_KEYS, { error: 'Choose a type of shoot' }),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal('')),
    dateFlexible: z.boolean(),
    locationType: z.enum(LOCATION_KEYS),
    city: trimmed(80),
    hours: z.coerce.number().int().min(1, 'At least 1 hour').max(16, 'Up to 16 hours'),
    units: z.coerce.number().int().min(1, 'At least 1').max(2000),
    editedPhotos: z.coerce.number().int().min(0).max(pricingJson.editedPhotos.max),
    album: z.enum(ALBUM_KEYS),
    addons: z.array(z.enum(ADDON_KEYS)).max(ADDON_KEYS.length),
    budget: z.enum(BUDGET_KEYS),
    notes: trimmed(2000),
    references: trimmed(500),
    ...person,
    preferredContact: z.enum(CONTACT_METHODS),
  })
  .superRefine((v, ctx) => {
    for (const issue of quoteCrossChecks(v)) ctx.addIssue({ code: 'custom', ...issue });
  });

/**
 * Rules that span several fields. Zod skips object refinements while other
 * fields are invalid, so the multi-step form also calls this per step.
 */
export function quoteCrossChecks(v: {
  date?: string;
  dateFlexible?: boolean;
  preferredContact?: string;
  phone?: string;
}): { path: [string]; message: string }[] {
  const issues: { path: [string]; message: string }[] = [];
  if (!v.dateFlexible && !v.date) issues.push({ path: ['date'], message: 'Pick a date, or tick "not fixed yet"' });
  if (v.date && !v.dateFlexible && v.date < earliestDate()) issues.push({ path: ['date'], message: 'The date must be today or later' });
  if (v.preferredContact && v.preferredContact !== 'email' && !v.phone?.trim())
    issues.push({ path: ['phone'], message: 'Add a phone number so we can reach you' });
  return issues;
}

export const contactSchema = z.object({
  ...person,
  subject: z.enum(SUBJECTS),
  message: trimmed(2000).min(10, 'Tell us a little more (10+ characters)'),
});

export type QuoteForm = z.infer<typeof quoteSchema>;
export type QuoteFormInput = z.input<typeof quoteSchema>;
export type ContactForm = z.infer<typeof contactSchema>;

const meta = {
  captchaToken: z.string().max(4096).optional(),
  hp: z.string().max(0, 'Spam detected').optional(),
  sourcePage: trimmed(200).optional(),
  utm: trimmed(500).optional(),
};

export const enquirySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('quote'), data: quoteSchema, ...meta }),
  z.object({ type: z.literal('contact'), data: contactSchema, ...meta }),
]);

export type EnquiryRequest = z.infer<typeof enquirySchema>;

/** Flattens zod issues into { field: message } for API responses and forms. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.filter((p) => p !== 'data').join('.') || '_';
    out[key] ??= issue.message;
  }
  return out;
}
