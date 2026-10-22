# Admin panel

`https://<your-site>/admin` is a password-protected editor for all site text and
photos. It is part of the website; edits are saved by the `admin` Catalyst
function, which commits them to this GitHub repository. Slate rebuilds the site
on every push to `main`, so **published changes go live after the next Slate build (usually within 20 minutes)**.
Every change is a normal Git commit, so it can be reviewed and undone.

## What you can edit

| Tab | Content |
|---|---|
| Studio | Name, monogram, hero tagline, description, hero photo, **logo**, **intro mascot**, website address, scrolling words |
| Contact & social | Email, phone, WhatsApp number and message, address, map position, opening hours, social links |
| About | Heading, paragraphs, portrait, stats, process steps |
| Services | Services list on Home and which gallery category each links to |
| Gallery | Categories (title, URL name, cover); photos: upload, alt text, caption, category, featured, order, delete |
| Testimonials, FAQ | Add, edit, reorder, remove |
| Instagram | Photos and post links for the Home strip |
| Pricing | Quote estimate rates, add-ons, albums, multipliers, budgets, show/hide prices |

Wrap a word in `*asterisks*` in headings to show it in italic.

**Logo:** upload the white / light version of your logo in the Studio tab: a transparent
PNG, ideally **800 × 200 px**, cropped to the artwork (the build also trims empty
transparent borders). It replaces the text monogram and is shown in its own colours.
The header is always dark (see-through over the dark top of each page, solid black
once you scroll), so a light logo is always readable. Remove it to go back to the
monogram.

**Intro mascot:** the illustration that sits in front of the large "01" in the Home
intro. Upload a transparent PNG or WebP (about 1200 px tall) in the Studio tab; it keeps
its own colours and empty borders are trimmed automatically. Remove it to show just the
"01".

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

### 1. Create the GitHub App

The admin signs in to GitHub as a dedicated **GitHub App**. Its tokens are short-lived
(renewed every hour automatically), it isn't tied to a personal account, and there's no
yearly token to renew.

GitHub → your profile or the `newsignlabs` organization → **Settings → Developer settings →
GitHub Apps → New GitHub App**:

| Setting | Value |
|---|---|
| Name | e.g. `ak-studio-admin` |
| Homepage URL | the site URL, e.g. `https://ak-ccnxaodr.onslate.in` |
| Webhook | untick **Active** |
| Repository permissions → Contents | **Read and write** |
| Repository permissions → Metadata | Read-only (always on) |
| Everything else | No access |
| Where can it be installed? | Only on this account |

Then, on the app's page:
1. Note the **App ID**.
2. **Generate a private key**. A `.pem` file downloads.
3. **Install App** → **Only select repositories** → `AK`. The installation page URL ends in
   `/installations/<number>`: that number is the **Installation ID**.

If you protect `main` later, add the app to the branch rule's bypass list.

<details>
<summary>Alternative: a personal access token</summary>

A fine-grained token with **Contents: Read and write** on `AK` only also works: set it as
`GITHUB_TOKEN` instead of the three `GH_*` variables. If both are set, the app is used.
</details>

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
| `GH_APP_ID` | App ID from step 1 |
| `GH_INSTALLATION_ID` | Installation ID from step 1 |
| `GH_PRIVATE_KEY` | the whole `.pem` file, from `-----BEGIN` to `-----END … KEY-----` (line breaks turned into spaces are fine) |
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

The site's domain must also be listed under **Authorized Domains (CORS)**:
Catalyst adds the CORS headers itself, so the functions deliberately don't
(sending them twice makes browsers reject the reply). Only on a host without
gateway CORS, set `CORS_HEADERS=on` on the functions. That's
already done for `ak-ccnxaodr.onslate.in`.

### 6. Use it

Open `/admin`, sign in, edit, and press **Publish**. The site updates about a minute later.

To change the password, repeat step 4 and replace both values (this also signs out
existing sessions). To rotate the app's key, generate a new private key on the app's page, replace
`GH_PRIVATE_KEY`, then delete the old key on GitHub.

<details>
<summary>Prefer the command line?</summary>

`node functions/admin/hash-password.js` prints the same two variables, and
`catalyst deploy --only functions` deploys both functions from the repo.
</details>

## Local development

`cd app && npm run dev`, then open http://localhost:5173/admin. Any password works, and
publishing and uploads are simulated, so nothing is committed.
