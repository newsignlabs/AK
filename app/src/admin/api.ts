import { validateBundle, type ContentBundle, type ContentIssue } from '../lib/content-schema';
import { load, remove, save } from '../lib/storage';

import site from '../../content/site.json';
import pricing from '../../content/pricing.json';
import services from '../../content/services.json';
import testimonials from '../../content/testimonials.json';
import faq from '../../content/faq.json';
import instagram from '../../content/instagram.json';
import categories from '../../content/gallery/categories.json';
import photos from '../../content/gallery/photos.json';

// Catalyst function name (its URL is /server/<name>/); set per environment in .env.production.
const FUNCTION = import.meta.env.VITE_ADMIN_FUNCTION || 'admin';
const BASE = `${(import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')}/server/${FUNCTION}`;
const MOCK = import.meta.env.VITE_API_MOCK === 'true';
const TOKEN_KEY = 'ak:admin-token';

export type Loaded = { content: ContentBundle; shas: Record<string, string> };
export type PublishResult =
  | { ok: true; unchanged?: boolean; url?: string }
  | { ok: false; status: number; issues?: ContentIssue[]; message: string };

export class AuthError extends Error {}

type Session = { token: string; expires: number };

export function getSession(): Session | null {
  const s = load<Session>(TOKEN_KEY, 'session');
  return s && s.expires > Date.now() ? s : null;
}
export const logout = () => remove(TOKEN_KEY, 'session');

/**
 * Every call is a "simple" cross-origin request: POST with a text/plain body
 * and the session token inside it. No custom headers means no CORS preflight;
 * Catalyst's Authorized Domains supply the CORS response headers.
 */
async function request<T>(name: string, payload: Record<string, unknown> = {}): Promise<{ status: number; json: T }> {
  const s = getSession();
  const res = await fetch(`${BASE}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    body: JSON.stringify(s ? { ...payload, token: s.token } : payload),
  });
  const json = (await res.json().catch(() => ({}))) as T;
  if (res.status === 401 && name !== 'login') {
    logout();
    throw new AuthError('Your session has expired. Please sign in again.');
  }
  return { status: res.status, json };
}

export async function login(password: string): Promise<{ ok: true } | { ok: false; message: string }> {
  if (MOCK) {
    if (!password) return { ok: false, message: 'Enter the password.' };
    save(TOKEN_KEY, { token: 'mock', expires: Date.now() + 12 * 3600e3 }, 'session');
    return { ok: true };
  }
  try {
    const { status, json } = await request<{ token?: string; expires?: number; error?: string }>('login', { password });
    if (status === 200 && json.token) {
      save(TOKEN_KEY, { token: json.token, expires: json.expires }, 'session');
      return { ok: true };
    }
    const message =
      status === 401
        ? 'Wrong password.'
        : status === 429
          ? 'Too many attempts. Try again in an hour.'
          : status === 503
            ? 'The admin service is not configured yet (see docs/ADMIN.md).'
            : 'Could not reach the admin service.';
    return { ok: false, message };
  } catch {
    return { ok: false, message: 'Could not reach the admin service.' };
  }
}

export async function loadContent(): Promise<Loaded> {
  if (MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      content: structuredClone({ site, pricing, services, testimonials, faq, instagram, categories, photos }) as ContentBundle,
      shas: {},
    };
  }
  const { status, json } = await request<Loaded & { error?: string }>('content');
  if (status !== 200) throw new Error('Could not load content from GitHub.');
  return json;
}

export async function publish(content: ContentBundle, shas: Record<string, string>, note: string): Promise<PublishResult> {
  const issues = validateBundle(content);
  if (issues.length) return { ok: false, status: 400, issues, message: 'Fix the highlighted fields first.' };
  if (MOCK) {
    await new Promise((r) => setTimeout(r, 700));
    console.info('[mock admin] publish', { note, content });
    return { ok: true, url: 'https://github.com/' };
  }
  try {
    const { status, json } = await request<{ url?: string; unchanged?: boolean; issues?: ContentIssue[]; file?: string }>('publish', { content, shas, note });
    if (status === 200) return { ok: true, url: json.url, unchanged: json.unchanged };
    if (status === 400) return { ok: false, status, issues: json.issues, message: 'Some fields are invalid.' };
    if (status === 409)
      return {
        ok: false,
        status,
        message: `"${json.file ?? 'A file'}" was changed elsewhere since you opened the editor. Reload to get the latest version (your edits will be lost).`,
      };
    return { ok: false, status, message: 'Publishing failed. Please try again.' };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    return { ok: false, status: 0, message: 'Network error. Please try again.' };
  }
}

/**
 * Shrinks an image in the browser before uploading it: photos become JPEG
 * (max 2400px); with keepAlpha (logos) PNG/WebP sources stay PNG so
 * transparency survives.
 */
export async function prepareImage(file: File, { max = 2400, keepAlpha = false } = {}): Promise<{ base64: string; blob: Blob }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const type = keepAlpha && /png|webp/.test(file.type) ? 'image/png' : 'image/jpeg';
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), type, 0.9),
  );
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { base64: btoa(bin), blob };
}

export async function uploadPhoto(name: string, base64: string): Promise<{ id: string; file: string }> {
  if (MOCK) {
    await new Promise((r) => setTimeout(r, 500));
    const id = `${name.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'photo'}-${Math.random().toString(16).slice(2, 8)}`;
    return { id, file: `${id}.jpg` };
  }
  const { status, json } = await request<{ id?: string; file?: string; error?: string }>('upload', { name, data: base64 });
  if (status === 201 && json.id && json.file) return { id: json.id, file: json.file };
  throw new Error(status === 413 ? 'That photo is too large.' : status === 415 ? 'Only JPEG, PNG or WebP photos.' : 'Upload failed.');
}
