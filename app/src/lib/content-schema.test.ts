import { describe, expect, it } from 'vitest';
import { validateBundle } from './content-schema';
import site from '../../content/site.json';
import pricing from '../../content/pricing.json';
import services from '../../content/services.json';
import testimonials from '../../content/testimonials.json';
import faq from '../../content/faq.json';
import instagram from '../../content/instagram.json';
import categories from '../../content/gallery/categories.json';
import photos from '../../content/gallery/photos.json';

const bundle = () => structuredClone({ site, pricing, services, testimonials, faq, instagram, categories, photos });

describe('validateBundle', () => {
  it('accepts the shipped content', () => {
    expect(validateBundle(bundle())).toEqual([]);
  });

  it('rejects broken references and unsafe links', () => {
    const b = bundle();
    b.site.heroId = 'missing-photo';
    b.site.socials.instagram = 'javascript:alert(1)';
    b.categories[0].cover = 'nope';
    const issues = validateBundle(b);
    expect(issues.some((i) => i.path === 'socials.instagram')).toBe(true);
    // Reference checks run once the files themselves are valid.
    b.site.socials.instagram = '';
    const refs = validateBundle(b).map((i) => i.path);
    expect(refs).toContain('heroId');
    expect(refs).toContain('0.cover');
  });

  it('rejects unknown fields and bad ids', () => {
    const b = bundle() as Record<string, unknown> & ReturnType<typeof bundle>;
    (b.services[0] as Record<string, unknown>).evil = '<script>';
    b.photos[0].id = 'Bad Id!';
    const files = validateBundle(b).map((i) => i.file);
    expect(files).toContain('services');
    expect(files).toContain('photos');
  });
});

describe('logo', () => {
  it('is optional and validated when present', () => {
    const b = bundle() as ReturnType<typeof bundle> & { site: Record<string, unknown> };
    b.site.logo = { id: 'logo-mark-a1b2c3', file: 'logo-mark-a1b2c3.png' };
    expect(validateBundle(b)).toEqual([]);
    b.site.logo = null;
    expect(validateBundle(b)).toEqual([]);
    b.site.logo = { id: 'logo', file: '../evil.svg' };
    expect(validateBundle(b).some((i) => i.path.startsWith('logo'))).toBe(true);
  });
});
