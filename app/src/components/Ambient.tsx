import { useEffect, useRef } from 'react';
import { useFinePointer, useReducedMotionPref } from '../lib/hooks';

/**
 * Gallery lighting: warm light pools drifting behind the glass (CSS only), and
 * on desktop a faint spotlight that follows the cursor across the walls.
 */
export function Ambient() {
  const fine = useFinePointer();
  const reduced = useReducedMotionPref();
  const spot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = spot.current;
    if (!el || !fine || reduced) return;
    let raf = 0;
    let x = -999;
    let y = -999;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          el.style.setProperty('--sx', `${x}px`);
          el.style.setProperty('--sy', `${y}px`);
        });
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      cancelAnimationFrame(raf);
    };
  }, [fine, reduced]);

  return (
    <>
      <div className="ambient" aria-hidden>
        <span className="ambient__light ambient__light--a" />
        <span className="ambient__light ambient__light--b" />
        <span className="ambient__light ambient__light--c" />
      </div>
      {fine && !reduced && <div ref={spot} className="spotlight" aria-hidden />}
    </>
  );
}
