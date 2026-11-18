import {
  m,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useMediaQuery } from '../lib/hooks';
import { useUI } from './UI';

/**
 * Horizontal exhibition walk (spec §3.6). On wide screens with motion allowed,
 * the rooms are pinned (position: sticky) and normal vertical scrolling slides
 * the track sideways with a transform — no scroll hijacking: wheel, keyboard,
 * scrollbar and history all behave normally. Elsewhere the rooms simply stack.
 *
 * Layout is decided by CSS (the same media query), so the server HTML and the
 * first paint already have the right shape; this component only measures the
 * track and moves it.
 */
export const WALK_QUERY = '(min-width: 1024px) and (min-height: 640px) and (prefers-reduced-motion: no-preference)';

type WalkState = { on: boolean; x: MotionValue<number> };
const WalkContext = createContext<WalkState | null>(null);
const RoomContext = createContext<{ start: () => number }>({ start: () => 0 });

export const useWalk = () => useContext(WalkContext);

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function Walk({ rooms, children }: { rooms: { id: string; label: string }[]; children: ReactNode }) {
  const on = useMediaQuery(WALK_QUERY);
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [dist, setDist] = useState(0);
  const [active, setActive] = useState(0);
  const starts = useRef<number[]>([]);
  const { scrollTo } = useUI();

  // Measure how far the track travels; the walk is that much taller than the screen.
  useIsoLayoutEffect(() => {
    const el = track.current;
    if (!on || !el) return;
    const measure = () => {
      setDist(Math.max(0, el.scrollWidth - window.innerWidth));
      starts.current = Array.from(el.querySelectorAll<HTMLElement>(':scope > [data-room]')).map((r) => r.offsetLeft);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [on]);

  const { scrollYProgress } = useScroll({ target: outer, offset: ['start start', 'end end'] });
  const zero = useMotionValue(0);
  const x = useTransform(scrollYProgress, (p) => (on ? -p * dist : 0));

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (!on) return;
    const pos = p * dist + window.innerWidth * 0.5;
    let i = 0;
    starts.current.forEach((s, k) => {
      if (pos >= s) i = k;
    });
    setActive((a) => (a === i ? a : i));
  });

  // Keyboard: focusing something in a room that is off-screen brings that room into view.
  useEffect(() => {
    const el = track.current;
    const box = outer.current;
    if (!on || !el || !box) return;
    const onFocus = (e: FocusEvent) => {
      const room = (e.target as HTMLElement).closest<HTMLElement>('[data-room]');
      if (!room || dist <= 0) return;
      const sticky = el.parentElement;
      if (sticky) sticky.scrollLeft = 0; // focus must never scroll the clipped container itself
      const r = room.getBoundingClientRect();
      if (r.left >= 0 && r.right <= window.innerWidth) return;
      const p = Math.min(1, Math.max(0, room.offsetLeft / dist));
      const top = box.getBoundingClientRect().top + window.scrollY;
      scrollTo(top + p * (box.offsetHeight - window.innerHeight), true);
    };
    el.addEventListener('focusin', onFocus);
    return () => el.removeEventListener('focusin', onFocus);
  }, [on, dist, scrollTo]);

  return (
    <WalkContext.Provider value={{ on, x: on ? x : zero }}>
      <div
        ref={outer}
        className={`walk ${on ? 'walk--on' : ''}`}
        style={on && dist ? { height: `calc(100vh + ${dist}px)` } : undefined}
      >
        <div className="walk__sticky">
          <m.div ref={track} className="walk__track" style={{ x: on ? x : 0 }}>
            {children}
          </m.div>
        </div>
      </div>
      {on && (
        <div className="walk-hud glass" aria-hidden>
          <span className="walk-hud__count">
            Room {String(active + 1).padStart(2, '0')} / {String(rooms.length).padStart(2, '0')}
          </span>
          <span className="walk-hud__bar">
            <m.span className="walk-hud__fill" style={{ scaleX: scrollYProgress }} />
          </span>
          <span className="walk-hud__name">{rooms[active]?.label}</span>
        </div>
      )}
    </WalkContext.Provider>
  );
}

/** One room of the exhibition (a section of the page). */
export function Room({
  id,
  label,
  className = '',
  children,
  labelledBy,
}: {
  id: string;
  label: string;
  className?: string;
  children: ReactNode;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const start = () => ref.current?.offsetLeft ?? 0;
  return (
    <RoomContext.Provider value={{ start }}>
      <section
        ref={ref}
        data-room={id}
        className={`room room--${id} ${className}`}
        aria-label={labelledBy ? undefined : label}
        aria-labelledby={labelledBy}
      >
        {children}
      </section>
    </RoomContext.Provider>
  );
}

/**
 * Depth layer: while walking, drifts sideways relative to its room (depth > 0
 * lags behind, depth < 0 runs ahead), giving parallax between layers.
 */
export function Depth({ depth, className = '', children }: { depth: number; className?: string; children: ReactNode }) {
  const walk = useWalk();
  const { start } = useContext(RoomContext);
  const fallback = useMotionValue(0);
  // Room's left edge relative to the screen is v + start; a lagging layer moves against it.
  const shift = useTransform(walk?.x ?? fallback, (v) => (walk?.on ? -(v + start()) * depth : 0));
  return (
    <m.div className={`depth ${className}`} style={{ x: walk?.on ? shift : 0 }}>
      {children}
    </m.div>
  );
}
