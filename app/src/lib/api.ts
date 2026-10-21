import type { EnquiryRequest } from './schema';

export type SubmitResult =
  | { ok: true; ref: string }
  | { ok: false; status: number; errors?: Record<string, string>; message: string };

// Catalyst function name (its URL is /server/<name>/); set per environment in .env.production.
const FUNCTION = import.meta.env.VITE_ENQUIRY_FUNCTION || 'enquiry';
const ENDPOINT = `${(import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '')}/server/${FUNCTION}/`;

function utm(): string {
  const params = new URLSearchParams(window.location.search);
  return ['utm_source', 'utm_medium', 'utm_campaign']
    .map((k) => (params.get(k) ? `${k}=${params.get(k)}` : ''))
    .filter(Boolean)
    .join('&');
}

export async function submitEnquiry(body: EnquiryRequest): Promise<SubmitResult> {
  const payload = { ...body, sourcePage: window.location.pathname, utm: utm() };

  if (import.meta.env.VITE_API_MOCK === 'true') {
    await new Promise((r) => setTimeout(r, 900));
    const prefix = body.type === 'quote' ? 'AKQ' : 'AKC';
    console.info('[mock api] enquiry', payload);
    return { ok: true, ref: `${prefix}-${new Date().getFullYear()}-DEMO` };
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ref) return { ok: true, ref: json.ref };
    const message =
      res.status === 429
        ? 'Too many requests. Please try again in a little while, or message us on WhatsApp.'
        : res.status === 400
          ? 'Please check the highlighted fields.'
          : 'Something went wrong on our side. Please try again, or message us on WhatsApp.';
    return { ok: false, status: res.status, errors: json.errors, message };
  } catch {
    return { ok: false, status: 0, message: 'Network error. Please check your connection, or message us on WhatsApp.' };
  }
}
