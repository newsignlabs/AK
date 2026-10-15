// Turns originals in content/gallery/originals/ into responsive derivatives
// (AVIF, WebP, JPEG at several widths) in public/images/, and writes each
// photo's width, height and blurred placeholder (LQIP) back to photos.json.
import sharp from 'sharp';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const srcDir = path.join(root, 'content/gallery/originals');
const outDir = path.join(root, 'public/images');
const manifestPath = path.join(root, 'content/gallery/photos.json');
export const WIDTHS = [480, 960, 1600, 2400];

await mkdir(outDir, { recursive: true });
const photos = JSON.parse(await readFile(manifestPath, 'utf8'));

for (const photo of photos) {
  const input = path.join(srcDir, photo.file);
  try {
    await access(input);
  } catch {
    console.warn(`! missing original for ${photo.id} (${photo.file}) — keeping existing data`);
    continue;
  }
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
}

await writeFile(manifestPath, JSON.stringify(photos, null, 2) + '\n');
