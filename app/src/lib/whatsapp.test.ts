import { describe, expect, it } from 'vitest';
import { quoteMessage, waLink } from './whatsapp';

describe('whatsapp', () => {
  it('builds a wa.me link with only digits and an encoded message', () => {
    expect(waLink('Hi & hello', '+91 90000-00000')).toBe('https://wa.me/919000000000?text=Hi%20%26%20hello');
  });

  it('summarises a quote', () => {
    const msg = quoteMessage({
      service: 'wedding',
      date: '2027-02-14',
      dateFlexible: false,
      locationType: 'outdoor',
      city: 'Jaipur',
      hours: 8,
      units: 200,
      editedPhotos: 100,
      album: 'premium',
      addons: ['reel'],
      name: 'Priya S.',
    });
    expect(msg).toContain('• Service: Wedding');
    expect(msg).toContain('14 Feb 2027 · Outdoor · Jaipur');
    expect(msg).toContain('Add-ons: Premium album, Video / reel');
    expect(msg).toMatch(/• Est\.: ₹/);
    expect(msg).toContain('Name: Priya S.');
  });
});
