# AK Studio website

Minimal, animated website for a photography studio: Home/About, Gallery,
Quotation and Contact, with social links and WhatsApp click-to-chat. Hosted on
**Zoho Catalyst Slate** with a Catalyst serverless function for enquiries.

- **Spec:** [docs/SPEC.md](docs/SPEC.md)
- **Deploying to Catalyst:** [docs/DEPLOY.md](docs/DEPLOY.md)
- **Updating photos, prices and text:** [docs/CONTENT.md](docs/CONTENT.md)

## Structure

```
app/                     Website (Vite + React + TypeScript), deployed to Slate
  content/               All editable content (JSON) and gallery originals
  public/images/         Generated responsive images
  scripts/               Image pipeline, OG image, prerender, function bundle
  src/                   Components, pages, motion, validation and pricing logic
functions/enquiry/       Catalyst Advanced I/O function: POST /server/enquiry/
catalyst.json            Catalyst project config
docs/                    Spec, deployment and content guides
```

## Quick start

```bash
cd app && npm install && npm run dev
```

Form submissions are simulated in development. See `docs/DEPLOY.md` to connect
the real Catalyst backend.

The photos in this repository are generated placeholders. Replace them with the
studio's work before launch (`docs/CONTENT.md`).
