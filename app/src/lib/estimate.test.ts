import { describe, expect, it } from 'vitest';
import { estimate, formatRange } from './estimate';
import pricing from '../../content/pricing.json';

const base = {
  hours: 1,
  units: 1,
  editedPhotos: pricing.editedPhotos.included,
  album: 'none' as const,
  addons: [],
  locationType: 'studio' as const,
};

describe('estimate', () => {
  it('returns the base price for a minimal studio portrait', () => {
    const e = estimate({ ...base, service: 'portrait' });
    expect(e).toEqual({ min: 8000, max: 9000 }); // 8000 × 1.15 = 9200 → rounds to nearest 500
  });

  it('adds extra hours, units, photos, album, add-ons and the location multiplier', () => {
    const e = estimate({
      service: 'wedding',
      hours: 8, // 2 extra × 5000
      units: 200, // guests: included
      editedPhotos: 150, // 2 steps × 2000
      album: 'premium', // 25000
      addons: ['reel', 'reel'], // de-duplicated: 15000
      locationType: 'outdoor', // × 1.1
    });
    const total = (60000 + 10000 + 4000 + 25000 + 15000) * 1.1;
    expect(e).toEqual({ min: Math.round(total / 500) * 500, max: Math.round((total * 1.15) / 500) * 500 });
  });

  it('returns null for services quoted manually', () => {
    expect(estimate({ ...base, service: 'other' })).toBeNull();
    expect(formatRange(null)).toBe('Custom quote');
  });
});
