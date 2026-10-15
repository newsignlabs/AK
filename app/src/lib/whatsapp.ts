import siteJson from '../../content/site.json';
import pricingJson from '../../content/pricing.json';
import { estimate, formatRange } from './estimate';
import type { QuoteFormInput } from './schema';

export function waLink(text: string = siteJson.whatsapp.defaultMessage, number = siteJson.whatsapp.number): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

export function photoMessage(url: string): string {
  return `Hi! I loved this photo: ${url}. I'd like a similar shoot.`;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Builds the pre-filled WhatsApp summary of a (possibly partial) quote. */
export function quoteMessage(q: Partial<QuoteFormInput>, studioName = siteJson.name): string {
  const p = pricingJson;
  const lines = [`Hi ${studioName}, quote request:`];
  if (q.service) lines.push(`• Service: ${p.services[q.service].label}`);
  const when = q.dateFlexible || !q.date ? 'Date not fixed' : formatDate(q.date);
  const where = [q.locationType && p.locationMultiplier[q.locationType].label, q.city].filter(Boolean).join(' · ');
  lines.push(`• Date: ${[when, where].filter(Boolean).join(' · ')}`);
  const extras = [
    q.album && q.album !== 'none' ? p.albums[q.album].label : '',
    ...(q.addons ?? []).map((a) => p.addons[a].label),
  ].filter(Boolean);
  if (q.hours) lines.push(`• Duration: ${q.hours} h${extras.length ? ` · Add-ons: ${extras.join(', ')}` : ''}`);
  if (q.service && p.showPrices) {
    const e = estimate({
      service: q.service,
      hours: Number(q.hours ?? 1),
      units: Number(q.units ?? 1),
      editedPhotos: Number(q.editedPhotos ?? 0),
      album: q.album ?? 'none',
      addons: q.addons ?? [],
      locationType: q.locationType ?? 'studio',
    });
    if (e) lines.push(`• Est.: ${formatRange(e).replace(/\s/g, ' ')}`);
  }
  if (q.notes) lines.push(`• Notes: ${q.notes.slice(0, 300)}`);
  if (q.name) lines.push(`Name: ${q.name}`);
  return lines.join('\n');
}
