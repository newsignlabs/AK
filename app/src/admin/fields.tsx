import { useId, useState, type ReactNode } from 'react';
import type { ContentBundle } from '../lib/content-schema';

type Photo = ContentBundle['photos'][number];

/** Thumbnail URL: fresh uploads use their local preview until the site rebuilds. */
export function thumb(photo: Pick<Photo, 'id'>, previews: Record<string, string>): string {
  return previews[photo.id] ?? `/images/${photo.id}-480.jpg`;
}

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className={`a-field ${error ? 'a-field--error' : ''}`}>
      <label className="a-label" htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {error ? <p className="a-error">{error}</p> : hint ? <p className="a-hint">{hint}</p> : null}
    </div>
  );
}

export function Text({
  label,
  value,
  onChange,
  hint,
  error,
  multiline,
  rows = 3,
  maxLength,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  error?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  type?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id) =>
        multiline ? (
          <textarea id={id} value={value} rows={rows} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <input id={id} type={type} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        )
      }
    </Field>
  );
}

export function Num({
  label,
  value,
  onChange,
  hint,
  error,
  step = 1,
  min,
  nullable,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  hint?: ReactNode;
  error?: string;
  step?: number;
  min?: number;
  nullable?: boolean;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(id) => (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={value ?? ''}
          placeholder={nullable ? 'No price (custom quote)' : undefined}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === '' ? (nullable ? null : 0) : Number(v));
          }}
        />
      )}
    </Field>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="a-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="a-toggle__ui" aria-hidden />
      <span>
        {label}
        {hint && <small className="a-hint">{hint}</small>}
      </span>
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <Field label={label} error={error}>
      {(id) => (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
          {!options.some((o) => o.value === value) && <option value={value}>{value || '—'}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

/** Editable list: add, remove, reorder and expand items. */
export function List<T>({
  label,
  items,
  onChange,
  create,
  title,
  render,
  max,
  min = 0,
  addLabel = 'Add',
}: {
  label: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  title: (item: T, i: number) => string;
  render: (item: T, update: (fn: (draft: T) => void) => void, i: number) => ReactNode;
  max?: number;
  min?: number;
  addLabel?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const move = (i: number, d: number) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
    if (open === i) setOpen(i + d);
  };
  return (
    <section className="a-list">
      <header className="a-list__head">
        <h3>{label}</h3>
        <span className="a-count">
          {items.length}
          {max ? ` / ${max}` : ''}
        </span>
      </header>
      <ol>
        {items.map((item, i) => (
          <li key={i} className={`a-item ${open === i ? 'is-open' : ''}`}>
            <div className="a-item__bar">
              <button type="button" className="a-item__title" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span className="a-item__num">{String(i + 1).padStart(2, '0')}</span>
                {title(item, i) || <em>Untitled</em>}
              </button>
              <div className="a-item__actions">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">↓</button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remove "${title(item, i) || 'this item'}"?`)) onChange(items.filter((_, j) => j !== i));
                  }}
                  disabled={items.length <= min}
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
            {open === i && (
              <div className="a-item__body">
                {render(
                  item,
                  (fn) => {
                    const next = structuredClone(items);
                    fn(next[i]);
                    onChange(next);
                  },
                  i,
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      {(!max || items.length < max) && (
        <button
          type="button"
          className="a-btn a-btn--ghost"
          onClick={() => {
            onChange([...items, create()]);
            setOpen(items.length);
          }}
        >
          + {addLabel}
        </button>
      )}
    </section>
  );
}

/** Chooses a photo from the library. */
export function PhotoPicker({
  label,
  value,
  onChange,
  photos,
  previews,
  error,
}: {
  label: string;
  value: string;
  onChange: (id: string) => void;
  photos: Photo[];
  previews: Record<string, string>;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const current = photos.find((p) => p.id === value);
  return (
    <div className={`a-field ${error ? 'a-field--error' : ''}`}>
      <span className="a-label">{label}</span>
      <div className="a-picker">
        {current ? <img src={thumb(current, previews)} alt="" /> : <span className="a-picker__empty">No photo</span>}
        <div>
          <p className="a-picker__name">{current ? current.alt || current.id : value || '—'}</p>
          <button type="button" className="a-btn a-btn--ghost a-btn--sm" onClick={() => setOpen((o) => !o)}>
            {open ? 'Close' : 'Choose photo'}
          </button>
        </div>
      </div>
      {error && <p className="a-error">{error}</p>}
      {open && (
        <ul className="a-picker__grid">
          {photos.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={p.id === value ? 'is-selected' : ''}
                onClick={() => {
                  onChange(p.id);
                  setOpen(false);
                }}
                title={p.alt}
              >
                <img src={thumb(p, previews)} alt={p.alt} loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
