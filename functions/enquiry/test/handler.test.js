'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { Readable } = require('node:stream');
const { createHandler } = require('../handler');

const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
const quote = {
  type: 'quote',
  hp: '',
  sourcePage: '/quote',
  data: {
    service: 'wedding', date: future, dateFlexible: false, locationType: 'outdoor', city: 'Jaipur',
    hours: 8, units: 200, editedPhotos: 150, album: 'premium', addons: ['reel'], budget: '50_100k',
    notes: '<b>Sunset</b>', references: '', name: 'Priya S.', email: 'priya@example.com',
    phone: '+91 98765 43210', preferredContact: 'whatsapp', consent: true,
  },
};

function setup({ env = {}, cache = {}, insertFails = false, fetchOk = true } = {}) {
  const rows = [], mails = [], logs = [];
  const handler = createHandler({
    env: { STUDIO_EMAIL: 'studio@x.test', MAIL_FROM: 'noreply@x.test', ALLOWED_ORIGINS: 'https://site.test', ...env },
    fetch: async () => ({ json: async () => ({ success: fetchOk }) }),
    services: () => ({
      insertRow: async (r) => { if (insertFails) throw new Error('db down'); rows.push(r); return r; },
      sendMail: async (m) => mails.push(m),
      cacheGet: async (k) => cache[k],
      cachePut: async (k, v) => { cache[k] = v; },
    }),
    log: { info: () => {}, error: (...a) => logs.push(a.join(' ')) },
  });
  return { handler, rows, mails, logs, cache };
}

async function call(handler, { method = 'POST', body, origin = 'https://site.test', ip = '1.2.3.4' } = {}) {
  const raw = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
  const req = Readable.from([Buffer.from(raw)]);
  Object.assign(req, { method, headers: { origin, 'x-forwarded-for': ip } });
  const res = {
    status: 0, headers: {}, body: '', headersSent: false,
    writeHead(s, h) { this.status = s; this.headers = h; this.headersSent = true; },
    end(b) { this.body = b; },
  };
  await handler(req, res);
  return { status: res.status, headers: res.headers, json: res.body ? JSON.parse(res.body) : null };
}

test('stores a valid quote, recalculates the estimate and sends both emails', async () => {
  const { handler, rows, mails } = setup();
  const r = await call(handler, { body: { ...quote, data: { ...quote.data } } });
  assert.equal(r.status, 201);
  assert.match(r.json.ref, /^AKQ-\d{4}-[0-9A-Z]{4}$/);
  assert.equal(r.headers['Access-Control-Allow-Origin'], undefined, 'Catalyst adds CORS headers; the function must not duplicate them');
  assert.equal(rows.length, 1);
  const row = rows[0];
  assert.equal(row.ref_no, r.json.ref);
  assert.equal(row.event_date, future);
  // (60000 + 2×5000 + 2×2000 + 25000 + 15000) × 1.1 = 125400 → 125500
  assert.equal(row.estimate_min, 125500);
  assert.equal(mails.length, 2);
  assert.deepEqual(mails[0].to_email, ['studio@x.test']);
  assert.deepEqual(mails[0].reply_to, ['priya@example.com']);
  assert.ok(mails[0].content.includes('&lt;b&gt;Sunset&lt;/b&gt;'), 'user content is escaped in email HTML');
  assert.ok(mails[0].content.includes('wa.me/919876543210'), 'studio email has a WhatsApp reply link');
  assert.deepEqual(mails[1].to_email, ['priya@example.com']);
});

test('ignores a client-supplied estimate', async () => {
  const { handler, rows } = setup();
  await call(handler, { body: { ...quote, estimate: { min: 1, max: 2 }, data: { ...quote.data } } });
  assert.notEqual(rows[0].estimate_min, 1);
});

test('stores a contact message', async () => {
  const { handler, rows } = setup();
  const r = await call(handler, {
    body: { type: 'contact', data: { name: 'Sam', email: 'sam@example.com', phone: '', subject: 'Booking', message: 'Free in May for portraits?', consent: true } },
  });
  assert.equal(r.status, 201);
  assert.match(r.json.ref, /^AKC-/);
  assert.equal(rows[0].estimate_min, null);
});

test('returns field errors for invalid input and rejects a filled honeypot', async () => {
  const { handler, rows } = setup();
  const r = await call(handler, { body: { ...quote, hp: 'spam', data: { ...quote.data, email: 'nope', consent: false } } });
  assert.equal(r.status, 400);
  assert.ok(r.json.errors.email && r.json.errors.consent && r.json.errors.hp);
  assert.equal(rows.length, 0);
});

test('rejects invalid JSON, wrong methods and unknown origins; answers preflight', async () => {
  const { handler } = setup();
  assert.equal((await call(handler, { body: '{nope' })).status, 400);
  assert.equal((await call(handler, { method: 'GET' })).status, 405);
  assert.equal((await call(handler, { body: quote, origin: 'https://evil.test' })).status, 403);
  const pre = await call(handler, { method: 'OPTIONS' });
  assert.equal(pre.status, 204);
  const own = setup({ env: { CORS_HEADERS: 'on' } });
  const ownPre = await call(own.handler, { method: 'OPTIONS' });
  assert.equal(ownPre.headers['Access-Control-Allow-Origin'], 'https://site.test');
  assert.equal(ownPre.headers['Access-Control-Allow-Methods'], 'POST, OPTIONS');
});

test('rate limits per IP', async () => {
  const { handler } = setup({ env: { RATE_LIMIT_PER_HOUR: '2' } });
  assert.equal((await call(handler, { body: quote })).status, 201);
  assert.equal((await call(handler, { body: quote })).status, 201);
  assert.equal((await call(handler, { body: quote })).status, 429);
  assert.equal((await call(handler, { body: quote, ip: '5.6.7.8' })).status, 201);
});

test('requires a valid captcha when a secret is configured', async () => {
  const missing = setup({ env: { TURNSTILE_SECRET: 's' } });
  assert.equal((await call(missing.handler, { body: quote })).status, 400);
  const bad = setup({ env: { TURNSTILE_SECRET: 's' }, fetchOk: false });
  assert.equal((await call(bad.handler, { body: { ...quote, captchaToken: 't' } })).status, 400);
  const good = setup({ env: { TURNSTILE_SECRET: 's' } });
  assert.equal((await call(good.handler, { body: { ...quote, captchaToken: 't' } })).status, 201);
});

test('returns 500 when storage fails, and still succeeds when email fails', async () => {
  const { handler } = setup({ insertFails: true });
  assert.equal((await call(handler, { body: quote })).status, 500);
  const failing = createHandler({
    env: { STUDIO_EMAIL: 'a@x.test', MAIL_FROM: 'b@x.test' },
    fetch,
    services: () => ({ insertRow: async () => ({}), sendMail: async () => { throw new Error('smtp'); }, cacheGet: async () => null, cachePut: async () => {} }),
    log: { info() {}, error() {} },
  });
  assert.equal((await call(failing, { body: quote, origin: undefined })).status, 201);
});

test('prices quotes with published pricing when available, else the bundled copy', async () => {
  const { createPricingSource } = require('../handler');
  const bundled = JSON.parse(require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../../app/content/pricing.json'), 'utf8'));
  const live = structuredClone(bundled);
  live.services.wedding.base = 100000;
  let calls = 0;
  const source = createPricingSource({
    url: 'https://site.test/pricing.json',
    fetch: async () => (calls++, { ok: true, json: async () => live }),
    log: { error() {} },
  });
  const rows = [];
  const handler = createHandler({
    env: {},
    fetch,
    loadPricing: source,
    services: () => ({ insertRow: async (r) => rows.push(r), sendMail: async () => {}, cacheGet: async () => null, cachePut: async () => {} }),
    log: { info() {}, error() {} },
  });
  await call(handler, { body: quote, origin: undefined });
  await call(handler, { body: quote, origin: undefined, ip: '9.9.9.9' });
  // (100000 + 10000 + 4000 + 25000 + 15000) × 1.1 = 169400 → 169500
  assert.equal(rows[0].estimate_min, 169500);
  assert.equal(calls, 1, 'cached between requests');

  const broken = createPricingSource({ url: 'https://site.test/pricing.json', fetch: async () => ({ ok: true, json: async () => ({ nope: 1 }) }), log: { error() {} } });
  assert.equal((await broken()).services.wedding.base, bundled.services.wedding.base);
});
