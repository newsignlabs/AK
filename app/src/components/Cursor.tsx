import { m, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useState } from 'react';
import { useFinePointer, useReducedMotionPref } from '../lib/hooks';

/**
 * M8 — small dot cursor that grows into a "View" disc over gallery images
 * (elements with data-cursor="view"). Desktop / fine pointers only; the
 * native cursor stays visible on form fields.
 */
export function Cursor() {
  const fine = useFinePointer();
  const reduced = useReducedMotionPref();
  const enabled = fine && !reduced;
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.4 });
  const [mode, setMode] = useState<'default' | 'view' | 'link' | 'hidden'>('default');

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add('has-cursor');
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target as Element | null;
      const target = t?.closest?.('[data-cursor], a, button, input, textarea, select, label');
      if (!target) return setMode('default');
      if (target.matches('input, textarea, select')) return setMode('hidden');
      setMode(target.getAttribute('data-cursor') === 'view' ? 'view' : 'link');
    };
    const leave = () => setMode('hidden');
    // Clicking often opens an overlay (lightbox, menu); drop the hover state until the next move.
    const reset = () => setMode('default');
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('click', reset);
    document.addEventListener('pointerleave', leave);
    return () => {
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('click', reset);
      document.removeEventListener('pointerleave', leave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;
  const size = mode === 'view' ? 88 : mode === 'link' ? 36 : 10;
  return (
    <m.div className={`cursor cursor--${mode}`} style={{ x: sx, y: sy }} aria-hidden>
      <m.div
        className="cursor__dot"
        animate={{ width: size, height: size, opacity: mode === 'hidden' ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <m.span animate={{ opacity: mode === 'view' ? 1 : 0 }}>View</m.span>
      </m.div>
    </m.div>
  );
}
