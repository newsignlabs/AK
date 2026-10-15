import { useEffect, useState } from 'react';

/** SSR-safe media query: false on the server and first client render. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);
  return matches;
}

export const useFinePointer = () => useMediaQuery('(hover: hover) and (pointer: fine)');
export const useReducedMotionPref = () => useMediaQuery('(prefers-reduced-motion: reduce)');
export const useDesktop = () => useMediaQuery('(min-width: 1024px)');
