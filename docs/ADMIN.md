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

## One-time setup

### 1. GitHub token

Create a **fine-grained personal access token** at GitHub → Settings → Developer settings:
- Repository access: **only** `newsignlabs/AK`
- Permissions: **Contents → Read and write** (nothing else)
- An expiry you will remember to renew (e.g. 1 year)

### 2. Admin password

```bash
node functions/admin/hash-password.js
```

Enter a strong password (10+ characters). It prints `ADMIN_PASSWORD_HASH=…` and a
random `ADMIN_TOKEN_SECRET=…`. Never commit these.

### 3. Deploy the function

```bash
cd functions/admin && npm install --omit=dev && npm test && cd ../..
catalyst deploy --only functions
```

Then in the Catalyst console → Functions → `admin` → Environment variables, set:

| Variable | Value |
|---|---|
| `GITHUB_TOKEN` | the token from step 1 |
| `ADMIN_PASSWORD_HASH` | from step 2 |
| `ADMIN_TOKEN_SECRET` | from step 2 |
| `GITHUB_REPO` | `newsignlabs/AK` |
| `GITHUB_BRANCH` | `main` |
| `ALLOWED_ORIGINS` | your Slate URL, e.g. `https://ak-ccnxaodr.onslate.in` (comma-separate several, add your custom domain later) |

The site's Slate domain must also be listed under Catalyst **Authorized Domains (CORS)**.

### 4. Use it

Open `https://<your-site>/admin`, sign in, edit, and press **Publish**.

To change the password, run step 2 again and replace both variables (this also
signs out existing sessions).

## Local development

`cd app && npm run dev`, then open http://localhost:5173/admin. Any password works, and
publishing and uploads are simulated, so nothing is committed.
