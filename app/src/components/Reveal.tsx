import { m, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useRef, type ReactNode, type ElementType } from 'react';
import { dur, ease, stagger } from '../lib/motion';
import { accent, plain } from '../lib/rich';
import { useDesktop, useReducedMotionPref } from '../lib/hooks';

const viewport = { once: true, margin: '0px 0px -10% 0px' } as const;

/** M3 — headline split into lines that slide up from a mask. */
export function RevealText({
  as: Tag = 'h2',
  lines,
  className = '',
  delay = 0,
  immediate = false,
  id,
}: {
  id?: string;
  as?: ElementType;
  lines: string[];
  className?: string;
  delay?: number;
  /** Animate on mount instead of on entering the viewport (hero). */
  immediate?: boolean;
}) {
  if (immediate) {
    // Hero headline: a CSS animation that starts with the first paint, so it never waits on JS (keeps LCP early).
    return (
      <Tag id={id} className={`reveal-text ${className}`} aria-label={plain(lines.join(' '))}>
        <span style={{ display: 'block' }} aria-hidden>
          {lines.map((line, i) => (
            <span className="reveal-text__mask" key={i}>
              <span className="reveal-text__line reveal-text__line--css" style={{ animationDelay: `${delay + i * stagger}s` }}>
                {accent(line)}
              </span>
            </span>
          ))}
        </span>
      </Tag>
    );
  }
  return (
    <Tag id={id} className={`reveal-text ${className}`} aria-label={plain(lines.join(' '))}>
      <m.span initial="hidden" whileInView="shown" viewport={viewport} transition={{ staggerChildren: stagger, delayChildren: delay }} style={{ display: 'block' }} aria-hidden>
        {lines.map((line, i) => (
          <span className="reveal-text__mask" key={i}>
            <m.span
              className="reveal-text__line"
              data-reveal
              variants={{ hidden: { y: '105%' }, shown: { y: '0%' } }}
              transition={{ duration: dur.slow, ease: ease.out }}
            >
              {accent(line)}
            </m.span>
          </span>
        ))}
      </m.span>
    </Tag>
  );
}

/** Simple fade-up for paragraphs and blocks. */
export function FadeUp({ children, delay = 0, className = '', as = 'div' }: { children: ReactNode; delay?: number; className?: string; as?: 'div' | 'p' | 'li' | 'section' }) {
  const Comp = m[as];
  return (
    <Comp
      className={className}
      data-reveal
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewport}
      transition={{ duration: dur.base, ease: ease.out, delay }}
    >
      {children}
    </Comp>
  );
}

/** M4 — clip-path wipe plus a gentle scale-down as the image enters. */
export function RevealImage({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <m.div
      className={`reveal-image ${className}`}
      data-reveal
      initial={{ clipPath: 'inset(100% 0% 0% 0%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={viewport}
      transition={{ duration: dur.slow * 1.2, ease: ease.inOut, delay }}
    >
      <m.div
        data-reveal
        initial={{ scale: 1.15 }}
        whileInView={{ scale: 1 }}
        viewport={viewport}
        transition={{ duration: dur.slow * 1.6, ease: ease.out, delay }}
      >
        {children}
      </m.div>
    </m.div>
  );
}

/** M5 — parallax: content drifts slower than the scroll (desktop only). */
export function Parallax({ children, speed = 0.12, className = '' }: { children: ReactNode; speed?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const desktop = useDesktop();
  const reduced = useReducedMotionPref();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [`${-speed * 100}%`, `${speed * 100}%`]);
  const enabled = desktop && !reduced;
  return (
    <div ref={ref} className={`parallax ${className}`}>
      <m.div style={enabled ? { y, scale: 1 + speed * 2 } : undefined} className="parallax__inner">
        {children}
      </m.div>
    </div>
  );
}

/** Intro statement: words brighten from muted to ink as you scroll. */
export function ScrollWords({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.45'] });
  const words = text.split(' ');
  return (
    <p ref={ref} className={`scroll-words ${className}`}>
      {words.map((w, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {w}
        </Word>
      ))}
    </p>
  );
}

function Word({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const reduced = useReducedMotionPref();
  const opacity = useTransform(progress, range, [0.18, 1]);
  return (
    <m.span style={{ opacity: reduced ? 1 : opacity }} data-reveal>
      {children}{' '}
    </m.span>
  );
}

/**
 * M14 — a frame hung on the wall: swings in from a slight angle around its
 * top edge and settles, like a picture just hung on its wire.
 */
export function Hang({ children, className = '', delay = 0, tilt = -5 }: { children: ReactNode; className?: string; delay?: number; tilt?: number }) {
  return (
    <m.div
      className={`hang ${className}`}
      data-reveal
      style={{ transformOrigin: '50% -40px' }}
      initial={{ opacity: 0, rotate: tilt, y: -30 }}
      whileInView={{ opacity: 1, rotate: 0, y: 0 }}
      viewport={{ once: true, margin: '0px -5% -5% 0px' }}
      transition={{ opacity: { duration: 0.5, delay }, rotate: { type: 'spring', stiffness: 70, damping: 7, delay }, y: { type: 'spring', stiffness: 90, damping: 14, delay } }}
    >
      {children}
    </m.div>
  );
}

/** Museum label sliding out from behind its frame. */
export function SlideLabel({ children, className = '', delay = 0.35 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <m.div
      className={className}
      data-reveal
      initial={{ opacity: 0, y: -18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: ease.out, delay }}
    >
      {children}
    </m.div>
  );
}
