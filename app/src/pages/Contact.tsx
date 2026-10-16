import { m } from 'motion/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { faq, site } from '../lib/content';
import { SUBJECTS, contactSchema, type ContactForm } from '../lib/schema';
import { submitEnquiry } from '../lib/api';
import { waLink } from '../lib/whatsapp';
import { track } from '../lib/analytics';
import { RevealText, FadeUp } from '../components/Reveal';
import { Field, Honeypot, describedBy } from '../components/Field';
import { Turnstile, captchaEnabled } from '../components/Turnstile';
import { Button } from '../components/Button';
import { SocialLinks } from '../components/Social';
import { Accordion } from '../components/Accordion';
import { Arrow, Check, WhatsApp } from '../components/Icons';
import { ease } from '../lib/motion';

type Input = ContactForm;

export default function Contact() {
  const [captcha, setCaptcha] = useState('');
  const [hp, setHp] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [mapOn, setMapOn] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Input, unknown, ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', phone: '', subject: 'General', message: '', consent: false },
    // Validate on change (errors clear immediately, appear after a typing pause) so
    // nothing shifts on blur while the visitor is pressing a button.
    mode: 'onChange',
    delayError: 500,
  });

  async function onValid(data: ContactForm) {
    setServerError(null);
    const res = await submitEnquiry({ type: 'contact', data, captchaToken: captcha || undefined, hp });
    if (res.ok) {
      track('contact_submit', { subject: data.subject });
      return setDone(res.ref);
    }
    setServerError(res.message);
    Object.entries(res.errors ?? {}).forEach(([k, message]) => setError(k as keyof Input, { message }));
  }

  const a = site.address;
  const addressLine = `${a.street}, ${a.city}, ${a.region} ${a.postalCode}`;
  const mapQuery = encodeURIComponent(`${site.name}, ${addressLine}`);

  return (
    <div className="contact">
      <header className="page-head container">
        <p className="eyebrow">Contact</p>
        <RevealText as="h1" className="display" lines={['Say *hello.*']} immediate />
      </header>

      <div className="container contact__layout">
        <div className="contact__info">
          <FadeUp>
            <p className="eyebrow">Write</p>
            <a className="contact__big text-link" href={`mailto:${site.email}`}>{site.email}</a>
          </FadeUp>
          <FadeUp delay={0.05}>
            <p className="eyebrow">Call</p>
            <a className="contact__big text-link" href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a>
          </FadeUp>
          <FadeUp delay={0.1}>
            <Button href={waLink()} icon={<WhatsApp />} onClick={() => track('whatsapp_click', { source: 'contact' })}>
              Chat on WhatsApp
            </Button>
          </FadeUp>
          <FadeUp delay={0.15}>
            <p className="eyebrow">Visit</p>
            <address>{addressLine}</address>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="eyebrow">Hours</p>
            <table className="hours">
              <tbody>
                {site.hours.map((h) => (
                  <tr key={h.days}>
                    <th scope="row">{h.days}</th>
                    <td>{h.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted">{site.appointmentNote}</p>
          </FadeUp>
          <FadeUp delay={0.25}>
            <p className="eyebrow">Follow</p>
            <SocialLinks withLabels />
          </FadeUp>
        </div>

        <div className="contact__form-wrap">
          {done ? (
            <m.div className="contact__done" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: ease.out }}>
              <span className="quote__done-icon"><Check width={28} height={28} /></span>
              <h2 className="h2">Message sent.</h2>
              <p className="lead">Thank you — your reference is <strong>{done}</strong>. We'll reply within 24 hours.</p>
            </m.div>
          ) : (
            <form className="form-grid" onSubmit={handleSubmit(onValid)} noValidate>
              <Honeypot value={hp} onChange={setHp} />
              <Field id="c-name" label="Name" error={errors.name?.message}>
                <input type="text" autoComplete="name" {...register('name')} {...describedBy('c-name', errors.name?.message)} />
              </Field>
              <Field id="c-email" label="Email" error={errors.email?.message}>
                <input type="email" autoComplete="email" {...register('email')} {...describedBy('c-email', errors.email?.message)} />
              </Field>
              <Field id="c-phone" label="Phone" optional error={errors.phone?.message}>
                <input type="tel" autoComplete="tel" {...register('phone')} {...describedBy('c-phone', errors.phone?.message)} />
              </Field>
              <Field id="c-subject" label="Subject">
                <select id="c-subject" {...register('subject')}>
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field id="c-message" label="Message" className="field--full" error={errors.message?.message}>
                <textarea rows={6} maxLength={2000} {...register('message')} {...describedBy('c-message', errors.message?.message)} />
              </Field>
              <label className={`check field--full ${errors.consent ? 'field--error' : ''}`}>
                <input type="checkbox" {...register('consent')} aria-invalid={errors.consent ? true : undefined} />
                <span>
                  I agree that {site.name} may store these details to reply to me, as described in the{' '}
                  <a className="text-link" href="/privacy" target="_blank">privacy policy</a>.
                </span>
              </label>
              <p className="field__error field--full" role="alert">{errors.consent?.message}</p>
              <div className="field--full">
                <Turnstile onToken={setCaptcha} />
              </div>
              {serverError && <p className="form-error field--full" role="alert">{serverError}</p>}
              <div className="field--full">
                <Button type="submit" disabled={isSubmitting || (captchaEnabled && !captcha)} icon={<Arrow />}>
                  {isSubmitting ? 'Sending…' : 'Send message'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      <section className="container section contact__map" aria-label="Map">
        {mapOn ? (
          <iframe
            title={`Map to ${site.name}`}
            src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <button className="map-placeholder" onClick={() => setMapOn(true)} data-cursor="link">
            <span className="map-placeholder__grid" aria-hidden />
            <span className="map-placeholder__pin" aria-hidden />
            <span className="map-placeholder__label">
              <span className="eyebrow">{a.city}</span>
              Load map
            </span>
          </button>
        )}
        <p className="contact__directions">
          <a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noopener noreferrer">
            Open in Google Maps →
          </a>
        </p>
      </section>

      <section className="container section contact__faq" aria-labelledby="faq-title">
        <div className="section__head">
          <p className="eyebrow">Questions</p>
          <RevealText id="faq-title" lines={['Good to *know*']} className="h2" />
        </div>
        <Accordion items={faq} />
      </section>
    </div>
  );
}
