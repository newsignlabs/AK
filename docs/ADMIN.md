# Admin panel

`https://<your-site>/admin` is a password-protected editor for all site text and
photos. It is part of the website; edits are saved by the `admin` Catalyst
function, which commits them to this GitHub repository. Slate rebuilds the site
on every push to `main`, so **published changes go live in about a minute**.
Every change is a normal Git commit, so it can be reviewed and undone.

## What you can edit

| Tab | Content |
|---|---|
| Studio | Name, monogram, hero tagline, description, hero photo, website address, scrolling words |
| Contact & social | Email, phone, WhatsApp number and message, address, map position, opening hours, social links |
| About | Heading, paragraphs, portrait, stats, process steps |
| Services | Services list on Home and which gallery category each links to |
| Gallery | Categories (title, URL name, cover); photos: upload, alt text, caption, category, featured, order, delete |
| Testimonials, FAQ | Add, edit, reorder, remove |
| Instagram | Photos and post links for the Home strip |
| Pricing | Quote estimate rates, add-ons, albums, multipliers, budgets, show/hide prices |

Wrap a word in `*asterisks*` in headings to show it in italic.

Before committing, everything is checked against the same rules the site is built with:
- Required fields and lengths.
- Links must start with http(s).
- Photo and category references must exist.

An edit that would break the site is refused, and the field is highlighted.

### Photos

- **Upload:** photos are resized in the browser (longest side 2400px) and committed to
  `app/content/gallery/originals/`.
- **Processing:** during the next Slate build, `npm run build` creates the AVIF/WebP/JPEG sizes
  and blur placeholders. A photo appears on the site once it has **alt text** and you **Publish**.
- **Deleting:** a photo used by the hero, the About portrait, a category cover or the
  Instagram strip can't be deleted until you choose another photo there.

### Safety

- **Sign-in:** password only, checked against a scrypt hash. Sessions last 12 hours, and
  sign-in attempts are limited to 10 per hour per IP address.
- **Repository access:** only the content files and the photo originals folder can be written.
- **Conflicts:** if a file was changed on GitHub after you opened the editor, publishing is refused. Reload,
  then edit again.

## One-time setup (manual, in the Catalyst console)

No GitHub App and no command line are needed. You need a GitHub **access token**,
the two zip files, and about 10 minutes.

### 1. Create a GitHub access token

1. On GitHub, open your profile picture → **Settings** → **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. **Token name:** `AK Studio admin`. **Expiration:** e.g. 1 year (renew it before it expires).
3. **Resource owner:** `newsignlabs`. **Repository access:** *Only select repositories* → `AK`.
4. **Permissions** → Repository permissions → **Contents: Read and write**. Leave everything else as is.
5. **Generate token** and copy it (it starts with `github_pat_`). It's shown only once.

If `newsignlabs` is an organization, an owner may need to approve the token
(Organization settings → Personal access tokens).

### 2. Get the function zips

Download `enquiry.zip` and `admin.zip`, or build them yourself with
`functions/package.sh`, which writes them to `functions/dist/`. Each zip already
contains its dependencies.

### 3. Create the functions in Catalyst

In the Catalyst console, open the **Ak** project → **Serverless** → **Functions** →
**Create Function**, once per zip:

| Setting | enquiry | admin |
|---|---|---|
| Function name | `studio_keys_enquiry` | `studio_keys_admin` |
| Type | Advanced I/O | Advanced I/O |
| Stack | Node.js 20 | Node.js 20 |
| Upload | `enquiry.zip` | `admin.zip` |

To update a function later, open it and upload the new zip.

If you use different function names, set `VITE_ENQUIRY_FUNCTION` and
`VITE_ADMIN_FUNCTION` in `app/.env.production` to match (the site calls
`/server/<name>/`). Authentication on both functions must be **optional**, because
the public site calls them without a Catalyst login; the admin function checks
its own password.

### 4. Choose the admin password

Open `https://<your-site>/admin?setup`, e.g. https://ak-ccnxaodr.onslate.in/admin?setup.
Type your password twice and press **Generate values**. The page shows two values;
it runs only in your browser and sends nothing.

### 5. Environment variables

Open each function → **Configuration / Environment variables**:

**studio_keys_admin**

| Variable | Value |
|---|---|
| `GITHUB_TOKEN` | the token from step 1 |
| `ADMIN_PASSWORD_HASH` | from step 4 |
| `ADMIN_TOKEN_SECRET` | from step 4 |
| `GITHUB_REPO` | `newsignlabs/AK` |
| `GITHUB_BRANCH` | `main` |
| `ALLOWED_ORIGINS` | `https://ak-ccnxaodr.onslate.in` (comma-separate several; add your custom domain later) |

**studio_keys_enquiry**

| Variable | Value |
|---|---|
| `STUDIO_EMAIL` | `nkkmails@zohomail.in` |
| `MAIL_FROM` | `nkkmails@zohomail.in` (must be verified under Catalyst Mail) |
| `ALLOWED_ORIGINS` | `https://ak-ccnxaodr.onslate.in` |
| `PRICING_URL` | `https://ak-ccnxaodr.onslate.in/pricing.json` |
| `RATE_LIMIT_PER_HOUR` | `5` |
| `TURNSTILE_SECRET` | optional, Cloudflare Turnstile secret |

The site's domain must also be listed under **Authorized Domains (CORS)**. That's
already done for `ak-ccnxaodr.onslate.in`.

### 6. Use it

Open `/admin`, sign in, edit, and press **Publish**. The site updates about a minute later.

To change the password, repeat step 4 and replace both values (this also signs out
existing sessions). If the token expires, create a new one (step 1) and replace `GITHUB_TOKEN`.

<details>
<summary>Prefer the command line?</summary>

`node functions/admin/hash-password.js` prints the same two variables, and
`catalyst deploy --only functions` deploys both functions from the repo.
</details>

## Local development

`cd app && npm run dev`, then open http://localhost:5173/admin. Any password works, and
publishing and uploads are simulated, so nothing is committed.
