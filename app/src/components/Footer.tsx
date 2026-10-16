import { Link } from 'react-router';
import { site } from '../lib/content';
import { SocialLinks } from './Social';
import { Arrow } from './Icons';
import { useUI } from './UI';
import { NAV } from './Header';

export function Footer() {
  const { scrollTo } = useUI();
  const a = site.address;
  return (
    <footer className="footer">
      <div className="container">
        <Link to="/quote" className="footer__cta" data-cursor="link">
          <span className="eyebrow">Have a shoot in mind?</span>
          <span className="footer__cta-text">
            Let's work together <Arrow className="footer__cta-arrow" width={40} height={40} />
          </span>
        </Link>
        <div className="footer__grid">
          <div>
            <p className="eyebrow">Studio</p>
            <address>
              {a.street}
              <br />
              {a.city}, {a.region} {a.postalCode}
            </address>
          </div>
          <div>
            <p className="eyebrow">Contact</p>
            <p>
              <a className="text-link" href={`mailto:${site.email}`}>{site.email}</a>
              <br />
              <a className="text-link" href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a>
            </p>
          </div>
          <div>
            <p className="eyebrow">Pages</p>
            <ul className="footer__links">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link className="text-link" to={n.to}>{n.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">Follow</p>
            <SocialLinks withLabels />
          </div>
        </div>
        <p className="footer__wordmark" aria-hidden>
          {site.shortName}
          <em className="accent">studio</em>
        </p>
        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <Link className="text-link" to="/privacy">Privacy</Link>
          {site.googleBusinessUrl && (
            <a className="text-link" href={site.googleBusinessUrl} target="_blank" rel="noopener noreferrer">Google reviews</a>
          )}
          <button className="text-link footer__top" onClick={() => scrollTo(0)}>
            Back to top ↑
          </button>
        </div>
      </div>
    </footer>
  );
}
