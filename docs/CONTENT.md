# Updating content

Everything editable lives in `app/content/`. Edit, commit and push: Slate rebuilds
the site automatically.

| File | What it controls |
|---|---|
| `site.json` | Studio name, tagline, description, contact details, address, hours, WhatsApp number and default message, social links, About text, stats, process steps, marquee words, site URL |
| `pricing.json` | Quotation services, rates, add-ons, location multipliers, budgets, whether prices are shown (`showPrices`) |
| `services.json` | Services list on the Home page |
| `testimonials.json` | Client quotes |
| `faq.json` | Contact-page FAQ |
| `instagram.json` | The 6 photos in the Home "On Instagram" strip and the post each links to |
| `gallery/categories.json` | Gallery filters (slug, title, cover photo id) |
| `gallery/photos.json` | Every photo: id, file, alt text, category, caption, featured flag |

**Empty social links are hidden automatically.** For WhatsApp, set
`whatsapp.number` in international format without `+` (e.g. `919812345678`).

## Replacing the placeholder photos

The site ships with abstract placeholder images. To use real photos:

1. Put the original JPEGs in `app/content/gallery/originals/` (this folder is
   git-ignored; keep originals in your own backup). Long edge ≥ 2400px is ideal.
2. Edit `app/content/gallery/photos.json`: one entry per photo:

   ```json
   {
     "id": "wed-01",
     "file": "wed-01.jpg",
     "alt": "Bride and groom walking through a garden at dusk",
     "category": "weddings",
     "caption": "Ananya & Rohit, Udaipur",
     "featured": true
   }
   ```

   - `category` must match a slug in `categories.json`.
   - `featured: true` puts the photo in "Selected work" on Home (6–7 is ideal).
   - Write real `alt` text: it is required for accessibility and helps SEO.
   - Keep the two special entries `hero` (Home hero) and `about-portrait`
     (About section) with `"hidden": true`.
3. Run:

   ```bash
   cd app
   npm run images   # AVIF/WebP/JPEG at 480–2400px + blur placeholders → public/images/
   npm run og       # rebuild the social-preview image from the hero photo
   ```

4. Delete derivatives of removed photos from `app/public/images/`, commit and push.

## Changing prices

Edit `app/content/pricing.json`, then refresh the copy bundled into the API so
the server's estimate matches the site:

```bash
cd app && npm run sync:function && npm test
```

Commit, push (site) and redeploy the function (`catalyst deploy --only functions`).

## Local development

```bash
cd app
npm install
npm run dev        # http://localhost:5173 — form submissions are simulated
npm test           # unit tests (pricing, validation, WhatsApp messages)
npm run build      # production build + prerender into dist/
npm run preview    # serve dist/ locally
```
