import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({ width: 20, height: 20, viewBox: '0 0 24 24', 'aria-hidden': true, focusable: false, ...p });
const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const Instagram = (p: P) => (
  <svg {...base(p)} {...stroke}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></svg>
);
export const Facebook = (p: P) => (
  <svg {...base(p)} {...stroke}><path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H6.5v3.5H9V21h3.5v-8.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z" /></svg>
);
export const YouTube = (p: P) => (
  <svg {...base(p)} {...stroke}><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="m10 9.2 5 2.8-5 2.8z" fill="currentColor" /></svg>
);
export const Pinterest = (p: P) => (
  <svg {...base(p)} {...stroke}><circle cx="12" cy="12" r="9" /><path d="M10.5 20.5 12 14m0 0c3 1 5.5-1 5.5-4a5.5 5.5 0 0 0-11 0c0 1.3.5 2.3 1.2 2.8M12 14l1-5" /></svg>
);
export const Behance = (p: P) => (
  <svg {...base(p)} {...stroke}><path d="M3 6.5h5a2.5 2.5 0 0 1 0 5H3zm0 5h5.5a3 3 0 0 1 0 6H3zM14.5 14h6.5a3.5 3.5 0 1 0-1 2.5M15 7.5h5" /></svg>
);
export const LinkedIn = (p: P) => (
  <svg {...base(p)} {...stroke}><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M7.5 10.5V17M7.5 7.5v.01M11.5 17v-6.5M11.5 13.5a2.5 2.5 0 0 1 5 0V17" /></svg>
);
export const X = (p: P) => (
  <svg {...base(p)} {...stroke}><path d="M4 4l16 16M20 4 4 20" /></svg>
);
export const WhatsApp = (p: P) => (
  <svg {...base(p)} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5 5 0 0 0 1 2.7 11.5 11.5 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.2-.3-.2-.5-.3z" />
  </svg>
);
export const Arrow = (p: P) => (
  <svg {...base(p)} {...stroke}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);
export const ArrowLeft = (p: P) => (
  <svg {...base(p)} {...stroke}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
);
export const Close = (p: P) => (
  <svg {...base(p)} {...stroke}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const Share = (p: P) => (
  <svg {...base(p)} {...stroke}><path d="M12 15V3m0 0L8 7m4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
);
export const Plus = (p: P) => (
  <svg {...base(p)} {...stroke}><path d="M12 5v14M5 12h14" /></svg>
);
export const Check = (p: P) => (
  <svg {...base(p)} {...stroke}><path d="m5 12 5 5 9-10" /></svg>
);

export const socialIcons = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: YouTube,
  pinterest: Pinterest,
  behance: Behance,
  linkedin: LinkedIn,
  x: X,
} as const;

export const socialLabels = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
  behance: 'Behance',
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
} as const;
