// Browser storage can be unavailable (private mode, blocked site data);
// every access is wrapped so the site works without it.
export function load<T>(key: string, store: 'local' | 'session' = 'local'): T | null {
  try {
    const raw = (store === 'local' ? localStorage : sessionStorage).getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function save(key: string, value: unknown, store: 'local' | 'session' = 'local'): void {
  try {
    (store === 'local' ? localStorage : sessionStorage).setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function remove(key: string, store: 'local' | 'session' = 'local'): void {
  try {
    (store === 'local' ? localStorage : sessionStorage).removeItem(key);
  } catch {
    /* ignore */
  }
}
