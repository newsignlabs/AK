import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

const SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY as string | undefined;
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return loading;
}

export const captchaEnabled = Boolean(SITEKEY);

/** Cloudflare Turnstile widget; renders nothing when no site key is configured. */
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!SITEKEY || !ref.current) return;
    let id: string | undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return;
        id = window.turnstile.render(ref.current, {
          sitekey: SITEKEY,
          callback: onToken,
          'expired-callback': () => onToken(''),
          theme: 'auto',
        });
      })
      .catch(() => {
        /* the server rejects the submission; the form shows the error */
      });
    return () => {
      cancelled = true;
      if (id) window.turnstile?.remove(id);
    };
  }, [onToken]);
  if (!SITEKEY) return null;
  return <div ref={ref} className="turnstile" />;
}
