'use strict';

const crypto = require('node:crypto');
const { enquirySchema, fieldErrors, estimate, formatRange, quoteMessage, waLink, pricing, site } = require('./lib/shared');
const { studioEmail, clientEmail } = require('./mail');

const MAX_BODY = 32 * 1024;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('too large'), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function makeRef(type, now) {
  const prefix = type === 'quote' ? 'AKQ' : 'AKC';
  const rand = crypto.randomInt(36 ** 4).toString(36).toUpperCase().padStart(4, '0');
  return `${prefix}-${now.getUTCFullYear()}-${rand}`;
}

/**
 * Builds the request handler. Catalyst services, env and fetch are injected so
 * the logic can be tested without the Catalyst runtime.
 */
function createHandler({ env, fetch, services, now = () => new Date(), log = console }) {
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const limit = Number(env.RATE_LIMIT_PER_HOUR || 5);

  return async function handle(req, res) {
    const origin = req.headers.origin;
    const headers = { 'Content-Type': 'application/json', Vary: 'Origin' };
    if (origin && allowed.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type';
      headers['Access-Control-Max-Age'] = '86400';
    }
    const send = (status, body) => {
      res.writeHead(status, headers);
      res.end(body === undefined ? '' : JSON.stringify(body));
    };

    if (req.method === 'OPTIONS') return send(204);
    if (req.method !== 'POST') return send(405, { error: 'method_not_allowed' });
    if (origin && allowed.length && !allowed.includes(origin)) return send(403, { error: 'origin_not_allowed' });

    let json;
    try {
      json = JSON.parse(await readBody(req));
    } catch (err) {
      return send(err.status || 400, { error: err.status ? 'too_large' : 'invalid_json' });
    }

    const svc = services(req);
    const ip = clientIp(req);

    // Rate limit: N submissions per IP per hour (IP stored only as a hash).
    const rlKey = 'rl_' + crypto.createHash('sha256').update(ip).digest('hex').slice(0, 24);
    let count = 0;
    try {
      count = Number((await svc.cacheGet(rlKey)) || 0);
    } catch {
      /* cache miss or unavailable: allow */
    }
    if (count >= limit) return send(429, { error: 'rate_limited' });

    const parsed = enquirySchema.safeParse(json);
    if (!parsed.success) return send(400, { error: 'validation', errors: fieldErrors(parsed.error) });
    const enquiry = parsed.data;

    if (env.TURNSTILE_SECRET) {
      const ok = await verifyTurnstile(fetch, env.TURNSTILE_SECRET, enquiry.captchaToken, ip).catch(() => false);
      if (!ok) return send(400, { error: 'captcha', errors: { captcha: 'Please complete the verification' } });
    }

    try {
      await svc.cachePut(rlKey, String(count + 1), 1);
    } catch {
      /* non-fatal */
    }

    const ref = makeRef(enquiry.type, now());
    const d = enquiry.data;
    let est = null;
    if (enquiry.type === 'quote') {
      // Never trust a client-side number: recalculate from pricing.json.
      est = estimate({
        service: d.service,
        hours: d.hours,
        units: d.units,
        editedPhotos: d.editedPhotos,
        album: d.album,
        addons: d.addons,
        locationType: d.locationType,
      });
    }

    const row = {
      ref_no: ref,
      type: enquiry.type,
      name: d.name,
      email: d.email,
      phone: d.phone || '',
      preferred_contact: enquiry.type === 'quote' ? d.preferredContact : 'email',
      service: enquiry.type === 'quote' ? d.service : '',
      event_date: enquiry.type === 'quote' && d.date && !d.dateFlexible ? d.date : null,
      location_type: enquiry.type === 'quote' ? d.locationType : '',
      city: enquiry.type === 'quote' ? d.city : '',
      details_json: JSON.stringify(enquiry.type === 'quote' ? d : { subject: d.subject }),
      estimate_min: est ? est.min : null,
      estimate_max: est ? est.max : null,
      message: enquiry.type === 'quote' ? [d.notes, d.references].filter(Boolean).join('\n\n') : d.message,
      attachments: '',
      status: 'new',
      source_page: (enquiry.sourcePage || '').slice(0, 200),
      utm: (enquiry.utm || '').slice(0, 250),
    };

    try {
      await svc.insertRow(row);
    } catch (err) {
      log.error('enquiry: datastore insert failed', ref, err && err.message);
      return send(500, { error: 'storage' });
    }

    // Emails are best-effort: the enquiry is already stored.
    const replyWa =
      d.phone && enquiry.type === 'quote'
        ? waLink(`Hi ${d.name.split(' ')[0]}, thanks for your enquiry (${ref}) with ${site.name}!`, d.phone)
        : '';
    const mails = [];
    if (env.STUDIO_EMAIL && env.MAIL_FROM) {
      mails.push({
        from_email: env.MAIL_FROM,
        to_email: [env.STUDIO_EMAIL],
        reply_to: [d.email],
        subject: `${enquiry.type === 'quote' ? 'Quote request' : 'Message'} ${ref} — ${d.name}`,
        content: studioEmail({ enquiry, ref, est, estText: est ? formatRange(est) : '', replyWa, pricing, summary: enquiry.type === 'quote' ? quoteMessage(d) : '' }),
        html_mode: true,
      });
      mails.push({
        from_email: env.MAIL_FROM,
        to_email: [d.email],
        reply_to: [env.STUDIO_EMAIL],
        subject: `We've received your ${enquiry.type === 'quote' ? 'quote request' : 'message'} (${ref})`,
        content: clientEmail({ enquiry, ref, est, estText: est ? formatRange(est) : '', pricing, site }),
        html_mode: true,
      });
    }
    const results = await Promise.allSettled(mails.map((m) => svc.sendMail(m)));
    results.forEach((r) => r.status === 'rejected' && log.error('enquiry: email failed', ref, r.reason && r.reason.message));

    log.info('enquiry: stored', ref, enquiry.type);
    return send(201, { ref });
  };
}

async function verifyTurnstile(fetch, secret, token, ip) {
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token, remoteip: ip });
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const j = await r.json();
  return Boolean(j.success);
}

module.exports = { createHandler, makeRef };
