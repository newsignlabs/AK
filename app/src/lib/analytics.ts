type Props = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Props }) => void;
    dataLayer?: unknown[];
  }
}

/** Sends a conversion/interaction event to whichever analytics tool is loaded. */
export function track(event: string, props: Props = {}): void {
  if (typeof window === 'undefined') return;
  try {
    window.plausible?.(event, { props });
    window.dataLayer?.push({ event, ...props });
  } catch {
    /* analytics must never break the page */
  }
}

export function loadAnalytics(): void {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
  if (!domain || typeof document === 'undefined') return;
  const s = document.createElement('script');
  s.defer = true;
  s.dataset.domain = domain;
  s.src = 'https://plausible.io/js/script.js';
  document.head.appendChild(s);
  window.plausible ??= Object.assign(
    (...args: unknown[]) => ((window.plausible as unknown as { q: unknown[] }).q ||= []).push(args),
    {},
  ) as Window['plausible'];
}
