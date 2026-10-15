import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Lenis from 'lenis';
import { AnimatePresence, m } from 'motion/react';

type UIState = {
  hideWhatsApp: boolean;
  setHideWhatsApp: (v: boolean) => void;
  scrollTo: (target: number | HTMLElement, immediate?: boolean) => void;
  lockScroll: (locked: boolean) => void;
  toast: (msg: string) => void;
};

const Ctx = createContext<UIState | null>(null);

export function useUI(): UIState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useUI must be used inside <UIProvider>');
  return ctx;
}

/**
 * Global UI services: Lenis smooth scrolling (desktop, motion allowed),
 * scroll locking for overlays, toasts and the WhatsApp-button visibility flag.
 */
export function UIProvider({ children }: { children: ReactNode }) {
  const lenis = useRef<Lenis | null>(null);
  const [hideWhatsApp, setHideWhatsApp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (reduced || touch) return;
    const l = new Lenis({ lerp: 0.1, anchors: true });
    lenis.current = l;
    let raf = requestAnimationFrame(function loop(t) {
      l.raf(t);
      raf = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(raf);
      l.destroy();
      lenis.current = null;
    };
  }, []);

  const scrollTo = useCallback((target: number | HTMLElement, immediate = false) => {
    if (lenis.current) lenis.current.scrollTo(target, { immediate, offset: typeof target === 'number' ? 0 : -96 });
    else if (typeof target === 'number') window.scrollTo({ top: target, behavior: immediate ? 'instant' : 'smooth' });
    else target.scrollIntoView({ behavior: immediate ? 'instant' : 'smooth' });
  }, []);

  const lockScroll = useCallback((locked: boolean) => {
    document.documentElement.classList.toggle('is-locked', locked);
    if (locked) lenis.current?.stop();
    else lenis.current?.start();
  }, []);

  const timer = useRef<number>(undefined);
  const toast = useCallback((msg: string) => {
    setMessage(msg);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), 2600);
  }, []);

  const value = useMemo(
    () => ({ hideWhatsApp, setHideWhatsApp, scrollTo, lockScroll, toast }),
    [hideWhatsApp, scrollTo, lockScroll, toast],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        <AnimatePresence>
          {message && (
            <m.div
              className="toast"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
            >
              {message}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
