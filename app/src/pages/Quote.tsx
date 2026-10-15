import { AnimatePresence, m } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { pricing, categories } from '../lib/content';
import { estimate, formatMoney, formatRange, type ServiceKey } from '../lib/estimate';
import {
  ADDON_KEYS,
  ALBUM_KEYS,
  BUDGET_KEYS,
  LOCATION_KEYS,
  SERVICE_KEYS,
  quoteCrossChecks,
  quoteSchema,
  type QuoteForm,
  type QuoteFormInput,
} from '../lib/schema';
import { quoteMessage, waLink } from '../lib/whatsapp';
import { submitEnquiry } from '../lib/api';
import { track } from '../lib/analytics';
import { load, remove, save } from '../lib/storage';
import { Img } from '../components/Img';
import { Field, Honeypot, describedBy } from '../components/Field';
import { Turnstile, captchaEnabled } from '../components/Turnstile';
import { AnimatedNumber } from '../components/CountUp';
import { RevealText } from '../components/Reveal';
import { Button } from '../components/Button';
import { Arrow, ArrowLeft, Check, WhatsApp } from '../components/Icons';
import { useUI } from '../components/UI';
import { ease } from '../lib/motion';

const DRAFT_KEY = 'ak:quote-draft';
const CONTACT_LABELS = { whatsapp: 'WhatsApp', phone: 'Phone', email: 'Email' } as const;

const STEPS: { title: string; fields: FieldPath<QuoteFormInput>[] }[] = [
  { title: 'Service', fields: ['service'] },
  { title: 'Details', fields: ['date', 'dateFlexible', 'locationType', 'city', 'hours', 'units'] },
  { title: 'Deliverables', fields: ['editedPhotos', 'album', 'addons'] },
  { title: 'Budget & notes', fields: ['budget', 'notes', 'references'] },
  { title: 'Your details', fields: ['name', 'email', 'phone', 'preferredContact', 'consent'] },
  { title: 'Review', fields: [] },
];

const SERVICE_COVER: Partial<Record<ServiceKey, string>> = {
  wedding: 'weddings',
  prewedding: 'weddings',
  portrait: 'portraits',
  fashion: 'fashion',
  product: 'commercial',
  event: 'events',
  maternity: 'maternity',
};

const defaults = {
  service: undefined,
  date: '',
  dateFlexible: false,
  locationType: 'studio',
  city: '',
  hours: 2,
  units: 1,
  editedPhotos: pricing.editedPhotos.included,
  album: 'none',
  addons: [],
  budget: 'unsure',
  notes: '',
  references: '',
  name: '',
  email: '',
  phone: '',
  preferredContact: 'whatsapp',
  consent: false,
} as unknown as QuoteFormInput;

const today = () => new Date().toISOString().slice(0, 10);

export default function Quote() {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [done, setDone] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [hp, setHp] = useState('');
  const { setHideWhatsApp, scrollTo } = useUI();
  const top = useRef<HTMLDivElement>(null);

  const form = useForm<QuoteFormInput, unknown, QuoteForm>({
    resolver: zodResolver(quoteSchema),
    defaultValues: defaults,
    // Validate on change (errors clear immediately, appear after a typing pause) so
    // nothing shifts on blur while the visitor is pressing a button.
    mode: 'onChange',
    delayError: 500,
  });
  const { register, control, trigger, setError, clearErrors, handleSubmit, reset, getValues, setValue, formState: { errors } } = form;
  const values = useWatch({ control }) as Partial<QuoteFormInput>;

  // Restore a saved draft after hydration; keep saving as the visitor types.
  // Saving waits for the restore so the blank first render never overwrites a draft.
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    const draft = load<Partial<QuoteFormInput>>(DRAFT_KEY);
    if (draft) reset({ ...defaults, ...draft, consent: false });
    setRestored(true);
  }, [reset]);
  useEffect(() => {
    if (!restored || done) return;
    const { consent: _c, ...rest } = values;
    save(DRAFT_KEY, rest);
  }, [values, done, restored]);

  useEffect(() => {
    setHideWhatsApp(step === STEPS.length - 1);
    track(`quote_step_${step + 1}`);
  }, [step, setHideWhatsApp]);
  useEffect(() => {
    document.documentElement.classList.add('has-bottom-bar');
    return () => {
      setHideWhatsApp(false);
      document.documentElement.classList.remove('has-bottom-bar');
    };
  }, [setHideWhatsApp]);

  const est = useMemo(() => {
    if (!values.service) return null;
    return estimate({
      service: values.service,
      hours: Number(values.hours) || 1,
      units: Number(values.units) || 1,
      editedPhotos: Number(values.editedPhotos) || 0,
      album: values.album ?? 'none',
      addons: values.addons ?? [],
      locationType: values.locationType ?? 'studio',
    });
  }, [values]);

  const goTo = useCallback(
    (next: number) => {
      setDir(next > step ? 1 : -1);
      setStep(next);
      if (top.current) scrollTo(top.current);
    },
    [step, scrollTo],
  );

  async function next() {
    const fields = STEPS[step].fields;
    const ok = await trigger(fields, { shouldFocus: true });
    const cross = quoteCrossChecks(getValues()).filter((i) => fields.includes(i.path[0] as FieldPath<QuoteFormInput>));
    cross.forEach((i) => setError(i.path[0] as FieldPath<QuoteFormInput>, { message: i.message }, { shouldFocus: true }));
    if (ok && cross.length === 0) goTo(step + 1);
  }

  async function onValid(data: QuoteForm) {
    setSubmitting(true);
    setServerError(null);
    const res = await submitEnquiry({ type: 'quote', data, captchaToken: captcha || undefined, hp });
    setSubmitting(false);
    if (res.ok) {
      track('quote_submit', { service: data.service });
      remove(DRAFT_KEY);
      setDone(res.ref);
      setHideWhatsApp(false);
      if (top.current) scrollTo(top.current);
      return;
    }
    setServerError(res.message);
    if (res.errors) {
      Object.entries(res.errors).forEach(([k, message]) => setError(k as FieldPath<QuoteFormInput>, { message }));
      const firstStep = STEPS.findIndex((s) => s.fields.some((f) => res.errors?.[f]));
      if (firstStep >= 0) goTo(firstStep);
    }
  }

  const onInvalid = () => {
    const firstStep = STEPS.findIndex((s) => s.fields.some((f) => errors[f as keyof typeof errors]));
    if (firstStep >= 0) goTo(firstStep);
  };

  const svc = values.service ? pricing.services[values.service] : null;
  const wa = waLink(quoteMessage(values));

  if (done) {
    return (
      <div className="quote container" ref={top}>
        <m.div className="quote__done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: ease.out }}>
          <span className="quote__done-icon"><Check width={32} height={32} /></span>
          <p className="eyebrow">Request received</p>
          <h1 className="display">Thank you, {getValues('name').split(' ')[0]}.</h1>
          <p className="lead">
            Your reference is <strong>{done}</strong>. We've emailed you a copy and will reply within 24 hours.
          </p>
          <div className="cta__actions">
            <Button to="/gallery" icon={<Arrow />}>Browse the gallery</Button>
            <Button variant="ghost" href={wa} icon={<WhatsApp />} onClick={() => track('whatsapp_click', { source: 'quote_done' })}>
              Follow up on WhatsApp
            </Button>
          </div>
        </m.div>
      </div>
    );
  }

  return (
    <div className="quote container" ref={top}>
      <header className="page-head">
        <p className="eyebrow">Quotation</p>
        <RevealText as="h1" className="display" lines={['Tell us about', 'your shoot.']} immediate />
      </header>

      <ol className="stepper" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s.title} className={`stepper__item ${i === step ? 'is-current' : ''} ${i < step ? 'is-done' : ''}`} aria-current={i === step ? 'step' : undefined}>
            <button type="button" disabled={i > step} onClick={() => goTo(i)}>
              <span className="stepper__num">{String(i + 1).padStart(2, '0')}</span>
              <span className="stepper__title">{s.title}</span>
            </button>
          </li>
        ))}
        <m.li className="stepper__progress" aria-hidden animate={{ scaleX: (step + 1) / STEPS.length }} transition={{ duration: 0.6, ease: ease.out }} />
      </ol>

      <div className="quote__layout">
        <form className="quote__form" onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
          <Honeypot value={hp} onChange={setHp} />
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <m.fieldset
              key={step}
              className="quote__step"
              custom={dir}
              variants={{
                enter: (d: number) => ({ x: d * 60, opacity: 0 }),
                center: { x: 0, opacity: 1 },
                exit: (d: number) => ({ x: d * -60, opacity: 0 }),
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: ease.out }}
            >
              <legend className="h3">
                <span className="quote__step-num">{String(step + 1).padStart(2, '0')}</span> {STEPS[step].title}
              </legend>

              {step === 0 && (
                <div className="service-grid" role="radiogroup" aria-label="Type of shoot">
                  {SERVICE_KEYS.map((k) => {
                    const cover = categories.find((c) => c.slug === SERVICE_COVER[k])?.cover;
                    return (
                      <label key={k} className={`service-card ${values.service === k ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          value={k}
                          {...register('service', { onChange: () => setValue('units', pricing.services[k].defaultUnits) })}
                          className="visually-hidden"
                        />
                        <span className="service-card__img">{cover ? <Img photo={cover} sizes="240px" cover /> : <span className="service-card__blank">+</span>}</span>
                        <span className="service-card__label">{pricing.services[k].label}</span>
                        {values.service === k && <m.span layoutId="service-check" className="service-card__check"><Check width={16} height={16} /></m.span>}
                      </label>
                    );
                  })}
                  <p className="field__error" role="alert">{errors.service?.message}</p>
                </div>
              )}

              {step === 1 && (
                <div className="form-grid">
                  <Field id="date" label="Date" error={errors.date?.message}>
                    <input type="date" min={today()} disabled={values.dateFlexible} {...register('date', { onChange: () => clearErrors('date') })} {...describedBy('date', errors.date?.message)} />
                  </Field>
                  <label className="check field--inline">
                    <input type="checkbox" {...register('dateFlexible', { onChange: () => clearErrors('date') })} />
                    <span>Not fixed yet</span>
                  </label>
                  <fieldset className="field field--full">
                    <legend className="field__label">Location</legend>
                    <div className="segmented">
                      {LOCATION_KEYS.map((k) => (
                        <label key={k} className={values.locationType === k ? 'is-selected' : ''}>
                          <input type="radio" value={k} {...register('locationType')} className="visually-hidden" />
                          {pricing.locationMultiplier[k].label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Field id="city" label="City" optional error={errors.city?.message}>
                    <input type="text" autoComplete="address-level2" {...register('city')} {...describedBy('city', errors.city?.message)} />
                  </Field>
                  <Field id="hours" label="Duration (hours)" error={errors.hours?.message} hint={svc && svc.includedHours ? `${svc.includedHours} h included in the base package` : undefined}>
                    <input type="number" inputMode="numeric" min={1} max={16} {...register('hours')} {...describedBy('hours', errors.hours?.message)} />
                  </Field>
                  <Field id="units" label={`Number of ${svc?.unitLabel ?? 'people'}`} error={errors.units?.message}>
                    <input type="number" inputMode="numeric" min={1} {...register('units')} {...describedBy('units', errors.units?.message)} />
                  </Field>
                </div>
              )}

              {step === 2 && (
                <div className="form-grid">
                  <Field id="editedPhotos" label={`Edited photos: ${values.editedPhotos}`} className="field--full" hint={`${pricing.editedPhotos.included} included`}>
                    <input
                      type="range"
                      min={50}
                      max={pricing.editedPhotos.max}
                      step={pricing.editedPhotos.step}
                      {...register('editedPhotos')}
                      {...describedBy('editedPhotos', undefined, true)}
                    />
                  </Field>
                  <fieldset className="field field--full">
                    <legend className="field__label">Album</legend>
                    <div className="segmented">
                      {ALBUM_KEYS.map((k) => (
                        <label key={k} className={values.album === k ? 'is-selected' : ''}>
                          <input type="radio" value={k} {...register('album')} className="visually-hidden" />
                          {pricing.albums[k].label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="field field--full">
                    <legend className="field__label">Add-ons</legend>
                    <div className="checks">
                      {ADDON_KEYS.map((k) => (
                        <label key={k} className="check">
                          <input type="checkbox" value={k} {...register('addons')} />
                          <span>{pricing.addons[k].label}</span>
                          {pricing.showPrices && <span className="check__price">+{formatMoney(pricing.addons[k].price)}</span>}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}

              {step === 3 && (
                <div className="form-grid">
                  <Field id="budget" label="Budget" className="field--full">
                    <select {...register('budget')} id="budget">
                      {BUDGET_KEYS.map((k) => (
                        <option key={k} value={k}>{pricing.budgets[k]}</option>
                      ))}
                    </select>
                  </Field>
                  <Field id="notes" label="Your brief" optional className="field--full" error={errors.notes?.message} hint="The story, the mood, anything we should know.">
                    <textarea rows={5} maxLength={2000} {...register('notes')} {...describedBy('notes', errors.notes?.message, true)} />
                  </Field>
                  <Field id="references" label="Reference links" optional className="field--full" error={errors.references?.message} hint="Pinterest boards, Instagram posts, mood boards…">
                    <textarea rows={2} maxLength={500} {...register('references')} {...describedBy('references', errors.references?.message, true)} />
                  </Field>
                </div>
              )}

              {step === 4 && (
                <div className="form-grid">
                  <Field id="name" label="Name" error={errors.name?.message}>
                    <input type="text" autoComplete="name" {...register('name')} {...describedBy('name', errors.name?.message)} />
                  </Field>
                  <Field id="email" label="Email" error={errors.email?.message}>
                    <input type="email" autoComplete="email" {...register('email')} {...describedBy('email', errors.email?.message)} />
                  </Field>
                  <Field id="phone" label="Phone" error={errors.phone?.message} hint="Include your country code, e.g. +91" optional={values.preferredContact === 'email'}>
                    <input type="tel" autoComplete="tel" placeholder={pricing.locale === 'en-IN' ? '+91 ' : ''} {...register('phone', { onChange: () => clearErrors('phone') })} {...describedBy('phone', errors.phone?.message, true)} />
                  </Field>
                  <fieldset className="field">
                    <legend className="field__label">Preferred contact</legend>
                    <div className="segmented">
                      {(['whatsapp', 'phone', 'email'] as const).map((k) => (
                        <label key={k} className={values.preferredContact === k ? 'is-selected' : ''}>
                          <input type="radio" value={k} {...register('preferredContact', { onChange: () => clearErrors('phone') })} className="visually-hidden" />
                          {CONTACT_LABELS[k]}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className={`check field--full ${errors.consent ? 'field--error' : ''}`}>
                    <input type="checkbox" {...register('consent')} aria-invalid={errors.consent ? true : undefined} />
                    <span>
                      I agree that AK Studio may store these details to reply to my enquiry, as described in the <a className="text-link" href="/privacy" target="_blank">privacy policy</a>.
                    </span>
                  </label>
                  <p className="field__error" role="alert">{errors.consent?.message}</p>
                </div>
              )}

              {step === 5 && <Review values={values} est={est} />}
            </m.fieldset>
          </AnimatePresence>

          {step === STEPS.length - 1 && <Turnstile onToken={setCaptcha} />}
          {serverError && <p className="form-error" role="alert">{serverError}</p>}

          <div className="quote__nav">
            {step > 0 && (
              <button type="button" className="btn btn--text" onClick={() => goTo(step - 1)}>
                <ArrowLeft /> Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={next} icon={<Arrow />}>Continue</Button>
            ) : (
              <>
                <Button type="submit" disabled={submitting || (captchaEnabled && !captcha)} icon={<Arrow />}>
                  {submitting ? 'Sending…' : 'Request quote'}
                </Button>
                <Button variant="ghost" href={wa} icon={<WhatsApp />} onClick={() => track('whatsapp_click', { source: 'quote' })}>
                  Send via WhatsApp
                </Button>
              </>
            )}
          </div>
        </form>

        <aside className="estimate" aria-live="polite">
          <p className="eyebrow">Estimate</p>
          {!pricing.showPrices ? (
            <p className="estimate__note">We'll send a tailored quote after reviewing your brief.</p>
          ) : est ? (
            <p className="estimate__value display">
              <AnimatedNumber value={est.min} format={(n) => formatMoney(n)} />
              <span className="estimate__dash"> – </span>
              <AnimatedNumber value={est.max} format={(n) => formatMoney(n)} />
            </p>
          ) : (
            <p className="estimate__value estimate__value--empty display">{values.service === 'other' ? 'Custom quote' : '—'}</p>
          )}
          {svc && <p className="estimate__service">{svc.label}{values.locationType ? ` · ${pricing.locationMultiplier[values.locationType].label}` : ''}</p>}
          <p className="estimate__note">{pricing.note}</p>
        </aside>
      </div>
    </div>
  );
}

function Review({ values: v, est }: { values: Partial<QuoteFormInput>; est: ReturnType<typeof estimate> }) {
  const p = pricing;
  const rows: [string, string][] = [
    ['Service', v.service ? p.services[v.service].label : '—'],
    ['Date', v.dateFlexible || !v.date ? 'Not fixed yet' : v.date],
    ['Location', [v.locationType && p.locationMultiplier[v.locationType].label, v.city].filter(Boolean).join(' · ')],
    ['Duration', `${v.hours} h · ${v.units} ${v.service ? p.services[v.service].unitLabel : ''}`],
    ['Edited photos', String(v.editedPhotos)],
    ['Album', v.album ? p.albums[v.album].label : '—'],
    ['Add-ons', (v.addons ?? []).map((a) => p.addons[a].label).join(', ') || 'None'],
    ['Budget', v.budget ? p.budgets[v.budget as keyof typeof p.budgets] : '—'],
    ['Brief', v.notes || '—'],
    ['References', v.references || '—'],
    ['Name', v.name ?? ''],
    ['Email', v.email ?? ''],
    ['Phone', v.phone || '—'],
    ['Preferred contact', CONTACT_LABELS[v.preferredContact ?? 'email']],
  ];
  if (p.showPrices) rows.push(['Estimate', formatRange(est)]);
  return (
    <dl className="review">
      {rows.map(([k, val]) => (
        <div key={k} className="review__row">
          <dt>{k}</dt>
          <dd>{val}</dd>
        </div>
      ))}
    </dl>
  );
}
