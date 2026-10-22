import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import type { ContentBundle, ContentIssue } from '../lib/content-schema';
import { List, Num, PhotoPicker, Select, Text, Toggle, thumb } from './fields';
import { prepareImage, uploadPhoto } from './api';

type Ctx = {
  content: ContentBundle;
  edit: <K extends keyof ContentBundle>(key: K, fn: (draft: ContentBundle[K]) => void | ContentBundle[K]) => void;
  issues: ContentIssue[];
  previews: Record<string, string>;
  addPreview: (id: string, url: string) => void;
};

export const EditorContext = createContext<Ctx | null>(null);
const useEditor = () => useContext(EditorContext)!;

/** First validation message for a file + field path (e.g. 'site', 'address.city'). */
function useErr() {
  const { issues } = useEditor();
  return (file: string, path: string) => issues.find((i) => i.file === file && i.path === path)?.message;
}

const ACCENT_HINT = (
  <>
    Wrap a word in *asterisks* to show it in italic (e.g. <code>Quiet images of *loud* moments.</code>)
  </>
);

export function StudioSection() {
  const { content, edit, previews } = useEditor();
  const err = useErr();
  const s = content.site;
  return (
    <div className="a-grid">
      <Text label="Studio name" value={s.name} onChange={(v) => edit('site', (d) => void (d.name = v))} error={err('site', 'name')} maxLength={80} />
      <Text label="Short name / monogram" value={s.shortName} onChange={(v) => edit('site', (d) => void (d.shortName = v))} error={err('site', 'shortName')} maxLength={12} hint="Shown in the logo, preloader and footer." />
      <Text label="Tagline (hero headline)" value={s.tagline} onChange={(v) => edit('site', (d) => void (d.tagline = v))} error={err('site', 'tagline')} hint={ACCENT_HINT} maxLength={120} />
      <Num label="Established (year)" value={s.established} onChange={(v) => edit('site', (d) => void (d.established = v ?? 2018))} error={err('site', 'established')} />
      <div className="a-span">
        <Text label="Description (search engines & link previews)" value={s.description} multiline onChange={(v) => edit('site', (d) => void (d.description = v))} error={err('site', 'description')} maxLength={300} />
      </div>
      <PhotoPicker label="Hero photo" value={s.heroId} onChange={(v) => edit('site', (d) => void (d.heroId = v))} photos={content.photos} previews={previews} error={err('site', 'heroId')} />
      <LogoField />
      <MascotField />
      <Text label="Website address" value={s.url} type="url" onChange={(v) => edit('site', (d) => void (d.url = v))} error={err('site', 'url')} hint="Used for search engines and link previews." />
      <div className="a-span">
        <List
          label="Scrolling words (marquee)"
          items={s.marquee}
          onChange={(v) => edit('site', (d) => void (d.marquee = v))}
          create={() => 'New word'}
          title={(t) => t}
          min={1}
          max={16}
          render={(t, _update, i) => (
            <Text label="Text" value={t} onChange={(v) => edit('site', (d) => void (d.marquee[i] = v))} error={err('site', `marquee.${i}`)} />
          )}
        />
      </div>
    </div>
  );
}

/**
 * Brand image upload (logo, mascot): kept as PNG with transparency and its own
 * colours; replaces the previous image on publish.
 */
function BrandImageField({
  slot,
  label,
  empty,
  hint,
}: {
  slot: 'logo' | 'mascot';
  label: string;
  empty: ReactNode;
  hint: string;
}) {
  const { content, edit, previews, addPreview } = useEditor();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const img = content.site[slot];

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const { base64, blob } = await prepareImage(file, { max: slot === 'logo' ? 800 : 1200, keepAlpha: true });
      const { id, file: name } = await uploadPhoto(`${slot}-${file.name}`, base64);
      addPreview(id, URL.createObjectURL(blob));
      edit('site', (d) => void (d[slot] = { id, file: name }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className="a-field">
      <span className="a-label">{label}</span>
      <div className="a-logo">
        <div className={`a-logo__preview a-logo__preview--dark a-logo__preview--${slot}`}>
          {img ? <img src={previews[img.id] ?? `/images/${img.id}-${slot}.png`} alt={`${label} preview`} /> : empty}
        </div>
        <div className="a-logo__actions">
          <input ref={input} type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : img ? `Replace ${slot}` : `Upload ${slot}`}
          </button>
          {img && (
            <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => edit('site', (d) => void (d[slot] = null))}>
              Remove
            </button>
          )}
        </div>
      </div>
      {error ? <p className="a-error">{error}</p> : <p className="a-hint">{hint}</p>}
    </div>
  );
}

function LogoField() {
  const { content } = useEditor();
  return (
    <BrandImageField
      slot="logo"
      label="Logo"
      empty={
        <span className="a-logo__text">
          <em>{content.site.shortName}</em> STUDIO
        </span>
      }
      hint="Shown in the header in its own colours. The header is always dark, so upload the white / light version: a transparent PNG, ideally 800 × 200 px, cropped to the artwork. No logo: the header shows the monogram text."
    />
  );
}

function MascotField() {
  return (
    <BrandImageField
      slot="mascot"
      label="Intro mascot (sits in front of the “01” on Home)"
      empty={<span className="a-logo__text">01</span>}
      hint="Shown in its own colours on the dark intro section. A transparent PNG or WebP, about 1200 px tall, works best; empty borders are trimmed automatically. Remove it to show just the “01”."
    />
  );
}

export function ContactSection() {
  const { content, edit } = useEditor();
  const err = useErr();
  const s = content.site;
  return (
    <div className="a-grid">
      <Text label="Email" type="email" value={s.email} onChange={(v) => edit('site', (d) => void (d.email = v))} error={err('site', 'email')} />
      <Text label="Phone" value={s.phone} onChange={(v) => edit('site', (d) => void (d.phone = v))} error={err('site', 'phone')} />
      <Text label="WhatsApp number" value={s.whatsapp.number} onChange={(v) => edit('site', (d) => void (d.whatsapp.number = v.replace(/\D/g, '')))} error={err('site', 'whatsapp.number')} hint="Country code + number, digits only (e.g. 919812345678)." />
      <Text label="WhatsApp default message" value={s.whatsapp.defaultMessage} onChange={(v) => edit('site', (d) => void (d.whatsapp.defaultMessage = v))} error={err('site', 'whatsapp.defaultMessage')} />
      <Text label="Street" value={s.address.street} onChange={(v) => edit('site', (d) => void (d.address.street = v))} error={err('site', 'address.street')} />
      <Text label="City" value={s.address.city} onChange={(v) => edit('site', (d) => void (d.address.city = v))} error={err('site', 'address.city')} />
      <Text label="State / region" value={s.address.region} onChange={(v) => edit('site', (d) => void (d.address.region = v))} />
      <Text label="Postal code" value={s.address.postalCode} onChange={(v) => edit('site', (d) => void (d.address.postalCode = v))} />
      <Text label="Country code" value={s.address.country} maxLength={2} onChange={(v) => edit('site', (d) => void (d.address.country = v.toUpperCase()))} error={err('site', 'address.country')} hint="Two letters, e.g. IN" />
      <Text label="Default phone prefix" value={s.defaultCountryCode} onChange={(v) => edit('site', (d) => void (d.defaultCountryCode = v))} />
      <Num label="Map latitude" step={0.0001} value={s.geo.lat} onChange={(v) => edit('site', (d) => void (d.geo.lat = v ?? 0))} error={err('site', 'geo.lat')} />
      <Num label="Map longitude" step={0.0001} value={s.geo.lng} onChange={(v) => edit('site', (d) => void (d.geo.lng = v ?? 0))} error={err('site', 'geo.lng')} />
      <div className="a-span">
        <Text label="Appointment note" value={s.appointmentNote} onChange={(v) => edit('site', (d) => void (d.appointmentNote = v))} />
      </div>
      <div className="a-span">
        <List
          label="Opening hours"
          items={s.hours}
          onChange={(v) => edit('site', (d) => void (d.hours = v))}
          create={() => ({ days: 'Day', time: '10:00 – 18:00' })}
          title={(h) => `${h.days} · ${h.time}`}
          max={10}
          render={(h, update, i) => (
            <div className="a-grid">
              <Text label="Days" value={h.days} onChange={(v) => update((d) => void (d.days = v))} error={err('site', `hours.${i}.days`)} />
              <Text label="Time" value={h.time} onChange={(v) => update((d) => void (d.time = v))} error={err('site', `hours.${i}.time`)} />
            </div>
          )}
        />
      </div>
      <h3 className="a-span a-subhead">Social links</h3>
      {(Object.keys(s.socials) as (keyof typeof s.socials)[]).map((k) => (
        <Text
          key={k}
          label={k === 'x' ? 'X (Twitter)' : k[0].toUpperCase() + k.slice(1)}
          type="url"
          value={s.socials[k]}
          placeholder="https://… (leave empty to hide)"
          onChange={(v) => edit('site', (d) => void (d.socials[k] = v))}
          error={err('site', `socials.${k}`)}
        />
      ))}
      <Text label="Google Business / reviews link" type="url" value={s.googleBusinessUrl} onChange={(v) => edit('site', (d) => void (d.googleBusinessUrl = v))} error={err('site', 'googleBusinessUrl')} />
    </div>
  );
}

export function AboutSection() {
  const { content, edit, previews } = useEditor();
  const err = useErr();
  const s = content.site;
  return (
    <div className="a-grid">
      <Text label="Heading" value={s.about.heading} onChange={(v) => edit('site', (d) => void (d.about.heading = v))} error={err('site', 'about.heading')} hint={ACCENT_HINT} />
      <PhotoPicker label="Portrait" value={s.about.portraitId} onChange={(v) => edit('site', (d) => void (d.about.portraitId = v))} photos={content.photos} previews={previews} error={err('site', 'about.portraitId')} />
      <div className="a-span">
        <List
          label="Paragraphs"
          items={s.about.body}
          onChange={(v) => edit('site', (d) => void (d.about.body = v))}
          create={() => ''}
          title={(t) => t.slice(0, 80)}
          min={1}
          max={6}
          render={(t, _u, i) => (
            <Text label="Paragraph" multiline rows={5} value={t} onChange={(v) => edit('site', (d) => void (d.about.body[i] = v))} error={err('site', `about.body.${i}`)} />
          )}
        />
      </div>
      <div className="a-span">
        <List
          label="Stats"
          items={s.stats}
          onChange={(v) => edit('site', (d) => void (d.stats = v))}
          create={() => ({ value: 10, suffix: '', label: 'Label' })}
          title={(x) => `${x.value}${x.suffix} ${x.label}`}
          max={6}
          render={(x, update, i) => (
            <div className="a-grid a-grid--3">
              <Num label="Number" value={x.value} onChange={(v) => update((d) => void (d.value = v ?? 0))} error={err('site', `stats.${i}.value`)} />
              <Text label="Suffix" value={x.suffix} maxLength={4} onChange={(v) => update((d) => void (d.suffix = v))} hint="e.g. +" />
              <Text label="Label" value={x.label} onChange={(v) => update((d) => void (d.label = v))} error={err('site', `stats.${i}.label`)} />
            </div>
          )}
        />
      </div>
      <div className="a-span">
        <List
          label="Process steps"
          items={s.process}
          onChange={(v) => edit('site', (d) => void (d.process = v))}
          create={() => ({ title: 'Step', text: '' })}
          title={(x) => x.title}
          min={1}
          max={8}
          render={(x, update, i) => (
            <div className="a-grid">
              <Text label="Title" value={x.title} onChange={(v) => update((d) => void (d.title = v))} error={err('site', `process.${i}.title`)} />
              <Text label="Text" multiline value={x.text} onChange={(v) => update((d) => void (d.text = v))} error={err('site', `process.${i}.text`)} />
            </div>
          )}
        />
      </div>
    </div>
  );
}

export function ServicesSection() {
  const { content, edit } = useEditor();
  const err = useErr();
  return (
    <List
      label="Services (Home page)"
      items={content.services}
      onChange={(v) => edit('services', () => v)}
      create={() => ({ slug: 'weddings', name: 'New service', blurb: '' })}
      title={(x) => x.name}
      min={1}
      max={20}
      render={(x, update, i) => (
        <div className="a-grid">
          <Text label="Name" value={x.name} onChange={(v) => update((d) => void (d.name = v))} error={err('services', `${i}.name`)} />
          <Select
            label="Links to gallery category"
            value={x.slug}
            onChange={(v) => update((d) => void (d.slug = v))}
            options={content.categories.map((c) => ({ value: c.slug, label: c.title }))}
            error={err('services', `${i}.slug`)}
          />
          <div className="a-span">
            <Text label="Short description" value={x.blurb} onChange={(v) => update((d) => void (d.blurb = v))} error={err('services', `${i}.blurb`)} />
          </div>
        </div>
      )}
    />
  );
}

export function GallerySection() {
  const { content, edit, previews, addPreview } = useEditor();
  const err = useErr();
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const used = (id: string) => {
    const c = content;
    const where = [
      c.site.heroId === id && 'the hero',
      c.site.about.portraitId === id && 'the About portrait',
      ...c.categories.filter((x) => x.cover === id).map((x) => `the "${x.title}" cover`),
      c.instagram.some((x) => x.photoId === id) && 'the Instagram strip',
    ].filter(Boolean);
    return where as string[];
  };

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError('');
    for (const file of Array.from(files)) {
      setBusy((b) => [...b, file.name]);
      try {
        const { base64, blob } = await prepareImage(file);
        const { id, file: name } = await uploadPhoto(file.name, base64);
        addPreview(id, URL.createObjectURL(blob));
        edit('photos', (d) =>
          void d.unshift({
            id,
            file: name,
            alt: '',
            category: filter !== 'all' && filter !== 'site' ? filter : content.categories[0].slug,
            caption: '',
            featured: false,
          }),
        );
      } catch (e) {
        setUploadError(`${file.name}: ${(e as Error).message}`);
      } finally {
        setBusy((b) => b.filter((n) => n !== file.name));
      }
    }
    if (input.current) input.current.value = '';
  }

  const shown = content.photos
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => (filter === 'all' ? true : filter === 'site' ? p.hidden : p.category === filter && !p.hidden));

  return (
    <>
      <List
        label="Categories (gallery filters)"
        items={content.categories}
        onChange={(v) => edit('categories', () => v)}
        create={() => ({ slug: `category-${content.categories.length + 1}`, title: 'New category', cover: content.photos[0].id })}
        title={(x) => x.title}
        min={1}
        max={20}
        render={(x, update, i) => (
          <div className="a-grid">
            <Text label="Title" value={x.title} onChange={(v) => update((d) => void (d.title = v))} error={err('categories', `${i}.title`)} />
            <Text
              label="URL name"
              value={x.slug}
              onChange={(v) => {
                // Keep photos and services pointing at the renamed category.
                const next = v.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                const prev = x.slug;
                update((d) => void (d.slug = next));
                edit('photos', (d) => d.forEach((ph) => ph.category === prev && (ph.category = next)));
                edit('services', (d) => d.forEach((sv) => sv.slug === prev && (sv.slug = next)));
              }}
              error={err('categories', `${i}.slug`)}
              hint={`Page: /gallery/${x.slug}. Changing it updates its photos too.`}
            />
            <PhotoPicker label="Cover photo" value={x.cover} onChange={(v) => update((d) => void (d.cover = v))} photos={content.photos} previews={previews} error={err('categories', `${i}.cover`)} />
          </div>
        )}
      />

      <section className="a-list">
        <header className="a-list__head">
          <h3>Photos</h3>
          <span className="a-count">{content.photos.length}</span>
        </header>
        <div className="a-toolbar">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Show category">
            <option value="all">All photos</option>
            {content.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.title}
              </option>
            ))}
            <option value="site">Site-only (hero, portrait…)</option>
          </select>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => onFiles(e.target.files)} />
          <button type="button" className="a-btn" onClick={() => input.current?.click()} disabled={busy.length > 0}>
            {busy.length ? `Uploading ${busy.length}…` : '+ Upload photos'}
          </button>
        </div>
        {uploadError && <p className="a-error">{uploadError}</p>}
        <p className="a-hint">New photos appear on the site after you add alt text and publish; the site then builds their sizes (about a minute).</p>
        {err('photos', '') && <p className="a-error">{err('photos', '')}</p>}
        <ul className="a-photos">
          {shown.map(({ p, i }) => {
            const refs = used(p.id);
            return (
              <li key={p.id} className="a-photo">
                <div className="a-photo__img">
                  <img src={thumb(p, previews)} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.opacity = '0')} />
                  {previews[p.id] && <span className="a-badge">New</span>}
                  {(content.site.heroId === p.id || content.site.about.portraitId === p.id) && (
                    <span className="a-badge a-badge--bottom-left">
                      {[content.site.heroId === p.id && 'Hero', content.site.about.portraitId === p.id && 'Portrait'].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  {p.featured && <span className="a-badge a-badge--right">Featured</span>}
                </div>
                <div className="a-photo__fields">
                  <Text label="Alt text (describe the photo)" value={p.alt} onChange={(v) => edit('photos', (d) => void (d[i].alt = v))} error={err('photos', `${i}.alt`)} maxLength={250} />
                  <Text label="Caption" value={p.caption} onChange={(v) => edit('photos', (d) => void (d[i].caption = v))} />
                  {!p.hidden && (
                    <Select
                      label="Category"
                      value={p.category}
                      onChange={(v) => edit('photos', (d) => void (d[i].category = v))}
                      options={content.categories.map((c) => ({ value: c.slug, label: c.title }))}
                      error={err('photos', `${i}.category`)}
                    />
                  )}
                  <Toggle label="Featured on Home" checked={p.featured} onChange={(v) => edit('photos', (d) => void (d[i].featured = v))} />
                  <Toggle label="Site-only (not in gallery)" checked={Boolean(p.hidden)} onChange={(v) => edit('photos', (d) => void (v ? (d[i].hidden = true) : delete d[i].hidden))} />
                  <div className="a-photo__use">
                    {/* One-click placement: the previous hero/portrait stays in the library. */}
                    <button
                      type="button"
                      className="a-btn a-btn--ghost a-btn--sm"
                      disabled={content.site.heroId === p.id}
                      onClick={() => edit('site', (d) => void (d.heroId = p.id))}
                    >
                      {content.site.heroId === p.id ? '✓ Hero photo' : 'Use as hero'}
                    </button>
                    <button
                      type="button"
                      className="a-btn a-btn--ghost a-btn--sm"
                      disabled={content.site.about.portraitId === p.id}
                      onClick={() => edit('site', (d) => void (d.about.portraitId = p.id))}
                    >
                      {content.site.about.portraitId === p.id ? '✓ About portrait' : 'Use as About portrait'}
                    </button>
                  </div>
                  <div className="a-photo__actions">
                    <button type="button" onClick={() => edit('photos', (d) => void (i > 0 && ([d[i - 1], d[i]] = [d[i], d[i - 1]])))} disabled={i === 0} aria-label="Move earlier">←</button>
                    <button type="button" onClick={() => edit('photos', (d) => void (i < d.length - 1 && ([d[i + 1], d[i]] = [d[i], d[i + 1]])))} disabled={i === content.photos.length - 1} aria-label="Move later">→</button>
                    <button
                      type="button"
                      className="a-danger"
                      disabled={refs.length > 0}
                      title={refs.length ? `Used by ${refs.join(', ')}` : 'Delete'}
                      onClick={() => confirm('Remove this photo from the site?') && edit('photos', (d) => void d.splice(i, 1))}
                    >
                      Delete
                    </button>
                  </div>
                  {refs.length > 0 && <p className="a-hint">Used by {refs.join(', ')}.</p>}
                  {p.hidden && refs.length === 0 && (
                    <p className="a-warn">
                      Not shown anywhere. Site-only photos appear only where you choose them: as the hero (Studio tab), the
                      About portrait (About tab), a category cover or in the Instagram strip. To show it in the gallery, turn off
                      "Site-only".
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

export function TestimonialsSection() {
  const { content, edit } = useEditor();
  const err = useErr();
  return (
    <List
      label="Testimonials"
      items={content.testimonials}
      onChange={(v) => edit('testimonials', () => v)}
      create={() => ({ quote: '', name: '', role: '' })}
      title={(x) => (x.name ? `${x.name} — ${x.quote.slice(0, 50)}` : x.quote.slice(0, 60))}
      max={20}
      render={(x, update, i) => (
        <div className="a-grid">
          <div className="a-span">
            <Text label="Quote" multiline value={x.quote} onChange={(v) => update((d) => void (d.quote = v))} error={err('testimonials', `${i}.quote`)} maxLength={400} />
          </div>
          <Text label="Name" value={x.name} onChange={(v) => update((d) => void (d.name = v))} error={err('testimonials', `${i}.name`)} />
          <Text label="Shoot / role" value={x.role} onChange={(v) => update((d) => void (d.role = v))} />
        </div>
      )}
    />
  );
}

export function FaqSection() {
  const { content, edit } = useEditor();
  const err = useErr();
  return (
    <List
      label="FAQ (Contact page)"
      items={content.faq}
      onChange={(v) => edit('faq', () => v)}
      create={() => ({ q: '', a: '' })}
      title={(x) => x.q}
      max={30}
      render={(x, update, i) => (
        <div className="a-grid">
          <div className="a-span">
            <Text label="Question" value={x.q} onChange={(v) => update((d) => void (d.q = v))} error={err('faq', `${i}.q`)} />
          </div>
          <div className="a-span">
            <Text label="Answer" multiline rows={4} value={x.a} onChange={(v) => update((d) => void (d.a = v))} error={err('faq', `${i}.a`)} />
          </div>
        </div>
      )}
    />
  );
}

export function InstagramSection() {
  const { content, edit, previews } = useEditor();
  const err = useErr();
  return (
    <List
      label="Instagram strip (first 6 show on Home)"
      items={content.instagram}
      onChange={(v) => edit('instagram', () => v)}
      create={() => ({ photoId: content.photos[0].id, url: content.site.socials.instagram || 'https://instagram.com/' })}
      title={(x) => content.photos.find((p) => p.id === x.photoId)?.alt || x.photoId}
      max={12}
      render={(x, update, i) => (
        <div className="a-grid">
          <PhotoPicker label="Photo" value={x.photoId} onChange={(v) => update((d) => void (d.photoId = v))} photos={content.photos} previews={previews} error={err('instagram', `${i}.photoId`)} />
          <Text label="Post link" type="url" value={x.url} onChange={(v) => update((d) => void (d.url = v))} error={err('instagram', `${i}.url`)} />
        </div>
      )}
    />
  );
}

export function PricingSection() {
  const { content, edit } = useEditor();
  const err = useErr();
  const p = content.pricing;
  return (
    <div className="a-stack">
      <div className="a-grid">
        <Toggle label="Show prices on the quote page" checked={p.showPrices} onChange={(v) => edit('pricing', (d) => void (d.showPrices = v))} hint="When off, the form collects requirements without an estimate." />
        <Text label="Note under the estimate" value={p.note} onChange={(v) => edit('pricing', (d) => void (d.note = v))} />
        <Num label="Estimate range spread (0.15 = +15%)" step={0.01} value={p.rangeSpread} onChange={(v) => edit('pricing', (d) => void (d.rangeSpread = v ?? 0))} error={err('pricing', 'rangeSpread')} />
        <Num label="Round estimates to" value={p.roundTo} onChange={(v) => edit('pricing', (d) => void (d.roundTo = v ?? 1))} error={err('pricing', 'roundTo')} />
      </div>

      <section className="a-list">
        <header className="a-list__head"><h3>Shoot types</h3></header>
        {Object.entries(p.services).map(([key, s]) => (
          <details key={key} className="a-item">
            <summary className="a-item__title">{s.label}{s.base === null ? ' · custom quote' : ` · from ${s.base}`}</summary>
            <div className="a-item__body a-grid a-grid--3">
              <Text label="Label" value={s.label} onChange={(v) => edit('pricing', (d) => void (d.services[key].label = v))} error={err('pricing', `services.${key}.label`)} />
              <Num label="Base price" nullable value={s.base} onChange={(v) => edit('pricing', (d) => void (d.services[key].base = v))} hint="Empty = custom quote" />
              <Num label="Hours included" step={0.5} value={s.includedHours} onChange={(v) => edit('pricing', (d) => void (d.services[key].includedHours = v ?? 0))} />
              <Num label="Per extra hour" value={s.perHour} onChange={(v) => edit('pricing', (d) => void (d.services[key].perHour = v ?? 0))} />
              <Text label="Counted unit" value={s.unitLabel} onChange={(v) => edit('pricing', (d) => void (d.services[key].unitLabel = v))} hint="e.g. guests, products, looks" />
              <Num label="Units included" value={s.includedUnits} onChange={(v) => edit('pricing', (d) => void (d.services[key].includedUnits = v ?? 0))} />
              <Num label="Per extra unit" value={s.perUnit} onChange={(v) => edit('pricing', (d) => void (d.services[key].perUnit = v ?? 0))} />
              <Num label="Default count" value={s.defaultUnits} min={1} onChange={(v) => edit('pricing', (d) => void (d.services[key].defaultUnits = v ?? 1))} />
            </div>
          </details>
        ))}
      </section>

      <section className="a-list">
        <header className="a-list__head"><h3>Edited photos</h3></header>
        <div className="a-grid a-grid--3">
          <Num label="Included" value={p.editedPhotos.included} onChange={(v) => edit('pricing', (d) => void (d.editedPhotos.included = v ?? 0))} />
          <Num label="Step size" value={p.editedPhotos.step} onChange={(v) => edit('pricing', (d) => void (d.editedPhotos.step = v ?? 1))} />
          <Num label="Price per step" value={p.editedPhotos.perStep} onChange={(v) => edit('pricing', (d) => void (d.editedPhotos.perStep = v ?? 0))} />
          <Num label="Maximum" value={p.editedPhotos.max} onChange={(v) => edit('pricing', (d) => void (d.editedPhotos.max = v ?? 1))} />
        </div>
      </section>

      {(['albums', 'addons'] as const).map((group) => (
        <section className="a-list" key={group}>
          <header className="a-list__head"><h3>{group === 'albums' ? 'Albums' : 'Add-ons'}</h3></header>
          {Object.entries(p[group]).map(([key, x]) => (
            <div className="a-grid" key={key}>
              <Text label="Label" value={x.label} onChange={(v) => edit('pricing', (d) => void (d[group][key].label = v))} error={err('pricing', `${group}.${key}.label`)} />
              <Num label="Price" value={x.price} onChange={(v) => edit('pricing', (d) => void (d[group][key].price = v ?? 0))} />
            </div>
          ))}
        </section>
      ))}

      <section className="a-list">
        <header className="a-list__head"><h3>Location multipliers</h3></header>
        {Object.entries(p.locationMultiplier).map(([key, x]) => (
          <div className="a-grid" key={key}>
            <Text label="Label" value={x.label} onChange={(v) => edit('pricing', (d) => void (d.locationMultiplier[key].label = v))} />
            <Num label="Multiplier (1.1 = +10%)" step={0.05} value={x.value} onChange={(v) => edit('pricing', (d) => void (d.locationMultiplier[key].value = v ?? 1))} error={err('pricing', `locationMultiplier.${key}.value`)} />
          </div>
        ))}
      </section>

      <section className="a-list">
        <header className="a-list__head"><h3>Budget options</h3></header>
        <div className="a-grid">
          {Object.entries(p.budgets).map(([key, label]) => (
            <Text key={key} label={key.replace(/_/g, ' ')} value={label} onChange={(v) => edit('pricing', (d) => void (d.budgets[key] = v))} />
          ))}
        </div>
      </section>
    </div>
  );
}
