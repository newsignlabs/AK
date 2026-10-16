// Builds public/og-image.jpg (1200×630) for link previews from the hero photo
// and the studio name. Re-run after changing site.json or the hero image.
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const site = JSON.parse(await readFile(path.join(root, 'content/site.json'), 'utf8'));
const esc = (s) => s.replace(/\*/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.3" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient></defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <text x="64" y="500" font-family="Georgia, serif" font-style="italic" font-size="96" fill="#FAFAF8">${esc(site.name)}</text>
  <text x="68" y="560" font-family="Helvetica, Arial, sans-serif" font-size="28" letter-spacing="3" fill="#FAFAF8" opacity="0.85">${esc(site.tagline.toUpperCase())}</text>
</svg>`);

await sharp(path.join(root, 'public/images/hero-1600.jpg'))
  .resize(1200, 630, { fit: 'cover' })
  .grayscale()
  .linear(1.15, -12)
  .composite([{ input: overlay }])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(path.join(root, 'public/og-image.jpg'));
console.log('Wrote public/og-image.jpg');
