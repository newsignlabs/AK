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

// Logo (site.json → logo): kept as PNG + WebP with transparency, no grey
// filter; sized for the header. Files: public/images/<id>-logo.{png,webp}.
const sitePath = path.join(root, 'content/site.json');
const site = JSON.parse(await readFile(sitePath, 'utf8'));
if (site.logo?.file) {
  const input = path.join(srcDir, site.logo.file);
  const outPng = path.join(outDir, `${site.logo.id}-logo.png`);
  const outWebp = path.join(outDir, `${site.logo.id}-logo.webp`);
  const done = site.logo.w && site.logo.h && (await exists(outPng)) && (await exists(outWebp));
  if (all || !done) {
    try {
      await access(input);
      const resized = sharp(input).rotate().resize({ width: 800, height: 200, fit: 'inside', withoutEnlargement: true });
      const info = await resized.clone().png({ compressionLevel: 9 }).toFile(outPng);
      await resized.clone().webp({ quality: 90, alphaQuality: 100 }).toFile(outWebp);
      site.logo.w = info.width;
      site.logo.h = info.height;
      await writeFile(sitePath, JSON.stringify(site, null, 2) + '\n');
      console.log(`✓ logo ${site.logo.id} ${info.width}×${info.height}`);
    } catch (err) {
      console.warn(`! could not process logo ${site.logo.file}: ${err.message} — showing the text monogram`);
    }
  }
}
