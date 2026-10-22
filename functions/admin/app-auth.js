'use strict';

const crypto = require('node:crypto');

const b64url = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

/**
 * Normalises a pasted private key. The Catalyst console (especially on a
 * phone) can turn the .pem's line breaks into spaces or literal "\n"; this
 * rebuilds a valid PEM from whatever arrives.
 */
function normalizePem(raw) {
  const text = String(raw || '').replace(/\\n/g, '\n').trim();
  const m = text.match(/-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----/);
  if (!m) throw new Error('GH_PRIVATE_KEY is not a PEM private key (paste the whole .pem file).');
  const body = m[2].replace(/\s+/g, '').match(/.{1,64}/g).join('\n');
  return `-----BEGIN ${m[1]}-----\n${body}\n-----END ${m[1]}-----\n`;
}

/** Short-lived JWT (RS256) that identifies the GitHub App itself. */
function appJwt(appId, privateKey, nowMs = Date.now()) {
  const now = Math.floor(nowMs / 1000);
  const unsigned = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({ iat: now - 60, exp: now + 540, iss: String(appId) })}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(normalizePem(privateKey)).toString('base64url');
  return `${unsigned}.${signature}`;
}

/**
 * Returns an async function giving a GitHub installation token for the app.
 * Tokens last an hour; they are cached and renewed 5 minutes before expiry.
 */
function createAppTokenProvider({ appId, installationId, privateKey, fetch, now = () => Date.now() }) {
  let cached = null;
  return async function getToken() {
    if (cached && cached.expires - now() > 5 * 60 * 1000) return cached.token;
    const res = await fetch(`https://api.github.com/app/installations/${encodeURIComponent(installationId)}/access_tokens`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${appJwt(appId, privateKey, now())}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'ak-studio-admin',
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.token) {
      throw Object.assign(new Error(`GitHub App token request failed (${res.status}): ${json.message || ''}`), { status: 502 });
    }
    cached = { token: json.token, expires: Date.parse(json.expires_at) || now() + 55 * 60 * 1000 };
    return cached.token;
  };
}

/** True when all three GitHub App settings are present. */
const hasAppConfig = (env) => Boolean(env.GH_APP_ID && env.GH_INSTALLATION_ID && env.GH_PRIVATE_KEY);

module.exports = { normalizePem, appJwt, createAppTokenProvider, hasAppConfig };
