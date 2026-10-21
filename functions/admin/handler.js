'use strict';

const crypto = require('node:crypto');
const { validateBundle, BUNDLE_KEYS, ORIGINALS_DIR } = require('./lib/shared');
const { verifyPassword, sign, verifyToken } = require('./auth');

const MAX_BODY = 15 * 1024 * 1024; // base64 photo uploads (resized in the browser first)
const MAX_IMAGE = 10 * 1024 * 1024;
const SESSION_MS = 12 * 60 * 60 * 1000;
const LOGIN_ATTEMPTS_PER_HOUR = 10;

const IMAGE_TYPES = [
  { ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'webp', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
];

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

const clientIp = (req) =>
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || (req.socket && req.socket.remoteAddress) || 'unknown';

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'photo';

/** The endpoint is the last path segment: /server/admin/login → "login". */
const route = (url) => String(url || '').split('?')[0].replace(/\/+$/, '').split('/').pop();

function createHandler({ env, services, github, now = () => Date.now(), log = console }) {
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const secret = env.ADMIN_TOKEN_SECRET || '';

  return async function handle(req, res) {
    const origin = req.headers.origin;
    const headers = { 'Content-Type': 'application/json', Vary: 'Origin', 'Cache-Control': 'no-store' };
    // On Catalyst, the gateway adds CORS headers for Authorized Domains; adding
    // them here too duplicates Access-Control-Allow-Origin and browsers reject
    // the reply. Set CORS_HEADERS=on only on hosts without gateway CORS.
    if (env.CORS_HEADERS === 'on' && origin && allowed.includes(origin)) {
      headers['Access-Control-Allow-Origin'] = origin;
      headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
      headers['Access-Control-Max-Age'] = '86400';
    }
    const send = (status, body) => {
      res.writeHead(status, headers);
      res.end(body === undefined ? '' : JSON.stringify(body));
    };

    if (req.method === 'OPTIONS') return send(204);
    if (origin && allowed.length && !allowed.includes(origin)) return send(403, { error: 'origin_not_allowed' });
    if (!secret || secret.length < 32 || !env.ADMIN_PASSWORD_HASH || !env.GITHUB_TOKEN) {
      log.error('admin: missing configuration (ADMIN_TOKEN_SECRET, ADMIN_PASSWORD_HASH, GITHUB_TOKEN)');
      return send(503, { error: 'not_configured' });
    }

    const name = route(req.url);
    let body = {};
    if (req.method === 'POST') {
      try {
        body = JSON.parse((await readBody(req)) || '{}');
      } catch (err) {
        return send(err.status || 400, { error: err.status ? 'too_large' : 'invalid_json' });
      }
    }

    // ---- login (no session needed) ----
    if (name === 'login' && req.method === 'POST') {
      const svc = services(req);
      const key = 'adm_' + crypto.createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 24);
      let attempts = 0;
      try {
        attempts = Number((await svc.cacheGet(key)) || 0);
      } catch {
        /* allow */
      }
      if (attempts >= LOGIN_ATTEMPTS_PER_HOUR) return send(429, { error: 'too_many_attempts' });
      if (typeof body.password !== 'string' || !verifyPassword(body.password, env.ADMIN_PASSWORD_HASH)) {
        try {
          await svc.cachePut(key, String(attempts + 1), 1);
        } catch {
          /* non-fatal */
        }
        log.info('admin: failed login');
        return send(401, { error: 'invalid_password' });
      }
      const exp = now() + SESSION_MS;
      return send(200, { token: sign({ exp }, secret), expires: exp });
    }

    // ---- everything else needs a valid session ----
    // The site sends the token in the body (a "simple" request with no CORS
    // preflight); an Authorization header is accepted too.
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || (typeof body.token === 'string' ? body.token : '');
    if (!verifyToken(token, secret, now())) return send(401, { error: 'unauthorized' });

    try {
      if (name === 'content' && (req.method === 'GET' || req.method === 'POST')) {
        const files = await github.readJson(Object.values(BUNDLE_KEYS));
        const content = {};
        const shas = {};
        for (const [key, path] of Object.entries(BUNDLE_KEYS)) {
          content[key] = files[path].data;
          shas[path] = files[path].sha;
        }
        return send(200, { content, shas });
      }

      if (name === 'publish' && req.method === 'POST') {
        const { content, shas } = body;
        if (!content || typeof content !== 'object' || !shas || typeof shas !== 'object') return send(400, { error: 'invalid_request' });
        const issues = validateBundle(content);
        if (issues.length) return send(400, { error: 'validation', issues });

        const tip = await github.head();
        const current = await github.readJson(Object.values(BUNDLE_KEYS));
        const files = [];
        for (const [key, path] of Object.entries(BUNDLE_KEYS)) {
          // Compare content, not text, so files formatted differently by hand
          // aren't rewritten when nothing in them changed.
          if (JSON.stringify(current[path].data) === JSON.stringify(content[key])) continue;
          if (shas[path] !== current[path].sha) return send(409, { error: 'conflict', file: key });
          files.push({ path, content: JSON.stringify(content[key], null, 2) + '\n' });
        }
        if (!files.length) return send(200, { unchanged: true });
        const names = files.map((f) => f.path.split('/').pop()).join(', ');
        const message = `Content update via admin: ${names}\n\n${String(body.note || '').slice(0, 500)}`.trim();
        const result = await github.commit(files, message, tip);
        log.info('admin: published', result.sha, names);
        return send(200, { commit: result.sha, url: result.url, files: files.map((f) => f.path) });
      }

      if (name === 'upload' && req.method === 'POST') {
        const data = typeof body.data === 'string' ? Buffer.from(body.data, 'base64') : null;
        if (!data || !data.length) return send(400, { error: 'no_file' });
        if (data.length > MAX_IMAGE) return send(413, { error: 'too_large' });
        const type = IMAGE_TYPES.find((t) => t.test(data));
        if (!type) return send(415, { error: 'unsupported_type' });
        const id = `${slugify(body.name)}-${crypto.randomBytes(3).toString('hex')}`;
        const file = `${id}.${type.ext}`;
        const result = await github.commit(
          [{ path: `${ORIGINALS_DIR}/${file}`, base64: data.toString('base64') }],
          `Upload photo via admin: ${file}`,
        );
        log.info('admin: uploaded', file, data.length);
        return send(201, { id, file, commit: result.sha });
      }

      return send(404, { error: 'not_found' });
    } catch (err) {
      log.error('admin: error', name, err && err.message);
      if (err && err.status === 409) return send(409, { error: 'conflict' });
      return send(502, { error: 'github' });
    }
  };
}

/** Git's blob id for a utf-8 string, to detect unchanged files without a diff. */
function gitBlobSha(text) {
  const buf = Buffer.from(text, 'utf8');
  return crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');
}

module.exports = { createHandler, gitBlobSha, route };
