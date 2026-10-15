import { AnimatePresence, m, useAnimationControls } from 'motion/react';
import { useEffect, useState } from 'react';
import { waLink } from '../lib/whatsapp';
import { track } from '../lib/analytics';
import { WhatsApp } from './Icons';
import { useUI } from './UI';

/** M12 — floating click-to-chat button; fades in after 2 s, pulses 3 times. */
export function WhatsAppButton() {
  const { hideWhatsApp } = useUI();
  const [ready, setReady] = useState(false);
  const pulse = useAnimationControls();

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 2000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ready || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let count = 0;
    const id = window.setInterval(() => {
      if (++count > 3) return window.clearInterval(id);
      pulse.start({ scale: [1, 1.6], opacity: [0.5, 0], transition: { duration: 1.4, ease: 'easeOut' } });
    }, 10_000);
    return () => window.clearInterval(id);
  }, [ready, pulse]);

  return (
    <AnimatePresence>
      {ready && !hideWhatsApp && (
        <m.a
          className="wa-float"
          href={waLink()}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with us on WhatsApp"
          onClick={() => track('whatsapp_click', { source: 'floating' })}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          data-cursor="link"
        >
          <m.span className="wa-float__pulse" animate={pulse} initial={{ opacity: 0 }} aria-hidden />
          <WhatsApp width={26} height={26} />
        </m.a>
      )}
    </AnimatePresence>
  );
}
