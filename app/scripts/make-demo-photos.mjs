// Generates abstract, soft-focus placeholder "photographs" so the site can be
// built and previewed before the studio's real work is added.
// Writes originals to content/gallery/originals/ and a matching photos.json.
// Replace both with real photos (see docs/CONTENT.md) and run `npm run images`.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outDir = path.join(root, 'content/gallery/originals');
await mkdir(outDir, { recursive: true });

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const palettes = {
  weddings:   ['#efe6da', '#d9c7b0', '#b89f84', '#7d6a58', '#f7f1e8'],
  portraits:  ['#d8d6d2', '#a9a6a1', '#6f6c68', '#3a3836', '#eceae6'],
  fashion:    ['#e9dfd8', '#c7a99a', '#8f6f63', '#2d2523', '#f3ece6'],
  commercial: ['#e4e4de', '#c9cbbf', '#8b917f', '#4a4f44', '#f2f2ec'],
  events:     ['#2a2622', '#5a4a3c', '#a07a56', '#e0b98a', '#14110f'],
  maternity:  ['#f1e9e4', '#dcc8bf', '#b8998d', '#8a6d64', '#faf5f2'],
  site:       ['#e8e4dd', '#c4bcb0', '#8e857a', '#4b4640', '#f4f1ec'],
};

const ratios = { portrait: [1600, 2400], tall: [1920, 2400], square: [2000, 2000], landscape: [2400, 1600], wide: [2400, 1350] };

const plan = [
  ['weddings', 'wed', 5, 'Wedding', ['A couple walking through a garden at dusk', 'Hands and rings in soft window light', 'Guests celebrating under string lights', 'A bride by a sunlit doorway', 'A quiet moment before the ceremony']],
  ['portraits', 'por', 4, 'Portrait', ['A portrait in soft north light', 'A profile against a plain wall', 'A candid laugh in the studio', 'A seated portrait with deep shadows']],
  ['fashion', 'fas', 4, 'Fashion', ['A linen look against warm stone', 'A model mid-stride on a quiet street', 'An editorial close-up in shadow', 'A lookbook frame on seamless paper']],
  ['commercial', 'com', 4, 'Commercial', ['Ceramics arranged on a neutral table', 'A coffee bag in morning light', 'Skincare bottles on stone', 'A still life of fruit and glass']],
  ['events', 'eve', 4, 'Event', ['A speaker on a dark stage', 'A launch evening in warm light', 'Dancers blurred in motion', 'A long table set for dinner']],
  ['maternity', 'mat', 3, 'Maternity', ['A maternity portrait by a window', 'Tiny feet wrapped in linen', 'A family resting together at home']],
];

function svg(w, h, pal) {
  const [bg1, bg2] = [pick(pal), pick(pal)];
  const blobs = Array.from({ length: 5 }, () => {
    const cx = Math.round(rand() * w), cy = Math.round(rand() * h);
    const rx = Math.round(w * (0.15 + rand() * 0.35)), ry = Math.round(h * (0.15 + rand() * 0.35));
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${pick(pal)}" opacity="${(0.35 + rand() * 0.5).toFixed(2)}"/>`;
  }).join('');
  // A soft, figure-like silhouette or horizon to read as "a photograph".
  const fx = Math.round(w * (0.3 + rand() * 0.4));
  const subject = rand() > 0.35
    ? `<g fill="${pal[3]}" opacity="0.55"><circle cx="${fx}" cy="${Math.round(h * 0.38)}" r="${Math.round(Math.min(w, h) * 0.07)}"/><rect x="${fx - Math.round(w * 0.09)}" y="${Math.round(h * 0.47)}" width="${Math.round(w * 0.18)}" height="${Math.round(h * 0.6)}" rx="${Math.round(w * 0.08)}"/></g>`
    : `<rect x="0" y="${Math.round(h * (0.55 + rand() * 0.2))}" width="${w}" height="${h}" fill="${pal[3]}" opacity="0.45"/>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="${rand().toFixed(2)}" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
    <radialGradient id="v" cx="0.5" cy="0.45" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>${blobs}${subject}<rect width="100%" height="100%" fill="url(#v)"/></svg>`);
}

function grain(w, h) {
  const buf = Buffer.alloc(w * h * 4);
  for (let i = 0; i < buf.length; i += 4) {
    const v = Math.floor(rand() * 255);
    buf[i] = buf[i + 1] = buf[i + 2] = v;
    buf[i + 3] = 18;
  }
  return buf;
}

async function make(file, [w, h], pal) {
  const blurred = await sharp(svg(w, h, pal)).blur(Math.round(Math.min(w, h) / 40)).png().toBuffer();
  await sharp(blurred)
    .composite([{ input: grain(w, h), raw: { width: w, height: h, channels: 4 }, blend: 'over' }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(outDir, file));
}

const photos = [];
for (const [category, prefix, count, label, alts] of plan) {
  for (let i = 1; i <= count; i++) {
    const id = `${prefix}-${String(i).padStart(2, '0')}`;
    const shape = ratios[pick(Object.keys(ratios))];
    await make(`${id}.jpg`, shape, palettes[category]);
    photos.push({
      id,
      file: `${id}.jpg`,
      alt: `Placeholder image: ${alts[i - 1].toLowerCase()}`,
      category,
      caption: `${label} — placeholder ${i}`,
      featured: i <= (category === 'weddings' ? 2 : 1),
    });
  }
}
for (const [id, shape] of [['hero', ratios.wide], ['about-portrait', ratios.portrait]]) {
  await make(`${id}.jpg`, shape, palettes.site);
  photos.push({ id, file: `${id}.jpg`, alt: id === 'hero' ? 'Placeholder hero image: soft light in the studio' : 'Placeholder portrait of the photographer', category: 'site', caption: '', featured: false, hidden: true });
}

await writeFile(path.join(root, 'content/gallery/photos.json'), JSON.stringify(photos, null, 2) + '\n');
console.log(`Generated ${photos.length} placeholder photos.`);
