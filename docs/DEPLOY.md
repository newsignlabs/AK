# Deploying on Zoho Catalyst

The site has two parts that live in one Catalyst project:

| Part | Folder | Catalyst service |
|---|---|---|
| Website (prerendered static site) | `app/` | **Slate** |
| Enquiry API (`POST /server/enquiry/`) | `functions/enquiry/` | **Serverless → Advanced I/O function**, **Data Store**, **Mail**, **Cache** |
| Admin API (`/server/admin/*`) for the `/admin` editor | `functions/admin/` | **Serverless → Advanced I/O function**, **Cache**; commits to GitHub (setup: [ADMIN.md](ADMIN.md)) |

> Catalyst's console and CLI change over time. If a menu or option below has a
> different name, follow the current Zoho Catalyst docs; the settings are the same.

---

## 1. Create the project

1. Catalyst console → **Create Project** (e.g. `akstudio`).
2. Install the CLI locally: `npm install -g zcatalyst-cli`, then `catalyst login`.
3. From the repo root run `catalyst init` and pick the existing project. Keep the
   existing `catalyst.json` and `functions/enquiry/` when asked.

## 2. Data Store table

Data Store → **Create Table** → name it `Enquiries`, then add these columns:

| Column | Type | Notes |
|---|---|---|
| `ref_no` | Var Char (40) | unique, e.g. `AKQ-2026-7K2F` |
| `type` | Var Char (20) | `quote` / `contact` |
| `name` | Var Char (100) | |
| `email` | Var Char (255) | |
| `phone` | Var Char (30) | |
| `preferred_contact` | Var Char (20) | email / phone / whatsapp |
| `service` | Var Char (40) | quote only |
| `event_date` | Date | quote only, empty when not fixed |
| `location_type` | Var Char (20) | |
| `city` | Var Char (100) | |
| `details_json` | Text | full form data |
| `estimate_min` | BigInt | recalculated server-side |
| `estimate_max` | BigInt | |
| `message` | Text | |
| `attachments` | Text | reserved for mood-board uploads |
| `status` | Var Char (20) | new / contacted / quoted / booked / closed |
| `source_page` | Var Char (200) | |
| `utm` | Var Char (255) | |

`ROWID` and `CREATEDTIME` are added automatically. Table permissions: the
function runs with admin scope, so **no public (App User) permissions are needed**.

Staff manage enquiries in the console's Data Store browser (update `status` as
leads progress).

## 3. Mail

1. Mail → add and verify the sender address (e.g. `noreply@akstudio.in`). Using
   your own domain needs the DNS records Catalyst shows (SPF/DKIM).
2. Set `MAIL_FROM` to that address and `STUDIO_EMAIL` to the inbox that receives
   enquiries (step 4).

## 4. Deploy the function

**Manual (console):** run `functions/package.sh` (or use the provided zips), then
in Functions → Create Function choose Advanced I/O, Node.js 20, and upload
`enquiry.zip` / `admin.zip`. Step-by-step: [ADMIN.md](ADMIN.md#one-time-setup-manual-in-the-catalyst-console).

**CLI:**

```bash
cd app && npm ci && npm run sync:function   # refresh the bundled schema + pricing
cd ../functions/enquiry && npm install --omit=dev && npm test
cd ../admin && npm install --omit=dev && npm test
cd ../.. && catalyst deploy --only functions
```

Then set the function's **environment variables** (console → Functions →
`enquiry` → Configuration, or `catalyst-config.json` before deploying):

| Variable | Example | Purpose |
|---|---|---|
| `STUDIO_EMAIL` | `hello@akstudio.in` | receives enquiry notifications |
| `MAIL_FROM` | `noreply@akstudio.in` | verified Catalyst sender |
| `ALLOWED_ORIGINS` | `https://www.akstudio.in,https://akstudio-xxxx.onslate.in` | comma-separated site origins (production + Slate preview) |
| `TURNSTILE_SECRET` | `0x4AAA…` | Cloudflare Turnstile secret; empty disables the check |
| `RATE_LIMIT_PER_HOUR` | `5` | submissions per IP per hour |
| `PRICING_URL` | `https://<slate-domain>/pricing.json` | prices quotes with the latest pricing published from the admin panel (falls back to the bundled copy) |

Also add the same origins under **Authorized Domains (CORS)** in the
Catalyst console so browser requests from the site reach the function.

The function URL is `https://<project-domain>/server/<function name>/` (here `studio_keys_enquiry`; names are set in `app/.env.production`). Check it with:

```bash
curl -i -X OPTIONS https://<project-domain>/server/studio_keys_enquiry/ -H "Origin: https://www.akstudio.in"
```

## 5. Deploy the website on Slate

1. Console → **Slate** → **Create App** → connect GitHub and choose this repository and branch.
2. Build settings:

   | Setting | Value |
   |---|---|
   | Framework preset | Vite (or "Other / Static") |
   | Root directory | `app` |
   | Install command | `npm ci` |
   | Build command | `npm run build` |
   | Output directory | `dist` |
   | Node version | 20 or newer |

3. Environment variables (build-time and public, so **no secrets**):

   | Variable | Value |
   |---|---|
   | `VITE_API_BASE` | `https://<project-domain>` (the Catalyst project domain hosting the function) |
   | `VITE_TURNSTILE_SITEKEY` | Turnstile site key (optional) |
   | `VITE_PLAUSIBLE_DOMAIN` | e.g. `akstudio.in` (optional, cookieless analytics) |

4. **Routing:** every route is prerendered as both `route/index.html` and
   `route.html`, so deep links like `/gallery/weddings` work without rewrites.
   If Slate offers a "not found" page setting, point it at `404.html`. If it only
   offers an SPA fallback to `index.html`, that is also safe: the app detects that
   the HTML belongs to a different route and renders the right page.
5. **Branches:** `main` → production. Pull-request / other branches → Slate preview
   deployments.
6. **Caching** (if Slate exposes header rules): `/assets/*` → `public, max-age=31536000, immutable`;
   `*.html` → `no-cache`. Recommended security headers:
   `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: strict-origin-when-cross-origin`,
   `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

## 6. Custom domain

Slate → your app → **Domains** → add `www.akstudio.in`, create the CNAME/TXT
records Catalyst shows at your DNS provider, and wait for SSL to be issued.
Update `site.url` in `app/content/site.json` (used for canonical URLs, sitemap
and social previews) and `ALLOWED_ORIGINS` on the function.

## 7. Spam protection (recommended)

1. Create a Cloudflare Turnstile widget for your domain.
2. Put the **site key** in Slate (`VITE_TURNSTILE_SITEKEY`) and the **secret** in the
   function (`TURNSTILE_SECRET`). Rebuild the site.

## Launch checklist

- [ ] Real photos added and `npm run images` + `npm run og` run (see `CONTENT.md`)
- [ ] `site.json`: name, contact details, address, WhatsApp number, socials, `url`
- [ ] `pricing.json` reviewed (or `showPrices: false`)
- [ ] Test enquiry submitted from production → row in Data Store, both emails received
- [ ] WhatsApp button opens the right number with the pre-filled message
- [ ] Share a page link in WhatsApp → preview shows title + image
- [ ] Lighthouse (mobile) on Home and Gallery meets the spec's budget
