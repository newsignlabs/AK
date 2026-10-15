import pricingJson from '../../content/pricing.json';

export type Pricing = typeof pricingJson;
export type ServiceKey = keyof Pricing['services'];
export type AlbumKey = keyof Pricing['albums'];
export type AddonKey = keyof Pricing['addons'];
export type LocationKey = keyof Pricing['locationMultiplier'];

export type EstimateInput = {
  service: ServiceKey;
  hours: number;
  units: number;
  editedPhotos: number;
  album: AlbumKey;
  addons: AddonKey[];
  locationType: LocationKey;
};

export type Estimate = { min: number; max: number } | null;

const round = (n: number, to: number) => Math.round(n / to) * to;

/**
 * Indicative price range for a quote. Returns null when the service has no
 * base price ("other") — those enquiries are quoted manually.
 * The same function runs in the browser and in the Catalyst function, so the
 * server never trusts a client-supplied number.
 */
export function estimate(input: EstimateInput, pricing: Pricing = pricingJson): Estimate {
  const svc = pricing.services[input.service];
  if (!svc || svc.base === null) return null;

  const extraHours = Math.max(0, input.hours - svc.includedHours);
  const extraUnits = Math.max(0, input.units - svc.includedUnits);
  const ep = pricing.editedPhotos;
  const extraPhotoSteps = Math.ceil(Math.max(0, input.editedPhotos - ep.included) / ep.step);
  const addons = [...new Set(input.addons)].reduce((sum, a) => sum + (pricing.addons[a]?.price ?? 0), 0);
  const album = pricing.albums[input.album]?.price ?? 0;

  const subtotal =
    svc.base + extraHours * svc.perHour + extraUnits * svc.perUnit + extraPhotoSteps * ep.perStep + album + addons;
  const total = subtotal * (pricing.locationMultiplier[input.locationType]?.value ?? 1);

  const min = round(total, pricing.roundTo);
  const max = round(total * (1 + pricing.rangeSpread), pricing.roundTo);
  return { min, max };
}

export function formatMoney(n: number, pricing: Pricing = pricingJson): string {
  return new Intl.NumberFormat(pricing.locale, {
    style: 'currency',
    currency: pricing.currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatRange(e: Estimate, pricing: Pricing = pricingJson): string {
  if (!e) return 'Custom quote';
  return `${formatMoney(e.min, pricing)} – ${formatMoney(e.max, pricing)}`;
}
