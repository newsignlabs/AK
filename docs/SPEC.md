# AK Studio — Website Specification

> Animated, rich black & white website for a photography studio.
> Hosting: **Zoho Catalyst Slate** (frontend) + **Catalyst Serverless / Data Store** (forms backend).
> Status: Draft v1.0 · Working name "AK Studio" (replace with final brand name).

---

## 1. Goals

| Goal | Measure of success |
|---|---|
| Showcase the studio's work with an editorial, gallery-first feel | Avg. gallery session ≥ 90 s; low bounce on Gallery |
| Convert visitors into enquiries | Quotation + Contact + WhatsApp clicks tracked as conversions |
| Feel premium through motion, without hurting speed | Lighthouse Performance ≥ 90 (mobile), LCP < 2.5 s, CLS < 0.05 |
| Easy for the studio to update photos and prices | Gallery and pricing driven by JSON/content files, no code changes |

**Non-goals (v1):** online payments, client login/proofing portal, blog, multi-language. (Listed in §14 as future work.)

---

## 2. Sitemap

```
/              Home / About   (single long-scroll page)
/gallery       Gallery        (filterable grid + lightbox)
/gallery/:slug Album/Category deep link (opens filtered grid)
/quote         Quotation      (multi-step estimate form)
/contact       Contact        (form, map, details)
/privacy       Privacy policy (plain text, linked in footer)
/404           Not found
```

Global elements on every page: header/nav, footer (socials, quick links, copyright), floating WhatsApp button, page-transition overlay.

---

## 3. Design System (Rich Black & White)

### 3.1 Principles
- **Pure monochrome, high drama.** A black stage with inverted ivory bands; every photograph is rendered in true black & white.
- **Editorial richness.** Oversized serif type with italic accent words, outlined numerals, crop marks, frame counters and film grain give depth without colour.
- **Rhythm through contrast.** Sections alternate black ↔ ivory as you scroll; motion stays purposeful.

### 3.2 Colour tokens

| Token | Black stage (default) | Ivory band (`.invert`) |
|---|---|---|
| `--bg` | `#0A0A0A` | `#F4F3EF` |
| `--fg` | `#F4F3EF` | `#0A0A0A` |
| `--muted` | `#8F8F8A` | `#5C5C58` |
| `--line` | ivory at 16% | black at 14% |
| `--line-strong` | ivory at 60% | black at 60% |

No hues, no gradients except photographic vignettes. Photos use `grayscale(1) contrast(1.12)`. A fixed film-grain layer (SVG noise, 6% opacity, animated; static under reduced motion) sits over everything. Text meets WCAG AA on both grounds. The design is a fixed theme (no light/dark switch).

Home page band order: hero (photo) → studio intro (black) → selected work (black) → services (ivory) → about + stats (black) → process (ivory) → testimonials (black) → marquee (ivory) → Instagram (black) → CTA (black) → footer (black).

### 3.3 Typography
- **Display:** *Fraunces* (variable, light 300) at large sizes with tight tracking (−0.035em); words wrapped in `*asterisks*` in content render as **italic accents** (e.g. "Quiet images of *loud* moments.").
- **Outlined type:** section numerals (01–06), process numbers, alternate marquee words, the footer "studio" and the testimonial quote mark use a 1px text stroke with transparent fill.
- **Body/UI:** *Inter* (variable). Labels and buttons are uppercase with wide tracking (0.18em).
- Fluid scale with `clamp()`: H1 up to `11rem` in the hero, H2 `clamp(2.25rem, 5.4vw, 5rem)`.
- Fonts self-hosted (WOFF2 via Fontsource, `font-display: swap`).

### 3.4 Layout & spacing
- 12-column grid, max content width 1440px, side gutter 16px (mobile) → 48px (desktop).
- Spacing scale: 4, 8, 16, 24, 40, 64, 104, 168px.
- Breakpoints: 480 / 768 / 1024 / 1440.

### 3.5 Components
Header (ivory ink; see-through over the dark top of each page, solid black once scrolled, so the links and an uploaded light logo are always legible), Nav overlay (mobile, black), Button (square; solid / ghost with a fill that sweeps up on hover; text-link with animated underline), Input / Select / Date / Textarea, Stepper, Chip (filter), Image (black & white with blur-up placeholder, framed with offset outlines and "Fr. 001" captions), Lightbox, Toast, Social icon row (square), Floating WhatsApp button (ivory disc), Stats band (ruled grid), Footer (giant "AK *studio*" wordmark).

---

## 4. Motion Specification

### 4.1 Libraries
- **Motion (Framer Motion)** — component animation, page transitions, layout animations.
- **Lenis** — smooth scrolling (disabled on touch devices and with reduced motion).
- **IntersectionObserver** — scroll-triggered reveals (via Motion's `whileInView`).
- No GSAP unless a specific effect requires it (keeps bundle small).

### 4.2 Motion tokens

| Token | Value |
|---|---|
| `ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `dur-fast` | 200 ms (hover, focus) |
| `dur-base` | 600 ms (reveals) |
| `dur-slow` | 1000 ms (hero, page transitions) |
| `stagger` | 60–80 ms between siblings |

Only `transform` and `opacity` are animated (GPU-friendly; no layout thrash).

### 4.3 Signature animations

| # | Where | Behaviour |
|---|---|---|
| M1 | Preloader (first visit only, max 1.5 s) | Studio monogram draws in (SVG stroke), counter 0→100, then wipes up to reveal the hero. Skipped on repeat visits (sessionStorage) and with reduced motion. |
| M2 | Page transitions | Full-screen `--fg` panel slides up over the old page, page title flashes, panel slides out. ~900 ms total. |
| M3 | Headline reveal | Lines split into masked spans; each line slides up 100% → 0 with stagger. |
| M4 | Image reveal | Clip-path inset `inset(100% 0 0 0)` → `inset(0)` plus scale 1.15 → 1 on enter viewport. |
| M5 | Parallax | Hero and featured images translate Y at 0.85–0.9× scroll speed (desktop only). |
| M6 | Gallery filter | Shared-layout animation: items reflow smoothly when the filter changes (`layout` prop). |
| M7 | Lightbox | Thumbnail expands into fullscreen via shared `layoutId`; swipe/drag to navigate, drag-down to close. |
| M8 | Cursor (desktop, pointer: fine) | Small dot cursor; grows into a "View" disc when hovering gallery images. Native cursor kept for form fields. |
| M9 | Hover | Text links: underline draws left→right. Buttons: text rolls up to a duplicate label. |
| M10 | Marquee | Slow infinite horizontal marquee of services / client names on Home; pauses on hover. |
| M11 | Quotation stepper | Steps slide horizontally; live price counter animates numerically between values. |
| M12 | WhatsApp button | Fades in after 2 s, gentle pulse once every 10 s (stops after 3 pulses). |

### 4.4 Accessibility of motion
- Respect `prefers-reduced-motion: reduce`: disable M1, M5, M8, M10, Lenis; replace slides/clip reveals with simple 200 ms fades.
- Nothing flashes more than 3 times per second.
- Animations never block interaction; content is in the DOM and readable before reveal (no-JS fallback shows content).

---

## 5. Page Specifications

### 5.1 Home / About (`/`)

Single long-scroll page; sections in order:

1. **Hero** — full-viewport image or short muted looping video (≤ 4 MB, MP4/WebM, poster image). Studio name + one-line tagline (e.g. *"Quiet images of loud moments."*). Scroll cue. Animations: M3, M5.
2. **Intro statement** — 2–3 sentence studio philosophy in large serif type; words fade from `--muted` to `--fg` as they scroll into view. An optional brand mascot (admin: Studio → Intro mascot) sits in front of the large outlined "01", in its own colours.
3. **Selected work** — 5–7 featured images in an asymmetric editorial grid; each links to its category in the Gallery. M4 reveals. CTA: *View full gallery →*.
4. **Services** — list of services (Weddings, Portraits, Fashion/Editorial, Products/Commercial, Events, Maternity & Newborn — configurable). Each row: number, name, short line; hover reveals a floating preview image following the cursor (desktop).
5. **About the studio** — portrait of the photographer(s), short bio, years of experience, location, approach. Optional stats with count-up animation (e.g. *8 years · 300+ shoots · 40 brands*).
6. **Process** — 4 steps: Enquire → Plan → Shoot → Deliver.
7. **Testimonials** — 3–6 quotes, auto-advancing crossfade slider with manual controls.
8. **Marquee** (M10) — services or client/publication names.
9. **Instagram strip** — 6 latest images (see §7.3) linking to the profile.
10. **CTA block** — *"Let's create something."* buttons: **Get a quote** → `/quote`, **Chat on WhatsApp**.

### 5.2 Gallery (`/gallery`)

- **Filter bar** (sticky under header): `All · Weddings · Portraits · Fashion · Commercial · Events · …` — chips driven by categories in content. Selected chip underlined; URL updates to `/gallery/:slug` for shareable links.
- **Grid:** masonry (CSS columns or JS masonry), 1 col (<480), 2 cols (<1024), 3 cols (≥1024), 4 cols (≥1440). Preserves each photo's aspect ratio (width/height stored in data → zero CLS).
- **Loading:** first 12 images eager-ish (first 3 `fetchpriority="high"`), rest lazy; infinite scroll in batches of 12 with a "Load more" fallback button.
- **Images:** responsive `srcset` (480/960/1600/2400 widths), AVIF + WebP with JPEG fallback, blurred LQIP placeholder (base64 ~20px).
- **Lightbox (M7):** fullscreen, image fit-contained, caption + category, counter (`12 / 48`), prev/next arrows, keyboard (← → Esc), swipe on touch, focus-trapped, background scroll locked. Share button (copies deep link `?photo=id`).
- **Protection (soft):** disable right-click context menu on images and drag-save; visible watermark optional (configurable). Note: this deters casual copying only.

### 5.3 Quotation (`/quote`)

Multi-step form with a live, indicative estimate. Steps (M11):

| Step | Fields | Validation |
|---|---|---|
| 1. Service | Shoot type (cards with icons/images): Wedding, Pre-wedding, Portrait, Fashion, Product, Event, Maternity/Newborn, Other | required |
| 2. Details | Date (date picker; "not fixed yet" checkbox), Location type (Studio / Outdoor / Destination), City, Duration (hours or packages), Number of people/products | date ≥ today; numbers > 0 |
| 3. Deliverables | Edited photos count (range), Album (none / standard / premium), Video/reel add-on, Express delivery, Extra photographer, Hair & makeup | optional |
| 4. Budget & notes | Budget range (select), Free-text brief, Reference links, optional file upload of mood board (≤ 3 files, ≤ 5 MB each, jpg/png/pdf) | text ≤ 2000 chars |
| 5. Your details | Name, Email, Phone (with country code, default +91 configurable), Preferred contact method (Email / Phone / WhatsApp), consent checkbox | required name, valid email or phone, consent required |
| 6. Review | Summary of all choices + estimate | — |

**Estimate engine**
- Pricing rules in `content/pricing.json` (base price per service, per-hour rate, add-on prices, location multipliers). Example:
  ```json
  {
    "currency": "INR",
    "services": { "wedding": { "base": 60000, "perHour": 5000, "minHours": 6 } },
    "addons": { "album_standard": 12000, "album_premium": 25000, "reel": 15000, "express": 8000, "second_shooter": 10000 },
    "locationMultiplier": { "studio": 1.0, "outdoor": 1.1, "destination": 1.35 }
  }
  ```
- Displayed as a **range** ("Est. ₹72,000 – ₹85,000") with a note: *"Indicative only. Final quote confirmed after a short call."* Toggle in config to hide prices entirely (form still works).

**Submit actions**
- Primary: **Request quote** → POST to Catalyst function (§8) → saved in Data Store → email to studio + confirmation email to client → success screen with reference number (e.g. `AKQ-2026-0142`).
- Secondary: **Send via WhatsApp** → opens `wa.me` with a pre-filled summary (§7.2).
- Draft persisted in `localStorage` so a refresh doesn't lose progress (wrapped in try/catch).

### 5.4 Contact (`/contact`)

- Large headline (*"Say hello."*), studio email (mailto), phone (tel), WhatsApp button, address.
- **Contact form:** Name, Email, Phone (optional), Subject (General / Booking / Collaboration / Press), Message, consent. Same backend as quotation with `type = contact`.
- **Map:** static map image linking to Google Maps (lighter than an embedded iframe; iframe loaded only on click).
- **Studio hours** table and "By appointment only" note.
- **Socials** row with all configured networks (§7.1).
- Small FAQ accordion (booking lead time, travel, delivery timeline, deposits).

### 5.5 Global header & footer
- **Header:** logo/wordmark (left), nav links Home · Gallery · Quote · Contact (right), current page indicated. Hides on scroll down, reappears on scroll up. Mobile: hamburger → full-screen overlay menu with staggered link reveal + socials.
- **Footer:** large "Let's work together" link to `/quote`, socials, email, phone, address, © year, Privacy link, "Back to top".

---

## 6. Content Model

All editable content lives in a `content/` folder (JSON/Markdown) and is bundled at build time. Changing content = commit + redeploy (Slate rebuilds on push, see §9).

```
content/
  site.json        # name, tagline, contact details, socials, whatsapp, SEO defaults
  pricing.json     # quotation pricing rules
  services.json    # services list (name, slug, blurb, image)
  testimonials.json
  faq.json
  gallery/
    categories.json   # [{ slug, title, cover }]
    photos.json       # [{ id, src, w, h, alt, category, caption, featured, lqip }]
```

`site.json` example:
```json
{
  "name": "AK Studio",
  "tagline": "Quiet images of loud moments.",
  "email": "hello@akstudio.example",
  "phone": "+91 90000 00000",
  "address": "Street, City, State PIN",
  "whatsapp": { "number": "919000000000", "defaultMessage": "Hi AK Studio! I'd like to know more about a shoot." },
  "socials": {
    "instagram": "https://instagram.com/akstudio",
    "facebook": "https://facebook.com/akstudio",
    "youtube": "https://youtube.com/@akstudio",
    "pinterest": "",
    "behance": "",
    "linkedin": "",
    "x": ""
  }
}
```
Empty social entries are hidden automatically.

**Images:** originals are processed by a build script (`sharp`) into AVIF/WebP/JPEG at 4 widths + LQIP and written with width/height into `photos.json`. Option for large libraries: store derivatives in **Catalyst Stratus** (object storage) and serve from its public bucket URL; `photos.json` then holds Stratus URLs.

---

## 7. Integrations

### 7.1 Social media
- Icon links (inline SVG, accessible labels, `target="_blank" rel="noopener noreferrer"`) in header overlay, footer and Contact.
- **Open Graph & Twitter Card** meta per page (title, description, 1200×630 image) so shared links preview well on Instagram DMs, Facebook, WhatsApp, X, LinkedIn.
- **Share** button in lightbox uses the Web Share API, falling back to copy-link.
- **Instagram strip (Home):** v1 uses a manually curated list (`content/instagram.json`: 6 image + post URL pairs) — no API token needed. v2 option: Catalyst cron function fetching the latest posts via the Instagram Graph API (requires a Business/Creator account + long-lived token stored as Catalyst env variable), cached in Catalyst Cache.

### 7.2 WhatsApp
- **Click-to-chat** via `https://wa.me/<number>?text=<urlencoded message>` (number in international format, digits only). Works on mobile app and WhatsApp Web/desktop.
- **Floating button** (bottom-right, 56px, safe-area aware, M12) on all pages; hidden on the Quotation review step to avoid overlap with submit.
- **Context-aware messages:**
  - Default: `site.whatsapp.defaultMessage`
  - Gallery lightbox: *"Hi! I loved this photo: <deep link>. I'd like a similar shoot."*
  - Quotation: summary of selections, e.g.
    ```
    Hi AK Studio, quote request:
    • Service: Wedding
    • Date: 14 Feb 2027 · Outdoor · Jaipur
    • Duration: 8 h · Add-ons: Premium album, Reel
    • Est.: ₹72,000–₹85,000
    Name: Priya S.
    ```
- Optional v2: WhatsApp Business Cloud API to auto-notify the studio of new web enquiries (via Catalyst function). Not required for v1 — email notifications cover it.

### 7.3 Analytics & conversions
- Privacy-friendly analytics (Zoho PageSense, Plausible, or GA4 — studio's choice) loaded after consent where required.
- Tracked events: `quote_step_n`, `quote_submit`, `contact_submit`, `whatsapp_click` (with `source`: floating / contact / quote / lightbox), `social_click` (network), `gallery_filter`, `lightbox_open`.

---

## 8. Backend (Catalyst)

The site itself is static on Slate; form handling uses Catalyst serverless in the **same Catalyst project**.

### 8.1 Components
| Catalyst service | Use |
|---|---|
| **Slate** | Hosts the built frontend, custom domain, SSL, Git-based deploys |
| **Serverless Functions (Advanced I/O, Node.js)** | `enquiry` function: `POST /server/enquiry/` for quote + contact |
| **Data Store** | Table `Enquiries` |
| **Stratus** (optional) | Gallery images; mood-board uploads from the quote form |
| **Mail** (Catalyst Mail / ZeptoMail) | Notification to studio + auto-reply to client |
| **Environment variables** | Studio notification email, sender address, reCAPTCHA/Turnstile secret, allowed origin |
| **Cache** (optional) | Rate-limit counters, Instagram feed cache |

### 8.2 `Enquiries` table
| Column | Type | Notes |
|---|---|---|
| `ROWID`, `CREATEDTIME` | system | |
| `ref_no` | varchar | `AKQ-YYYY-####` / `AKC-YYYY-####` |
| `type` | varchar | `quote` / `contact` |
| `name`, `email`, `phone` | varchar | |
| `preferred_contact` | varchar | email / phone / whatsapp |
| `service`, `event_date`, `location_type`, `city` | varchar/date | quote only |
| `details_json` | text | full step data (add-ons, durations, etc.) |
| `estimate_min`, `estimate_max` | bigint | as calculated **server-side** |
| `message` | text | |
| `attachments` | text | Stratus object keys |
| `status` | varchar | new / contacted / quoted / booked / closed |
| `source_page`, `utm` | varchar | attribution |

Studio staff view/manage rows in the Catalyst console (v1). A small admin view is future work.

### 8.3 `enquiry` function contract
`POST /server/enquiry/` · `Content-Type: application/json`

Request:
```json
{ "type": "quote", "name": "...", "email": "...", "phone": "...", "preferredContact": "whatsapp",
  "quote": { "service": "wedding", "date": "2027-02-14", "locationType": "outdoor", "city": "Jaipur",
             "hours": 8, "addons": ["album_premium", "reel"], "budget": "50-100k", "notes": "..." },
  "consent": true, "captchaToken": "...", "hp": "" }
```
Responses: `201 { "ref": "AKQ-2026-0142" }` · `400 { "errors": { "email": "invalid" } }` · `429` rate limited · `500` generic.

Server responsibilities:
1. Verify CAPTCHA token (Cloudflare Turnstile or reCAPTCHA v3) and honeypot field `hp` is empty.
2. Validate & sanitise all fields (same schema as client — shared `zod` schema).
3. **Recalculate estimate server-side** from `pricing.json` (never trust client numbers).
4. Rate limit: max 5 submissions / IP / hour.
5. Insert row in Data Store; generate `ref_no`.
6. Send studio notification email (all details + `wa.me` link to reply to the client) and client auto-reply (summary + "we'll reply within 24 h").
7. Return ref number. Errors logged via Catalyst logs; no PII in logs.

CORS: restricted to the production domain and the Slate preview domain.

---

## 9. Tech Stack & Hosting on Catalyst Slate

### 9.1 Stack
- **Vite + React + TypeScript** (static SPA build), React Router for routes.
  *Alternative:* Astro (static, islands) if maximum SEO/perf is preferred — Slate supports both as framework presets. Recommendation: **Vite + React** for the richest page-transition and shared-layout animation support with Motion.
- Styling: CSS Modules or Tailwind CSS with the tokens from §3 as CSS variables.
- Forms: React Hook Form + zod.
- Animation: Motion, Lenis.
- Images: `sharp` build script; `vite-imagetools` optional.
- SEO: `react-helmet-async` for per-page meta + **prerendering** of the 5 routes at build (e.g. `vite-plugin-prerender` / `vite-react-ssg`) so crawlers and social previews get real HTML.

### 9.2 Repository layout
```
/
  app/                     # Slate frontend (Vite project)
    src/ components/ pages/ motion/ lib/ styles/
    public/                # favicon, og images, robots.txt, sitemap.xml
    content/               # §6
    scripts/build-images.ts
  functions/
    enquiry/               # Catalyst Advanced I/O function (Node.js)
  catalyst.json            # Catalyst project config (generated by `catalyst init`)
  docs/SPEC.md
```

### 9.3 Deployment
1. Create a Catalyst project; enable Data Store, Functions, Mail (and Stratus if used).
2. **Slate app:** Catalyst console → Slate → create app → connect this GitHub repo/branch (or deploy with the Catalyst CLI). Framework preset: *Vite/React* (or *Static*), root directory `app/`, build command `npm run build`, output directory `dist/`.
3. **SPA routing:** configure a rewrite/fallback of unknown paths to `index.html` (or rely on prerendered `route/index.html` files) so deep links like `/gallery/weddings` don't 404. Verify against the current Slate routing options.
4. **Environment variables** on Slate (build-time, `VITE_` prefix, public only): `VITE_API_BASE`, `VITE_TURNSTILE_SITEKEY`, `VITE_ANALYTICS_ID`. Secrets live only in **function** env variables.
5. Deploy functions with `catalyst deploy --only functions`.
6. **Custom domain:** add domain in Slate, set DNS (CNAME/TXT as Catalyst instructs); SSL is auto-provisioned.
7. **Environments:** `main` → production; `develop` / PR branches → Slate preview deployments for review.
8. Cache headers: hashed assets `immutable, max-age=31536000`; HTML `no-cache`.

> Catalyst's console and CLI evolve; confirm preset names, rewrite configuration and Mail setup against current Zoho Catalyst documentation during implementation.

---

## 10. Performance Budget

| Metric | Target |
|---|---|
| JS (gzip) initial | ≤ 150 KB |
| CSS (gzip) | ≤ 25 KB |
| Hero media | ≤ 250 KB image / ≤ 4 MB video (with poster) |
| LCP (4G mobile) | < 2.5 s |
| CLS | < 0.05 |
| INP | < 200 ms |
| Lighthouse (mobile) | Perf ≥ 90, A11y ≥ 95, Best Practices ≥ 95, SEO ≥ 95 |

Techniques: route-level code splitting, preload hero image + display font, lazy-load Lenis/lightbox, `content-visibility: auto` on long sections, animations paused when tab hidden.

---

## 11. Accessibility

- WCAG 2.2 AA target.
- Semantic landmarks, one `h1` per page, skip-to-content link.
- Every gallery image has meaningful `alt` text (required field in `photos.json`).
- Full keyboard support: nav, filters, lightbox, stepper, form; visible focus ring.
- Form errors announced via `aria-live`; labels always visible (no placeholder-only labels).
- Custom cursor never hides the native focus or text caret.
- Reduced motion handled per §4.4.

---

## 12. SEO

- Per-page `<title>`, meta description, canonical URL, OG/Twitter tags.
- JSON-LD: `LocalBusiness` / `ProfessionalService` (name, address, geo, hours, phone, sameAs → social URLs), `ImageGallery` on Gallery.
- `sitemap.xml`, `robots.txt`.
- Descriptive image filenames and alt text; Google Business Profile linked from footer.

---

## 13. Security & Privacy

- HTTPS only (Slate-managed SSL); HSTS.
- Security headers where configurable: `Content-Security-Policy` (self + analytics + captcha + Catalyst API), `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- CAPTCHA + honeypot + rate limiting on forms; uploads type/size-checked server-side and stored in a private Stratus bucket.
- Privacy policy page describing what enquiry data is stored, why, and retention (e.g. 24 months); consent checkbox on forms; cookie banner only if non-essential cookies/analytics are used.

---

## 13a. Admin Panel

`/admin` is a password-protected editor for all site text, photos and prices (setup: `docs/ADMIN.md`).

- **Storage:** content stays in `app/content/*.json` in GitHub. The `admin` Catalyst function commits edits, Slate rebuilds on push to `main`, and changes go live in about a minute. Every edit is versioned and can be reverted.
- **Tabs:** Studio, Contact & social, About, Services, Gallery (categories; photo upload, alt text, caption, category, featured, order, delete), Testimonials, FAQ, Instagram, Pricing.
- **Validation:** shared content schemas (`app/src/lib/content-schema.ts`) check every field and the links between files (photo ids, category slugs) in the browser and again on the server before commit.
- **Photos:** resized in the browser to a 2,400px long edge and committed as originals. The Slate build generates the responsive sizes; photos that fail processing are left out instead of failing the build.
- **Security:**
  - Sign-in checks the password against a scrypt hash, with at most 10 attempts per IP per hour.
  - Sessions are HMAC-signed tokens that expire after 12 hours, and requests are accepted only from the CORS allow-list.
  - GitHub access is through a dedicated GitHub App (contents write on this repository only), with installation tokens that expire after an hour; a fine-grained personal token is supported as a fallback.
  - A publish is refused if a file changed elsewhere since the editor loaded it.
- **Visibility:** the page is client-only and code-split, excluded from the sitemap and search engines (`Disallow: /admin`, `noindex`), and has no site chrome or analytics.
- **Pricing:** quote estimates use the published `/pricing.json`, so price edits reach the enquiry API without redeploying it.

## 14. Future Enhancements (out of scope v1)
- Online booking with deposit (Razorpay/Stripe via Catalyst function).
- Client proofing galleries (password-protected albums).
- Blog / journal for SEO.
- Instagram Graph API auto-feed; WhatsApp Business API notifications.
- Multi-language (EN + regional).

---

## 15. Acceptance Criteria

- [ ] Four primary pages (Home/About, Gallery, Quotation, Contact) + Privacy + 404 live on the custom domain via Catalyst Slate.
- [ ] All motion items M1–M12 implemented; all are disabled/simplified under `prefers-reduced-motion`.
- [ ] Gallery filters by category with animated reflow; deep links `/gallery/:slug` and `?photo=id` work on hard refresh.
- [ ] Lightbox supports keyboard, swipe, and share.
- [ ] Quotation form: 6 steps, validation, live estimate from `pricing.json`, server-side recalculation, data saved in Data Store, studio + client emails sent, reference number shown.
- [ ] Contact form stores and emails enquiries.
- [ ] WhatsApp floating button on all pages; context-aware pre-filled messages from Gallery and Quotation.
- [ ] Social links read from `site.json`; empty ones hidden; OG previews render correctly when shared on WhatsApp/Instagram/Facebook.
- [ ] Lighthouse mobile targets in §10 met on Home and Gallery.
- [ ] Keyboard-only and screen-reader smoke test pass on all pages.
- [ ] Forms protected by CAPTCHA, honeypot, and rate limiting.

---

## 16. Open Questions for the Studio
1. Final studio name, logo/monogram and tagline?
2. Service list and whether to **show prices** on the quotation page or collect requirements only?
3. Currency and default country code (spec assumes INR / +91)?
4. Which social networks are active, and the WhatsApp number to use?
5. Hero: still image or video?
6. Volume of gallery photos (decides bundled images vs. Catalyst Stratus)?
7. Email address that should receive enquiries, and the sending domain for auto-replies?
8. Preferred analytics tool, and is a cookie banner required for the target audience?
