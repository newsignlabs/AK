import { AnimatePresence, m, type PanInfo } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Photo } from '../lib/content';
import { categories, site } from '../lib/content';
import { photoMessage, waLink } from '../lib/whatsapp';
import { track } from '../lib/analytics';
import { ArrowLeft, Arrow, Close, Share, WhatsApp } from './Icons';
import { Img } from './Img';
import { useUI } from './UI';

type Props = {
  photos: Photo[];
  index: number;
  /** Index the lightbox was opened on — only that one morphs from its thumbnail. */
  openedAt: number;
  onChange: (i: number) => void;
  onClose: () => void;
};

/** M7 — fullscreen viewer: keyboard, swipe, drag-down to close, share, focus trap. */
export function Lightbox({ photos, index, openedAt, onChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [dir, setDir] = useState(0);
  const { lockScroll, toast } = useUI();
  const photo = photos[index];
  const n = photos.length;

  const go = useCallback(
    (d: number) => {
      setDir(d);
      onChange((index + d + n) % n);
    },
    [index, n, onChange],
  );

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    lockScroll(true);
    closeBtn.current?.focus();
    return () => {
      lockScroll(false);
      prevFocus?.focus?.();
    };
  }, [lockScroll]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, a[href]');
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
        else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  const url = `${window.location.origin}/gallery?photo=${photo.id}`;

  async function share() {
    track('photo_share', { photo: photo.id });
    try {
      if (navigator.share) return await navigator.share({ title: site.name, text: photo.caption, url });
      await navigator.clipboard.writeText(url);
      toast('Link copied');
    } catch {
      /* user cancelled */
    }
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.y > 120 || info.velocity.y > 600) return onClose();
    if (info.offset.x < -80 || info.velocity.x < -500) go(1);
    else if (info.offset.x > 80 || info.velocity.x > 500) go(-1);
  }

  const cat = categories.find((c) => c.slug === photo.category)?.title;

  return (
    <m.div
      ref={ref}
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="lightbox__backdrop" onClick={onClose} />
      <div className="lightbox__bar">
        <span className="lightbox__count" aria-live="polite">
          {String(index + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
        </span>
        <div className="lightbox__actions">
          <a
            className="icon-btn"
            href={waLink(photoMessage(url))}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ask about a similar shoot on WhatsApp"
            onClick={() => track('whatsapp_click', { source: 'lightbox' })}
          >
            <WhatsApp />
          </a>
          <button className="icon-btn" onClick={share} aria-label="Share photo">
            <Share />
          </button>
          <button ref={closeBtn} className="icon-btn" onClick={onClose} aria-label="Close viewer">
            <Close />
          </button>
        </div>
      </div>

      <div className="lightbox__stage">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <m.div
            key={photo.id}
            className="lightbox__frame"
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d === 0 ? 0 : d > 0 ? '30%' : '-30%', opacity: d === 0 ? 1 : 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d > 0 ? '-30%' : '30%', opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            drag
            dragSnapToOrigin
            dragElastic={0.4}
            onDragEnd={onDragEnd}
            style={{ aspectRatio: `${photo.w} / ${photo.h}` }}
          >
            <Img
              photo={photo}
              sizes="100vw"
              priority
              layoutId={index === openedAt ? `photo-${photo.id}` : undefined}
            />
          </m.div>
        </AnimatePresence>
      </div>

      <div className="lightbox__foot">
        <p>
          <span className="eyebrow">{cat}</span> {photo.caption}
        </p>
      </div>

      <button className="lightbox__nav lightbox__nav--prev icon-btn" onClick={() => go(-1)} aria-label="Previous photo">
        <ArrowLeft />
      </button>
      <button className="lightbox__nav lightbox__nav--next icon-btn" onClick={() => go(1)} aria-label="Next photo">
        <Arrow />
      </button>
    </m.div>
  );
}
