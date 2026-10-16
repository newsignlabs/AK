import { Fragment, type ReactNode } from 'react';

/** Strips the *accent* markers used in headings, for aria labels and plain text. */
export const plain = (s: string) => s.replace(/\*/g, '');

/** Renders "*word*" spans as italic serif accents (the rich B&W type style). */
export function accent(s: string): ReactNode {
  return s.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') ? <em key={i} className="accent">{part.slice(1, -1)}</em> : <Fragment key={i}>{part}</Fragment>,
  );
}
