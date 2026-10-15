import { lazy, type ComponentType } from 'react';

type Loader<P> = () => Promise<{ default: ComponentType<P> }>;

/**
 * React.lazy with a preload() hook. Once preloaded, the component renders
 * synchronously — no Suspense boundary — which keeps prerendered HTML fully
 * inline (readable without JS) and lets hydration match on the first pass.
 */
export function lazyWithPreload<P extends object>(load: Loader<P>) {
  let Loaded: ComponentType<P> | null = null;
  const Lazy = lazy(load);
  const Component = (props: P) => (Loaded ? <Loaded {...props} /> : <Lazy {...props} />);
  Component.preload = () =>
    load().then((m) => {
      Loaded = m.default;
    });
  return Component;
}
