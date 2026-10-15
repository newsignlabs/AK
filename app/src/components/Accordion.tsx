import { AnimatePresence, m } from 'motion/react';
import { useId, useState } from 'react';
import { Plus } from './Icons';
import { ease } from '../lib/motion';

export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const uid = useId();
  return (
    <ul className="accordion">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <li key={i} className={`accordion__item ${isOpen ? 'is-open' : ''}`}>
            <h3>
              <button
                className="accordion__btn"
                aria-expanded={isOpen}
                aria-controls={`${uid}-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <span>{item.q}</span>
                <m.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.3 }} className="accordion__icon">
                  <Plus />
                </m.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <m.div
                  id={`${uid}-${i}`}
                  className="accordion__panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: ease.out }}
                >
                  <p>{item.a}</p>
                </m.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
