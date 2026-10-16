import { AnimatePresence, LayoutGroup, m } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { categories, galleryPhotos } from '../lib/content';
import { Img } from '../components/Img';
import { Lightbox } from '../components/Lightbox';
import { RevealText } from '../components/Reveal';
import { track } from '../lib/analytics';
import NotFound from './NotFound';

const BATCH = 12;

export default function Gallery() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const category = categories.find((c) => c.slug === slug);
  const list = useMemo(
    () => (category ? galleryPhotos.filter((p) => p.category === category.slug) : galleryPhotos),
    [category],
  );
  const [count, setCount] = useState(BATCH);
  const [open, setOpen] = useState<{ index: number; openedAt: number } | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  // The first paint shows photos immediately (prerendered, no wait for JS — fast LCP);
  // after mount, newly shown photos animate in (filters, load more).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => setCount(BATCH), [slug]);

  // Deep link: /gallery?photo=<id> opens the lightbox (searches all photos).
  const photoParam = params.get('photo');
  useEffect(() => {
    if (!photoParam) return setOpen(null);
    const i = list.findIndex((p) => p.id === photoParam);
    if (i >= 0) {
      setCount((c) => Math.max(c, i + 1));
      setOpen((o) => (o ? { ...o, index: i } : { index: i, openedAt: i }));
    }
  }, [photoParam, list]);

  // Infinite scroll, with the "Load more" button as a fallback.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || count >= list.length) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setCount((c) => c + BATCH), { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [count, list.length]);

  if (slug && !category) return <NotFound />;

  const openAt = (i: number) => {
    track('lightbox_open', { photo: list[i].id });
    setOpen({ index: i, openedAt: i });
    setParams((p) => (p.set('photo', list[i].id), p), { preventScrollReset: true });
  };
  const change = (i: number) => {
    setOpen((o) => (o ? { ...o, index: i } : o));
    setParams((p) => (p.set('photo', list[i].id), p), { replace: true, preventScrollReset: true });
  };
  const close = () => {
    setOpen(null);
    setParams((p) => (p.delete('photo'), p), { preventScrollReset: true });
  };

  return (
    <div className="gallery">
      <header className="page-head container">
        <p className="eyebrow">Gallery — {list.length} frames</p>
        <RevealText as="h1" className="display" lines={[category ? category.title : 'Selected *work*']} immediate />
      </header>

      <nav className="filters" aria-label="Filter by category">
        <ul className="filters__list container">
          {[{ slug: '', title: 'All' }, ...categories].map((c) => {
            const active = (c.slug || undefined) === slug;
            return (
              <li key={c.slug || 'all'}>
                <Link
                  to={c.slug ? `/gallery/${c.slug}` : '/gallery'}
                  className={`chip ${active ? 'is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                  preventScrollReset
                  onClick={() => track('gallery_filter', { category: c.slug || 'all' })}
                >
                  {c.title}
                  {active && <m.span layoutId="chip-underline" className="chip__line" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <LayoutGroup>
        <ul className="masonry container">
          <AnimatePresence mode="popLayout">
            {list.slice(0, count).map((p, i) => (
              <m.li
                key={p.id}
                layout
                className="masonry__item"
                initial={mounted ? { opacity: 0, y: 30 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: (i % BATCH) * 0.04 }}
              >
                <button
                  className="masonry__btn"
                  onClick={() => openAt(i)}
                  aria-label={`Open photo: ${p.alt}`}
                  data-cursor="view"
                >
                  <Img
                    photo={p}
                    priority={i < 3}
                    sizes="(min-width: 1440px) 25vw, (min-width: 1024px) 33vw, (min-width: 480px) 50vw, 100vw"
                    layoutId={`photo-${p.id}`}
                  />
                </button>
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
        <AnimatePresence>
          {open && (
            <Lightbox photos={list} index={open.index} openedAt={open.openedAt} onChange={change} onClose={close} />
          )}
        </AnimatePresence>
      </LayoutGroup>

      <div ref={sentinel} className="container gallery__more">
        {count < list.length && (
          <button className="btn btn--ghost" onClick={() => setCount((c) => c + BATCH)}>
            Load more
          </button>
        )}
      </div>
    </div>
  );
}
