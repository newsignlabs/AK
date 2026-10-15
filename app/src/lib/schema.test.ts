import { describe, expect, it } from 'vitest';
import { enquirySchema, fieldErrors, quoteCrossChecks } from './schema';

const future = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
const quote = {
  service: 'wedding',
  date: future,
  dateFlexible: false,
  locationType: 'outdoor',
  city: 'Jaipur',
  hours: '8',
  units: '200',
  editedPhotos: '150',
  album: 'premium',
  addons: ['reel'],
  budget: '50_100k',
  notes: '',
  references: '',
  name: 'Priya S.',
  email: ' Priya@Example.com ',
  phone: '+91 98765 43210',
  preferredContact: 'whatsapp',
  consent: true,
};

describe('enquirySchema', () => {
  it('accepts a valid quote and normalises fields', () => {
    const r = enquirySchema.parse({ type: 'quote', data: quote, hp: '' });
    expect(r.type).toBe('quote');
    if (r.type === 'quote') {
      expect(r.data.email).toBe('priya@example.com');
      expect(r.data.hours).toBe(8);
    }
  });

  it('rejects missing consent, bad email and filled honeypot', () => {
    const r = enquirySchema.safeParse({ type: 'quote', data: { ...quote, consent: false, email: 'nope' }, hp: 'x' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const errs = fieldErrors(r.error);
      expect(errs).toHaveProperty('consent');
      expect(errs).toHaveProperty('email');
      expect(errs).toHaveProperty('hp');
    }
  });

  it('requires a phone when WhatsApp or phone is preferred', () => {
    const r = enquirySchema.safeParse({ type: 'quote', data: { ...quote, phone: '' } });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error)).toHaveProperty('phone');
  });

  it('rejects past dates unless the date is flexible', () => {
    expect(quoteCrossChecks({ date: '2020-01-01', dateFlexible: false })[0].path).toEqual(['date']);
    expect(quoteCrossChecks({ date: '', dateFlexible: true })).toEqual([]);
  });

  it('validates contact messages', () => {
    const ok = enquirySchema.safeParse({
      type: 'contact',
      data: { name: 'Sam', email: 'sam@example.com', phone: '', subject: 'Booking', message: 'Hello, are you free in May?', consent: true },
    });
    expect(ok.success).toBe(true);
    const bad = enquirySchema.safeParse({ type: 'contact', data: { name: 'S', email: 'x', phone: 'abc', subject: 'Spam', message: 'hi', consent: true } });
    expect(bad.success).toBe(false);
  });
});
