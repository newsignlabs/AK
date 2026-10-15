import { AnimatePresence, m, useMotionValue, useSpring } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Img } from '../components/Img';
import { FadeUp, Parallax, RevealImage, RevealText, ScrollWords } from '../components/Reveal';
import { Button, TextLink } from '../components/Button';
import { Marquee } from '../components/Marquee';
import { CountUp } from '../components/CountUp';
import { Arrow, WhatsApp, ArrowLeft } from '../components/Icons';
import { categories, featuredPhotos, getPhoto, instagram, services, site, testimonials } from '../lib/content';
import { waLink } from '../lib/whatsapp';
import { track } from '../lib/analytics';
import { useFinePointer } from '../lib/hooks';
import { ease } from '../lib/motion';

export default function Home() {
  return (
    <>
      <Hero />
      <section className="section container intro" aria-label="Our philosophy">
        <p className="eyebrow">(01) — Studio</p>
        <ScrollWords text="We make calm, considered photographs of weddings, people and the things they make. Less direction, more attention. Images that feel the way the moment felt." />
      </section>
      <SelectedWork />
      <Services />
      <About />
      <Process />
      <Testimonials />
      <Marquee items={site.marquee} />
      <InstagramStrip />
      <Cta />
    </>
  );
}

function Hero() {
  const [first, ...rest] = site.tagline.split(' ');
  const lines = [first + ' ' + rest.slice(0, 1).join(' '), rest.slice(1).join(' ')].filter(Boolean);
  return (
    <section className="hero">
      <Parallax className="hero__media" speed={0.08}>
        <Img photo="hero" priority sizes="100vw" cover />
      </Parallax>
      <div className="hero__shade" aria-hidden />
      <div className="hero__content container">
        <m.p
          className="eyebrow hero__eyebrow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          {site.name} — Photography
        </m.p>
        <RevealText as="h1" className="display hero__title" lines={lines} immediate delay={0.2} />
        <m.div
          className="hero__cue"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <span>Scroll</span>
          <span className="hero__cue-line" aria-hidden />
        </m.div>
      </div>
    </section>
  );
}

function SelectedWork() {
  const items = featuredPhotos.slice(0, 7);
  return (
    <section className="section container work" aria-labelledby="work-title">
      <div className="section__head">
        <p className="eyebrow">(02) — Selected work</p>
        <RevealText id="work-title" lines={['A few frames', 'we keep returning to.']} className="h2" />
      </div>
      <div className="work__grid">
        {items.map((p, i) => {
          const cat = categories.find((c) => c.slug === p.category);
          return (
            <Link key={p.id} to={`/gallery/${p.category}`} className={`work__item work__item--${i % 7}`} data-cursor="view">
              <RevealImage>
                <Img photo={p} sizes="(min-width: 1024px) 40vw, 90vw" cover />
              </RevealImage>
              <span className="work__label">
                <span>{cat?.title}</span>
                <span>{String(i + 1).padStart(2, '0')}</span>
              </span>
            </Link>
          );
        })}
      </div>
      <div className="section__foot">
        <TextLink to="/gallery">View full gallery →</TextLink>
      </div>
    </section>
  );
}

function Services() {
  const fine = useFinePointer();
  const [active, setActive] = useState<number | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 25 });
  const sy = useSpring(y, { stiffness: 200, damping: 25 });
  const coverFor = (slug: string) => categories.find((c) => c.slug === slug)?.cover;

  return (
    <section
      className="section container services"
      aria-labelledby="services-title"
      onPointerMove={(e) => {
        x.set(e.clientX);
        y.set(e.clientY);
      }}
    >
      <div className="section__head">
        <p className="eyebrow">(03) — Services</p>
        <RevealText id="services-title" lines={['What we photograph']} className="h2" />
      </div>
      <ol className="services__list">
        {services.map((s, i) => (
          <FadeUp as="li" key={s.slug} delay={i * 0.05}>
            <Link
              to={`/gallery/${s.slug}`}
              className="services__row"
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
            >
              <span className="services__num">{String(i + 1).padStart(2, '0')}</span>
              <span className="services__name">{s.name}</span>
              <span className="services__blurb">{s.blurb}</span>
              <Arrow className="services__arrow" />
            </Link>
          </FadeUp>
        ))}
      </ol>
      {fine && (
        <m.div className="services__preview" style={{ x: sx, y: sy }} aria-hidden>
          <AnimatePresence>
            {active !== null && coverFor(services[active].slug) && (
              <m.div
                key={active}
                className="services__preview-img"
                initial={{ opacity: 0, scale: 0.85, rotate: -3 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.35, ease: ease.out }}
              >
                <Img photo={coverFor(services[active].slug)!} sizes="280px" cover />
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      )}
    </section>
  );
}

function About() {
  return (
    <section className="section container about" aria-labelledby="about-title">
      <div className="about__media">
        <RevealImage>
          <Img photo={site.about.portraitId} sizes="(min-width: 1024px) 40vw, 90vw" />
        </RevealImage>
      </div>
      <div className="about__body">
        <p className="eyebrow">(04) — About</p>
        <RevealText id="about-title" lines={[site.about.heading]} className="h2" />
        {site.about.body.map((p, i) => (
          <FadeUp as="p" key={i} delay={0.1 * i} className="lead">
            {p}
          </FadeUp>
        ))}
        <dl className="stats">
          {site.stats.map((s) => (
            <FadeUp key={s.label} className="stats__item">
              <dt>{s.label}</dt>
              <dd className="display">
                <CountUp to={s.value} suffix={s.suffix} />
              </dd>
            </FadeUp>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Process() {
  return (
    <section className="section container process" aria-labelledby="process-title">
      <div className="section__head">
        <p className="eyebrow">(05) — Process</p>
        <RevealText id="process-title" lines={['How we work']} className="h2" />
      </div>
      <ol className="process__list">
        {site.process.map((s, i) => (
          <FadeUp as="li" key={s.title} delay={i * 0.08} className="process__step">
            <span className="process__num">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="h3">{s.title}</h3>
            <p>{s.text}</p>
          </FadeUp>
        ))}
      </ol>
    </section>
  );
}

function Testimonials() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = testimonials.length;
  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => setI((v) => (v + 1) % n), 6000);
    return () => window.clearInterval(t);
  }, [paused, n]);
  const t = testimonials[i];
  return (
    <section
      className="section container testimonials"
      aria-roledescription="carousel"
      aria-label="Client testimonials"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p className="eyebrow">(06) — Kind words</p>
      <div className="testimonials__stage" aria-live={paused ? 'polite' : 'off'}>
        <AnimatePresence mode="wait">
          <m.figure
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.6, ease: ease.out }}
          >
            <blockquote className="display testimonials__quote">“{t.quote}”</blockquote>
            <figcaption>
              <strong>{t.name}</strong> — {t.role}
            </figcaption>
          </m.figure>
        </AnimatePresence>
      </div>
      <div className="testimonials__controls">
        <button className="icon-btn" onClick={() => setI((i - 1 + n) % n)} aria-label="Previous testimonial">
          <ArrowLeft />
        </button>
        <span className="testimonials__count">
          {String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
        </span>
        <button className="icon-btn" onClick={() => setI((i + 1) % n)} aria-label="Next testimonial">
          <Arrow />
        </button>
      </div>
    </section>
  );
}

function InstagramStrip() {
  const handle = site.socials.instagram?.split('/').filter(Boolean).pop();
  if (!site.socials.instagram || instagram.length === 0) return null;
  return (
    <section className="section instagram" aria-labelledby="ig-title">
      <div className="container section__head section__head--row">
        <h2 id="ig-title" className="eyebrow">On Instagram</h2>
        <a className="text-link" href={site.socials.instagram} target="_blank" rel="noopener noreferrer" onClick={() => track('social_click', { network: 'instagram' })}>
          @{handle}
        </a>
      </div>
      <ul className="instagram__grid">
        {instagram.slice(0, 6).map((item, i) => (
          <FadeUp as="li" key={item.photoId} delay={i * 0.05}>
            <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Instagram post: ${getPhoto(item.photoId).alt}`} data-cursor="view">
              <Img photo={item.photoId} sizes="(min-width: 1024px) 16vw, 33vw" cover />
            </a>
          </FadeUp>
        ))}
      </ul>
    </section>
  );
}

function Cta() {
  return (
    <section className="section container cta">
      <RevealText lines={["Let's create", 'something.']} className="display cta__title" />
      <FadeUp className="cta__actions">
        <Button to="/quote" icon={<Arrow />}>Get a quote</Button>
        <Button
          variant="ghost"
          href={waLink()}
          icon={<WhatsApp />}
          onClick={() => track('whatsapp_click', { source: 'home_cta' })}
        >
          Chat on WhatsApp
        </Button>
      </FadeUp>
    </section>
  );
}
