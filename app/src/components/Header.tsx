import { AnimatePresence, m, useMotionValueEvent, useScroll } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { logo, site } from '../lib/content';
import { ease, stagger } from '../lib/motion';
import { SocialLinks } from './Social';
import { useUI } from './UI';

export const NAV = [
  { to: '/', label: 'Home' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/quote', label: 'Quote' },
  { to: '/contact', label: 'Contact' },
];

export function Header() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { lockScroll } = useUI();
  const location = useLocation();

  // Hide on scroll down, reveal on scroll up.
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 160 && !open);
    setScrolled(y > 24);
  });

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    lockScroll(open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, lockScroll]);

  return (
    <>
      <m.header
        className={`header ${scrolled ? 'header--scrolled' : ''} ${open ? 'header--open' : ''}`}
        animate={{ y: hidden ? '-100%' : '0%' }}
        transition={{ duration: 0.45, ease: ease.out }}
      >
        <div className="header__inner container">
          <Link to="/" className="logo" aria-label={`${site.name} — home`}>
            {logo ? (
              // Rendered as a white silhouette so it inverts with the header over any background.
              <picture className="logo__img">
                <source type="image/webp" srcSet={`/images/${logo.id}-logo.webp`} />
                <img src={`/images/${logo.id}-logo.png`} width={logo.w} height={logo.h} alt="" />
              </picture>
            ) : (
              <>
                <span className="logo__mark">{site.shortName}</span>
                <span className="logo__word">Studio</span>
              </>
            )}
          </Link>
          <nav className="nav" aria-label="Main">
            <ul>
              {NAV.map((n) => (
                <li key={n.to}>
                  <NavLink to={n.to} end={n.to === '/'} className="nav__link">
                    {n.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <button
            className="menu-toggle"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
            <span className="menu-toggle__bar" />
            <span className="menu-toggle__bar" />
          </button>
        </div>
      </m.header>

      <AnimatePresence>
        {open && (
          <m.div
            id="mobile-menu"
            className="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.7, ease: ease.inOut }}
          >
            <m.ul
              className="mobile-menu__list"
              initial="hidden"
              animate="shown"
              transition={{ staggerChildren: stagger, delayChildren: 0.3 }}
            >
              {NAV.map((n, i) => (
                <li key={n.to} className="mobile-menu__mask">
                  <m.span
                    style={{ display: 'block' }}
                    variants={{ hidden: { y: '110%' }, shown: { y: '0%' } }}
                    transition={{ duration: 0.8, ease: ease.out }}
                  >
                    <NavLink to={n.to} end={n.to === '/'} className="mobile-menu__link">
                      <span className="mobile-menu__num">0{i + 1}</span>
                      {n.label}
                    </NavLink>
                  </m.span>
                </li>
              ))}
            </m.ul>
            <m.div
              className="mobile-menu__foot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.7 } }}
            >
              <a href={`mailto:${site.email}`}>{site.email}</a>
              <SocialLinks />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
