import { AnimatePresence, LazyMotion, MotionConfig, m } from 'motion/react';
import { Suspense, useEffect, useRef, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router';
import { Header, NAV } from './components/Header';
import { Footer } from './components/Footer';
import { Preloader } from './components/Preloader';
import { Cursor } from './components/Cursor';
import { WhatsAppButton } from './components/WhatsAppButton';
import { UIProvider, useUI } from './components/UI';
import { useDocumentTitle } from './lib/meta';
import { useReducedMotionPref } from './lib/hooks';
import { ease } from './lib/motion';
import { loadAnalytics } from './lib/analytics';
import { lazyWithPreload } from './lib/lazy';
import Home from './pages/Home';
import Gallery from './pages/Gallery';

// Form pages carry zod + react-hook-form; load them only when visited.
const Quote = lazyWithPreload(() => import('./pages/Quote'));
const Contact = lazyWithPreload(() => import('./pages/Contact'));

/** Loads the code-split page for a path (before hydration / prerendering). */
export function preloadRoute(path: string): Promise<void> {
  if (path.startsWith('/quote')) return Quote.preload();
  if (path.startsWith('/contact')) return Contact.preload();
  return Promise.resolve();
}
import Privacy from './pages/Privacy';
import NotFound from './pages/NotFound';

const loadFeatures = () => import('./lib/motion-features').then((r) => r.default);

/** Gallery category changes stay on the same "page" so they animate in place. */
const pageKey = (path: string) => '/' + (path.split('/')[1] ?? '');
const labelFor = (key: string) => NAV.find((n) => n.to === key)?.label ?? (key === '/privacy' ? 'Privacy' : '');

/** M2 — full-screen panel sweeps up over the old page and out over the new one. */
function TransitionPanel({ k }: { k: string }) {
  const first = useRef(true);
  const [run, setRun] = useState<{ id: number; label: string } | null>(null);
  const reduced = useReducedMotionPref();

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setRun((r) => ({ id: (r?.id ?? 0) + 1, label: labelFor(k) }));
  }, [k]);

  if (!run) return null;
  return (
    <m.div
      key={run.id}
      className="page-panel"
      aria-hidden
      initial={reduced ? { opacity: 0 } : { y: '100%' }}
      animate={reduced ? { opacity: [0, 1, 1, 0] } : { y: ['100%', '0%', '0%', '-100%'] }}
      transition={{ duration: reduced ? 0.5 : 1, times: [0, 0.42, 0.58, 1], ease: ease.inOut }}
      onAnimationComplete={() => setRun(null)}
    >
      <m.span
        className="page-panel__label"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: [0, 1, 1, 0], y: [20, 0, 0, -20] }}
        transition={{ duration: reduced ? 0.5 : 1, times: [0.2, 0.42, 0.62, 0.8] }}
      >
        {run.label}
      </m.span>
    </m.div>
  );
}

function Shell() {
  const location = useLocation();
  const key = pageKey(location.pathname);
  const { scrollTo } = useUI();
  const reduced = useReducedMotionPref();
  useDocumentTitle(location.pathname);
  useEffect(() => {
    document.documentElement.classList.replace('no-js', 'js');
    loadAnalytics();
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Preloader />
      <Cursor />
      <Header />
      <AnimatePresence mode="wait" initial={false} onExitComplete={() => scrollTo(0, true)}>
        <m.main
          key={key}
          id="main"
          tabIndex={-1}
          // Hold the old page while the panel covers it.
          exit={{ opacity: reduced ? 0 : 0.99, transition: { duration: reduced ? 0.2 : 0.42 } }}
        >
          <Suspense fallback={<div className="page-loading" aria-busy="true" />}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/gallery/:slug" element={<Gallery />} />
            <Route path="/quote" element={<Quote />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </m.main>
      </AnimatePresence>
      <TransitionPanel k={key} />
      <Footer />
      <WhatsAppButton />
    </>
  );
}

export default function App() {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        <UIProvider>
          <Shell />
        </UIProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
