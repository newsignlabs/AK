'use strict';

const crypto = require('node:crypto');

const b64url = (buf) => Buffer.from(buf).toString('base64url');

/**
 * Password hashes look like "scrypt$<saltHex>$<hashHex>" (N=16384, r=8, p=1, 64 bytes).
 * Generate one with: node functions/admin/hash-password.js
 */
function hashPassword(password, salt = crypto.randomBytes(16)) {
  const hash = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/**
 * Accepts "scrypt$<saltHex>$<hashHex>" (from hash-password.js) or
 * "pbkdf2$<iterations>$<saltHex>$<hashHex>" (PBKDF2-SHA256, from the
 * browser-based generator at /admin?setup).
 */
function verifyPassword(password, stored) {
  const parts = String(stored || '').trim().split('$');
  let expected;
  let actual;
  if (parts[0] === 'scrypt' && parts.length === 3) {
    expected = Buffer.from(parts[2], 'hex');
    actual = crypto.scryptSync(String(password), Buffer.from(parts[1], 'hex'), expected.length, { N: 16384, r: 8, p: 1 });
  } else if (parts[0] === 'pbkdf2' && parts.length === 4) {
    const iterations = Number(parts[1]);
    if (!Number.isInteger(iterations) || iterations < 100_000) return false;
    expected = Buffer.from(parts[3], 'hex');
    actual = crypto.pbkdf2Sync(String(password), Buffer.from(parts[2], 'hex'), iterations, expected.length, 'sha256');
  } else return false;
  return expected.length >= 32 && crypto.timingSafeEqual(actual, expected);
}

function sign(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(crypto.createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}

function verifyToken(token, secret, now = Date.now()) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const expected = b64url(crypto.createHmac('sha256', secret).update(body).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return payload.exp > now ? payload : null;
  } catch {
    return null;
  }
}

module.exports = { hashPassword, verifyPassword, sign, verifyToken };
