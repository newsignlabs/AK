import type { ReactNode } from 'react';

/** Label + control + hint + error, wired up with ids for screen readers. */
export function Field({
  id,
  label,
  error,
  hint,
  children,
  optional,
  className = '',
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  optional?: boolean;
  className?: string;
}) {
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {optional && <span className="field__optional"> (optional)</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="field__hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      <p className="field__error" id={`${id}-error`} role="alert">
        {error}
      </p>
    </div>
  );
}

/** aria props for a control rendered inside <Field>. */
export const describedBy = (id: string, error?: string, hasHint?: boolean) => ({
  id,
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : hasHint ? `${id}-hint` : undefined,
});

/** Hidden honeypot field — bots fill it, people never see it. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="hp" aria-hidden>
      <label htmlFor="company-website">Leave this empty</label>
      <input id="company-website" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
