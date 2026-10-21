import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ContentBundle, ContentIssue } from '../lib/content-schema';
import { AuthError, getSession, loadContent, login, logout, publish, type Loaded } from './api';
import {
  AboutSection,
  ContactSection,
  EditorContext,
  FaqSection,
  GallerySection,
  InstagramSection,
  PricingSection,
  ServicesSection,
  StudioSection,
  TestimonialsSection,
} from './sections';
import './admin.css';

const TABS = [
  { id: 'studio', label: 'Studio', files: ['site'], C: StudioSection },
  { id: 'contact', label: 'Contact & social', files: ['site'], C: ContactSection },
  { id: 'about', label: 'About', files: ['site'], C: AboutSection },
  { id: 'services', label: 'Services', files: ['services'], C: ServicesSection },
  { id: 'gallery', label: 'Gallery', files: ['photos', 'categories'], C: GallerySection },
  { id: 'testimonials', label: 'Testimonials', files: ['testimonials'], C: TestimonialsSection },
  { id: 'faq', label: 'FAQ', files: ['faq'], C: FaqSection },
  { id: 'instagram', label: 'Instagram', files: ['instagram'], C: InstagramSection },
  { id: 'pricing', label: 'Pricing', files: ['pricing'], C: PricingSection },
] as const;

/** Which tab shows a given site.json field, for jumping to validation errors. */
const siteTab = (path: string) =>
  /^(about|stats|process)/.test(path) ? 'about' : /^(name|shortName|tagline|description|url|established|heroId|marquee)/.test(path) ? 'studio' : 'contact';

export default function AdminApp() {
  const [authed, setAuthed] = useState(() => Boolean(getSession()));
  useEffect(() => {
    document.title = 'Admin';
  }, []);
  if (new URLSearchParams(window.location.search).has('setup')) return <Setup />;
  return authed ? <Editor onSignOut={() => (logout(), setAuthed(false))} /> : <Login onDone={() => setAuthed(true)} />;
}

const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

/**
 * /admin?setup — creates ADMIN_PASSWORD_HASH (PBKDF2-SHA256) and a random
 * ADMIN_TOKEN_SECRET entirely in the browser, for pasting into the Catalyst
 * console. Nothing is sent anywhere.
 */
function Setup() {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [out, setOut] = useState<{ hash: string; secret: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const error = pw && pw.length < 10 ? 'Use at least 10 characters.' : pw2 && pw !== pw2 ? 'Passwords do not match.' : '';

  async function generate() {
    setBusy(true);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 310000 }, key, 256);
    setOut({ hash: `pbkdf2$310000$${hex(salt)}$${hex(bits)}`, secret: hex(crypto.getRandomValues(new Uint8Array(32))) });
    setBusy(false);
  }

  return (
    <main className="a-login">
      <form
        className="a-setup"
        onSubmit={(e) => {
          e.preventDefault();
          if (!error && pw && pw === pw2) generate();
        }}
      >
        <p className="a-eyebrow">Admin setup</p>
        <h1>Password</h1>
        <p className="a-hint">Choose the admin password. This page turns it into two values for the Catalyst console. It runs in your browser only; nothing is sent or stored.</p>
        <label className="a-label" htmlFor="npw">New password</label>
        <input id="npw" type="password" autoComplete="new-password" value={pw} onChange={(e) => (setPw(e.target.value), setOut(null))} />
        <label className="a-label" htmlFor="npw2">Repeat password</label>
        <input id="npw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => (setPw2(e.target.value), setOut(null))} />
        {error && <p className="a-error">{error}</p>}
        <button className="a-btn" disabled={busy || !!error || !pw || pw !== pw2}>{busy ? 'Generating…' : 'Generate values'}</button>
        {out && (
          <div className="a-setup__out">
            <p className="a-hint">In Catalyst console → Functions → admin → Environment variables, add:</p>
            {(
              [
                ['ADMIN_PASSWORD_HASH', out.hash],
                ['ADMIN_TOKEN_SECRET', out.secret],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="a-field">
                <span className="a-label">{k}</span>
                <div className="a-copy">
                  <input readOnly value={v} onFocus={(e) => e.target.select()} aria-label={k} />
                  <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => navigator.clipboard?.writeText(v)}>Copy</button>
                </div>
              </div>
            ))}
            <p className="a-hint">Then sign in at <a href="/admin">/admin</a> with this password. To change it later, repeat these steps.</p>
          </div>
        )}
      </form>
    </main>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <main className="a-login">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const r = await login(password);
          setBusy(false);
          if (r.ok) onDone();
          else setError(r.message);
        }}
      >
        <p className="a-eyebrow">AK Studio</p>
        <h1>Admin</h1>
        <label className="a-label" htmlFor="pw">Password</label>
        <input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        {error && <p className="a-error" role="alert">{error}</p>}
        <button className="a-btn" disabled={busy || !password}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <a className="a-back" href="/">← Back to the site</a>
      </form>
    </main>
  );
}

function Editor({ onSignOut }: { onSignOut: () => void }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [content, setContent] = useState<ContentBundle | null>(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('studio');
  const [issues, setIssues] = useState<ContentIssue[]>([]);
  const [status, setStatus] = useState<{ kind: 'idle' | 'busy' | 'ok' | 'error'; text?: string; url?: string }>({ kind: 'idle' });
  const [note, setNote] = useState('');
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const handleAuth = useCallback(
    (e: unknown) => {
      if (e instanceof AuthError) {
        alert(e.message);
        onSignOut();
        return true;
      }
      return false;
    },
    [onSignOut],
  );

  const reload = useCallback(() => {
    setLoadError('');
    loadContent()
      .then((l) => {
        setLoaded(l);
        setContent(structuredClone(l.content));
        setIssues([]);
      })
      .catch((e) => handleAuth(e) || setLoadError((e as Error).message));
  }, [handleAuth]);
  useEffect(reload, [reload]);

  const dirtyKeys = useMemo(() => {
    if (!loaded || !content) return [];
    return (Object.keys(content) as (keyof ContentBundle)[]).filter((k) => JSON.stringify(content[k]) !== JSON.stringify(loaded.content[k]));
  }, [loaded, content]);

  useEffect(() => {
    if (!dirtyKeys.length) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirtyKeys.length]);

  const edit = useCallback(<K extends keyof ContentBundle>(key: K, fn: (draft: ContentBundle[K]) => void | ContentBundle[K]) => {
    setContent((c) => {
      if (!c) return c;
      const next = structuredClone(c);
      const r = fn(next[key]);
      if (r !== undefined) next[key] = r as ContentBundle[K];
      return next;
    });
    setStatus((s) => (s.kind === 'ok' ? { kind: 'idle' } : s));
  }, []);

  const ctx = useMemo(
    () =>
      content && {
        content,
        edit,
        issues,
        previews,
        addPreview: (id: string, url: string) => setPreviews((p) => ({ ...p, [id]: url })),
      },
    [content, edit, issues, previews],
  );

  async function onPublish() {
    if (!content || !loaded) return;
    setStatus({ kind: 'busy' });
    try {
      const r = await publish(content, loaded.shas, note);
      if (r.ok) {
        setIssues([]);
        setNote('');
        // The published content is the new baseline; fresh shas come from a reload later.
        setLoaded((l) => (l ? { ...l, content: structuredClone(content) } : l));
        setStatus({ kind: 'ok', text: r.unchanged ? 'Nothing to publish.' : 'Published. The live site updates in about a minute.', url: r.url });
        if (!r.unchanged && import.meta.env.VITE_API_MOCK !== 'true') loadContent().then((l) => setLoaded((cur) => (cur ? { ...cur, shas: l.shas } : cur))).catch(() => {});
      } else {
        setIssues(r.issues ?? []);
        setStatus({ kind: 'error', text: r.message });
        const first = r.issues?.[0];
        if (first) {
          const t = first.file === 'site' ? siteTab(first.path) : TABS.find((x) => (x.files as readonly string[]).includes(first.file))?.id;
          if (t) setTab(t);
        }
      }
    } catch (e) {
      if (!handleAuth(e)) setStatus({ kind: 'error', text: 'Publishing failed.' });
    }
  }

  if (loadError)
    return (
      <main className="a-login">
        <div>
          <p className="a-error">{loadError}</p>
          <button className="a-btn" onClick={reload}>Try again</button>
        </div>
      </main>
    );
  if (!content || !ctx) return <main className="a-login"><p>Loading content…</p></main>;

  const Current = TABS.find((t) => t.id === tab)!.C;
  const issueCount = (t: (typeof TABS)[number]) =>
    issues.filter((i) => (i.file === 'site' ? t.files.includes('site' as never) && siteTab(i.path) === t.id : (t.files as readonly string[]).includes(i.file))).length;
  const tabDirty = (t: (typeof TABS)[number]) => t.files.some((f) => dirtyKeys.includes(f as keyof ContentBundle));

  return (
    <EditorContext.Provider value={ctx}>
      <div className="a-app">
        <aside className="a-side">
          <a className="a-brand" href="/" target="_blank" rel="noopener">
            <em>{content.site.shortName}</em> Admin
          </a>
          <nav aria-label="Sections">
            {TABS.map((t) => (
              <button key={t.id} className={`a-tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}>
                {t.label}
                {issueCount(t) > 0 ? <span className="a-dot a-dot--error">{issueCount(t)}</span> : tabDirty(t) ? <span className="a-dot" aria-label="unsaved changes" /> : null}
              </button>
            ))}
          </nav>
          <div className="a-side__foot">
            <a href="/" target="_blank" rel="noopener">View site ↗</a>
            <button onClick={() => (!dirtyKeys.length || confirm('Discard unpublished changes and sign out?')) && onSignOut()}>Sign out</button>
          </div>
        </aside>

        <main className="a-main">
          <header className="a-head">
            <h1>{TABS.find((t) => t.id === tab)!.label}</h1>
          </header>
          {issues.length > 0 && (
            <div className="a-issues" role="alert">
              <strong>{issues.length} thing{issues.length > 1 ? 's' : ''} to fix before publishing:</strong>
              <ul>
                {issues.slice(0, 8).map((i, n) => (
                  <li key={n}>
                    {i.file}
                    {i.path ? ` › ${i.path}` : ''}: {i.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Current />
        </main>

        <footer className="a-bar">
          <span className="a-bar__status" aria-live="polite">
            {status.kind === 'busy'
              ? 'Publishing…'
              : status.kind === 'ok' || status.kind === 'error'
                ? status.text
                : dirtyKeys.length
                  ? `Unpublished changes: ${dirtyKeys.join(', ')}`
                  : 'All changes published'}
            {status.url && (
              <>
                {' '}
                <a href={status.url} target="_blank" rel="noopener">View change ↗</a>
              </>
            )}
          </span>
          <input className="a-bar__note" placeholder="What changed? (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          <button className="a-btn a-btn--ghost" disabled={!dirtyKeys.length || status.kind === 'busy'} onClick={() => confirm('Discard all unpublished changes?') && (setContent(structuredClone(loaded!.content)), setIssues([]))}>
            Discard
          </button>
          <button className="a-btn" disabled={!dirtyKeys.length || status.kind === 'busy'} onClick={onPublish}>
            Publish
          </button>
        </footer>
      </div>
    </EditorContext.Provider>
  );
}
