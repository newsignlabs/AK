import { m } from 'motion/react';
import { useEffect, useState } from 'react';
import { site } from '../lib/content';
import { ease } from '../lib/motion';

const KEY = 'ak:preloaded';

/**
 * M1 — first-visit preloader (max ~1.5 s): monogram draws in, counter runs to
 * 100, then the panel wipes up. An inline script in index.html marks repeat
 * visits / reduced motion before paint so the overlay never flashes for them.
 */
export function Preloader() {
  const [state, setState] = useState<'idle' | 'running' | 'leaving' | 'done'>('idle');
  const [count, setCount] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.preloaded === 'true') return setState('done');
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* ignore */
    }
    setState('running');
    const start = performance.now();
    let raf = requestAnimationFrame(function tick(t) {
      const p = Math.min(1, (t - start) / 1100);
      setCount(Math.round(p * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setState('leaving');
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  if (state === 'done') return null;

  return (
    <m.div
      className="preloader"
      aria-hidden
      initial={false}
      animate={state === 'leaving' ? { clipPath: 'inset(0 0 100% 0)' } : { clipPath: 'inset(0 0 0% 0)' }}
      transition={{ duration: 0.8, ease: ease.inOut }}
      onAnimationComplete={() => state === 'leaving' && setState('done')}
    >
      <svg className="preloader__mark" viewBox="0 0 120 60" width="160" height="80">
        <m.text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          initial={{ strokeDashoffset: 300, fillOpacity: 0 }}
          animate={state === 'idle' ? undefined : { strokeDashoffset: 0, fillOpacity: 1 }}
          transition={{ strokeDashoffset: { duration: 1, ease: ease.inOut }, fillOpacity: { delay: 0.8, duration: 0.3 } }}
        >
          {site.shortName}
        </m.text>
      </svg>
      <span className="preloader__count">{String(count).padStart(3, '0')}</span>
    </m.div>
  );
}
