import { m } from 'motion/react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Img } from '../components/Img';
import { FadeUp, Hang, RevealText, ScrollWords, SlideLabel } from '../components/Reveal';
import { Button, TextLink } from '../components/Button';
import { Marquee } from '../components/Marquee';
import { CountUp } from '../components/CountUp';
import { Arrow, WhatsApp } from '../components/Icons';
import { Depth, Room, Walk, useWalk } from '../components/Walk';
import { categories, featuredPhotos, galleryPhotos, getPhoto, instagram, mascot, services, site, testimonials } from '../lib/content';
import { waLink } from '../lib/whatsapp';
import { track } from '../lib/analytics';
import { accent } from '../lib/rich';
import { ease } from '../lib/motion';

/**
 * Home is an exhibition: a walk through rooms. On desktop the rooms slide
 * sideways as you scroll (see Walk); on tablets and phones they stack.
 */
const ROOMS = [
  { id: 'entrance', label: 'Entrance' },
  { id: 'statement', label: 'The studio' },
  { id: 'works', label: 'Selected works' },
  { id: 'services', label: 'Services' },
  { id: 'artist', label: 'The artist' },
  { id: 'process', label: 'Process' },
  { id: 'guestbook', label: 'Guestbook' },
  ...(site.socials.instagram && instagram.length ? [{ id: 'instagram', label: 'Instagram' }] : []),
  { id: 'exit', label: 'Exit' },
];

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export default function Home() {
  return (
    <>
      <Walk rooms={ROOMS}>
        <Entrance />
        <Statement />
        <Works />
        <Services />
        <Artist />
        <Process />
        <Guestbook />
        <InstagramRoom />
        <Exit />
      </Walk>
      <Marquee items={site.marquee} />
    </>
  );
}

/** Room plaque: "Room 03" label, title, optional link. */
function Plaque({ n, title, id, children }: { n: number; title: string; id: string; children?: ReactNode }) {
  return (
    <div className="plaque">
      <Depth depth={0.18} className="plaque__num-layer">
        <span className="plaque__num" aria-hidden>
          {pad(n)}
        </span>
      </Depth>
      <p className="eyebrow">Room {pad(n)}</p>
      <RevealText id={id} lines={[title]} className="h2 plaque__title" />
      {children}
    </div>
  );
}

function Entrance() {
  const [first, ...rest] = site.tagline.split(' ');
  const lines = [first + ' ' + rest.slice(0, 1).join(' '), rest.slice(1).join(' ')].filter(Boolean);
  const walk = useWalk();
  return (
    <Room id="entrance" label="Entrance">
      <Depth depth={0.3} className="entrance__media">
        <Img photo={site.heroId} priority sizes="100vw" cover />
      </Depth>
      <div className="entrance__shade" aria-hidden />
      <div className="entrance__frame" aria-hidden>
        <span className="crop crop--tl" />
        <span className="crop crop--tr" />
        <span className="crop crop--bl" />
        <span className="crop crop--br" />
      </div>
      <div className="entrance__card glass">
        <p className="eyebrow">
          {site.name} — An exhibition of photographs · {pad(galleryPhotos.length, 3)} works
        </p>
        <RevealText as="h1" className="display entrance__title" lines={lines} immediate delay={0.5} />
        <m.p
          className="entrance__meta"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.8 }}
        >
          <span>
            {site.address.city}, {site.address.country}
          </span>
          <span>Est. {site.established}</span>
          <span className="entrance__services">{site.marquee.slice(0, 3).join(' · ')}</span>
        </m.p>
      </div>
      <m.p
        className="entrance__cue"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.8 }}
        aria-hidden
      >
        {walk?.on ? 'Scroll to walk through' : 'Scroll'} <span className="entrance__cue-line" />
      </m.p>
      <div className="doors" aria-hidden>
        <span className="doors__panel" />
        <span className="doors__panel" />
      </div>
    </Room>
  );
}

const STATEMENT =
  'We make calm, considered photographs of weddings, people and the things they make. Less direction, more attention. Images that feel the way the moment felt.';

function Statement() {
  const walk = useWalk();
  return (
    <Room id="statement" label="The studio">
      <div className={`statement__badge ${mascot ? 'statement__badge--mascot' : ''}`}>
        <span className="statement__num" aria-hidden>
          01
        </span>
        {mascot && <span className="statement__glow" aria-hidden />}
        {mascot && (
          // Brand mascot floating in front of the "01" (own colours, not greyscale).
          <picture className="statement__mascot">
            <source type="image/webp" srcSet={`/images/${mascot.id}-mascot.webp`} />
            <img src={`/images/${mascot.id}-mascot.png`} width={mascot.w} height={mascot.h} alt="" loading="lazy" decoding="async" />
          </picture>
        )}
      </div>
      <div className="statement__body">
        <p className="eyebrow">Room 01 — The studio</p>
        {walk?.on ? (
          // While walking, the words light up as the room arrives.
          <m.p
            className="scroll-words"
            initial="hidden"
            whileInView="shown"
            viewport={{ once: true, amount: 0.4 }}
            transition={{ staggerChildren: 0.035 }}
          >
            {STATEMENT.split(' ').map((w, i) => (
              <m.span key={i} variants={{ hidden: { opacity: 0.15 }, shown: { opacity: 1 } }} transition={{ duration: 0.5 }}>
                {w}{' '}
              </m.span>
            ))}
          </m.p>
        ) : (
          <ScrollWords text={STATEMENT} />
        )}
      </div>
    </Room>
  );
}

function Works() {
  const items = featuredPhotos.slice(0, 7);
  return (
    <Room id="works" label="Selected works" labelledBy="works-title">
      <Plaque n={2} title="Selected *works*" id="works-title">
        <FadeUp className="plaque__text">
          <p>A few frames we keep returning to. Hover a print to see it in colour.</p>
          <TextLink to="/gallery">Visit the full gallery →</TextLink>
        </FadeUp>
      </Plaque>
      <ol className="wall">
        {items.map((p, i) => {
          const cat = categories.find((c) => c.slug === p.category);
          return (
            <li
              key={p.id}
              className={`wall__item wall__item--${i % 4} ${p.w > p.h ? 'is-landscape' : 'is-portrait'}`}
              style={{ ['--ar' as string]: (p.w / p.h).toFixed(4) }}
            >
              <Hang delay={0.05 * (i % 3)} tilt={i % 2 ? 4 : -5}>
                <Link to={`/gallery/${p.category}`} className="frame wall__frame" data-cursor="view" aria-label={`${cat?.title ?? ''}: ${p.alt}`}>
                  <Img photo={p} sizes="(min-width: 1024px) 40vw, 90vw" />
                </Link>
              </Hang>
              <SlideLabel className="label glass wall__label">
                <span className="label__no">No. {pad(i + 1, 3)}</span>
                <strong>{p.caption || cat?.title}</strong>
                <span>
                  {cat?.title} · {p.w > p.h ? 'Landscape' : 'Portrait'}
                </span>
              </SlideLabel>
            </li>
          );
        })}
      </ol>
    </Room>
  );
}

function Services() {
  const coverFor = (slug: string) => categories.find((c) => c.slug === slug)?.cover;
  return (
    <Room id="services" label="Services" labelledBy="services-title">
      <Plaque n={3} title="What we *photograph*" id="services-title" />
      <ol className="plaques">
        {services.map((s, i) => {
          const cover = coverFor(s.slug);
          return (
            <FadeUp as="li" key={s.slug} delay={0.06 * i} className="plaques__item">
              <Link to={`/gallery/${s.slug}`} className="plaques__card glass bloom">
                {cover && (
                  <span className="plaques__img">
                    <Img photo={cover} sizes="(min-width: 1024px) 14vw, 40vw" cover />
                  </span>
                )}
                <span className="plaques__num">{pad(i + 1)}</span>
                <span className="plaques__name">{s.name}</span>
                <span className="plaques__blurb">{s.blurb}</span>
                <Arrow className="plaques__arrow" />
              </Link>
            </FadeUp>
          );
        })}
      </ol>
    </Room>
  );
}

function Artist() {
  const portrait = getPhoto(site.about.portraitId);
  return (
    <Room id="artist" label="The artist" labelledBy="about-title">
      <div className="artist__portrait" style={{ ['--ar' as string]: (portrait.w / portrait.h).toFixed(4) }}>
        <Hang tilt={3}>
          <div className="frame bloom">
            <Img photo={site.about.portraitId} sizes="(min-width: 1024px) 30vw, 90vw" />
          </div>
        </Hang>
        <SlideLabel className="label glass">
          <span className="label__no">Portrait</span>
          <strong>{site.name}</strong>
          <span>{site.address.city}</span>
        </SlideLabel>
      </div>
      <div className="artist__panel glass glass--strong">
        <p className="eyebrow">Room 04 — The artist</p>
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
    </Room>
  );
}

function Process() {
  return (
    <Room id="process" label="Process" labelledBy="process-title">
      <Plaque n={5} title="How we *work*" id="process-title" />
      <ol className="timeline">
        <m.span
          className="timeline__line"
          aria-hidden
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: ease.inOut }}
        />
        {site.process.map((s, i) => (
          <FadeUp as="li" key={s.title} delay={0.25 + i * 0.15} className="timeline__step glass">
            <span className="timeline__dot" aria-hidden />
            <span className="timeline__num">{pad(i + 1)}</span>
            <h3 className="h3">{s.title}</h3>
            <p>{s.text}</p>
          </FadeUp>
        ))}
      </ol>
    </Room>
  );
}

function Guestbook() {
  return (
    <Room id="guestbook" label="Guestbook" labelledBy="guestbook-title">
      <Plaque n={6} title="The *guestbook*" id="guestbook-title" />
      <ul className="guestbook">
        {testimonials.map((t, i) => (
          <FadeUp as="li" key={i} delay={0.08 * i} className="guestbook__entry glass">
            <span className="guestbook__mark" aria-hidden>
              “
            </span>
            <blockquote>{t.quote}</blockquote>
            <p className="guestbook__by">
              <strong>{t.name}</strong>
              <span>{t.role}</span>
            </p>
          </FadeUp>
        ))}
      </ul>
    </Room>
  );
}

function InstagramRoom() {
  const handle = site.socials.instagram?.split('/').filter(Boolean).pop();
  if (!site.socials.instagram || instagram.length === 0) return null;
  return (
    <Room id="instagram" label="Instagram" labelledBy="ig-title">
      <Plaque n={7} title="On *Instagram*" id="ig-title">
        <FadeUp className="plaque__text">
          <a
            className="text-link"
            href={site.socials.instagram}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('social_click', { network: 'instagram' })}
          >
            @{handle} ↗
          </a>
        </FadeUp>
      </Plaque>
      <ul className="insta">
        {instagram.slice(0, 6).map((item, i) => (
          <li key={item.photoId}>
            <Hang delay={0.06 * i} tilt={i % 2 ? 3 : -3}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram post: ${getPhoto(item.photoId).alt}`}
                className="frame insta__frame"
                data-cursor="view"
              >
                <span className="insta__img">
                  <Img photo={item.photoId} sizes="(min-width: 1024px) 16vw, 33vw" cover />
                </span>
              </a>
            </Hang>
          </li>
        ))}
      </ul>
    </Room>
  );
}

function Exit() {
  return (
    <Room id="exit" label="Exit">
      <div className="exit__panel">
        <p className="eyebrow">Exit — Thank you for visiting</p>
        <RevealText lines={["Let's create", '*something.*']} className="display exit__title" />
        <FadeUp className="exit__actions">
          <Button to="/quote" icon={<Arrow />}>
            Get a quote
          </Button>
          <Button
            variant="ghost"
            href={waLink()}
            icon={<WhatsApp />}
            onClick={() => track('whatsapp_click', { source: 'home_cta' })}
          >
            Chat on WhatsApp
          </Button>
        </FadeUp>
        <p className="exit__note">{accent(site.tagline)}</p>
      </div>
    </Room>
  );
}
