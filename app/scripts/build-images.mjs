// Turns originals in content/gallery/originals/ into responsive derivatives
// (AVIF, WebP, JPEG at several widths) in public/images/, and writes each
// photo's width, height and blurred placeholder (LQIP) back to photos.json.
//
// By default only photos that are missing derivatives or metadata are
// processed (fast; this runs on every Slate build so photos uploaded through
// the admin panel go live). Pass --all to regenerate everything.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const srcDir = path.join(root, 'content/gallery/originals');
const outDir = path.join(root, 'public/images');
const manifestPath = path.join(root, 'content/gallery/photos.json');
export const WIDTHS = [480, 960, 1600, 2400];

// Never fail the site build over images: unprocessed photos are simply left
// out of the site until they can be processed.
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (err) {
  console.warn(`! sharp unavailable (${err.message}); skipping image processing`);
  process.exit(0);
}

await mkdir(outDir, { recursive: true });
const photos = JSON.parse(await readFile(manifestPath, 'utf8'));
const all = process.argv.includes('--all');

const exists = (f) => access(f).then(() => true, () => false);
async function isComplete(photo) {
  if (!photo.w || !photo.h || !photo.lqip || !photo.widths?.length) return false;
  for (const w of photo.widths) if (!(await exists(path.join(outDir, `${photo.id}-${w}.jpg`)))) return false;
  return true;
}

let processed = 0;
for (const photo of photos) {
  if (!all && (await isComplete(photo))) continue;
  const input = path.join(srcDir, photo.file);
  try {
    await access(input);
  } catch {
    console.warn(`! missing original for ${photo.id} (${photo.file}) — keeping existing data`);
    continue;
  }
  try {
  const img = sharp(input).rotate();
  const { width, height } = await img.metadata();
  const widths = WIDTHS.filter((w) => w < width).concat(Math.min(width, WIDTHS.at(-1)));
  const unique = [...new Set(widths)];
  for (const w of unique) {
    const base = path.join(outDir, `${photo.id}-${w}`);
    const resized = sharp(input).rotate().resize({ width: w, withoutEnlargement: true });
    await resized.clone().avif({ quality: 50, effort: 4 }).toFile(`${base}.avif`);
    await resized.clone().webp({ quality: 74 }).toFile(`${base}.webp`);
    await resized.clone().jpeg({ quality: 78, mozjpeg: true, progressive: true }).toFile(`${base}.jpg`);
  }
  const lqip = await sharp(input).rotate().resize({ width: 20 }).blur(1).jpeg({ quality: 50 }).toBuffer();
  // EXIF orientation can swap the stored dimensions.
  const rotated = (await sharp(input).rotate().toBuffer({ resolveWithObject: true })).info;
  Object.assign(photo, {
    w: rotated.width,
    h: rotated.height,
    widths: unique,
    lqip: `data:image/jpeg;base64,${lqip.toString('base64')}`,
  });
  console.log(`✓ ${photo.id} ${rotated.width}×${rotated.height} → ${unique.join(', ')}`);
  processed++;
  } catch (err) {
    console.warn(`! could not process ${photo.file}: ${err.message} — leaving it out`);
  }
}
console.log(`Images: ${processed} processed, ${photos.length - processed} up to date.`);

await writeFile(manifestPath, JSON.stringify(photos, null, 2) + '\n');

// Brand images in site.json (logo, mascot): kept as PNG + WebP with
// transparency and their own colours (no grey filter), border-trimmed.
// Files: public/images/<id>-<slot>.{png,webp}.
const SLOTS = [
  { key: 'logo', box: [800, 200], fallback: 'showing the text monogram' },
  { key: 'mascot', box: [600, 900], fallback: 'the intro shows no mascot' },
];
const sitePath = path.join(root, 'content/site.json');
const site = JSON.parse(await readFile(sitePath, 'utf8'));
let siteChanged = false;
for (const slot of SLOTS) {
  const img = site[slot.key];
  if (!img?.file) continue;
  const input = path.join(srcDir, img.file);
  const outPng = path.join(outDir, `${img.id}-${slot.key}.png`);
  const outWebp = path.join(outDir, `${img.id}-${slot.key}.webp`);
  const done = img.w && img.h && (await exists(outPng)) && (await exists(outWebp));
  if (!all && done) continue;
  try {
    await access(input);
    // Trim the transparent border (ignoring faint stray pixels) so the artwork,
    // not empty canvas, fills the space it is shown in.
    const { data, info: raw } = await sharp(input).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let x0 = raw.width, y0 = raw.height, x1 = -1, y1 = -1;
    for (let y = 0; y < raw.height; y++)
      for (let x = 0; x < raw.width; x++)
        if (data[(y * raw.width + x) * 4 + 3] > 64) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
    const box = x1 < 0 ? null : {
      left: Math.max(0, x0 - pad),
      top: Math.max(0, y0 - pad),
      width: Math.min(raw.width, x1 + pad + 1) - Math.max(0, x0 - pad),
      height: Math.min(raw.height, y1 + pad + 1) - Math.max(0, y0 - pad),
    };
    const base = sharp(data, { raw: { width: raw.width, height: raw.height, channels: 4 } });
    const [bw, bh] = slot.box;
    const resized = (box ? base.extract(box) : base).resize({ width: bw, height: bh, fit: 'inside', withoutEnlargement: true });
    const info = await resized.clone().png({ compressionLevel: 9 }).toFile(outPng);
    await resized.clone().webp({ quality: 90, alphaQuality: 100 }).toFile(outWebp);
    img.w = info.width;
    img.h = info.height;
    siteChanged = true;
    console.log(`✓ ${slot.key} ${img.id} ${info.width}×${info.height}`);
  } catch (err) {
    console.warn(`! could not process ${slot.key} ${img.file}: ${err.message} — ${slot.fallback}`);
  }
}
if (siteChanged) await writeFile(sitePath, JSON.stringify(site, null, 2) + '\n');
