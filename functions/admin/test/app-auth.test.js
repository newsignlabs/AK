'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const { normalizePem, appJwt, createAppTokenProvider, hasAppConfig } = require('../app-auth');
const { createGitHub } = require('../github');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = privateKey.export({ type: 'pkcs1', format: 'pem' }); // GitHub's .pem format

test('accepts the private key however the console mangles it', () => {
  const variants = [
    pem,
    pem.replace(/\n/g, ' '), // line breaks turned into spaces (phone paste)
    pem.replace(/\n/g, '\\n'), // literal \n
    `  ${pem.replace(/\n/g, '\r\n')}  `, // Windows line endings, padding
  ];
  for (const v of variants) {
    const key = crypto.createPrivateKey(normalizePem(v));
    assert.equal(key.asymmetricKeyType, 'rsa');
  }
  assert.throws(() => normalizePem('not a key'), /not a PEM/);
});

test('signs a valid RS256 app JWT with the right claims', () => {
  const now = Date.UTC(2026, 9, 22, 10, 0, 0);
  const jwt = appJwt(123456, pem.replace(/\n/g, ' '), now);
  const [h, c, s] = jwt.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(h, 'base64url')), { alg: 'RS256', typ: 'JWT' });
  const claims = JSON.parse(Buffer.from(c, 'base64url'));
  assert.equal(claims.iss, '123456');
  assert.equal(claims.iat, now / 1000 - 60);
  assert.equal(claims.exp, now / 1000 + 540); // GitHub allows at most 10 minutes
  assert.ok(crypto.createVerify('RSA-SHA256').update(`${h}.${c}`).verify(publicKey, Buffer.from(s, 'base64url')));
});

test('fetches an installation token once and renews it before expiry', async () => {
  let t = Date.UTC(2026, 9, 22, 10, 0, 0);
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, auth: init.headers.Authorization, method: init.method });
    return { ok: true, status: 201, json: async () => ({ token: `ghs_${calls.length}`, expires_at: new Date(t + 3600e3).toISOString() }) };
  };
  const get = createAppTokenProvider({ appId: '1', installationId: '99', privateKey: pem, fetch, now: () => t });
  assert.equal(await get(), 'ghs_1');
  assert.equal(calls[0].url, 'https://api.github.com/app/installations/99/access_tokens');
  assert.equal(calls[0].method, 'POST');
  assert.match(calls[0].auth, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  t += 30 * 60e3;
  assert.equal(await get(), 'ghs_1', 'cached for 30 minutes');
  t += 26 * 60e3;
  assert.equal(await get(), 'ghs_2', 'renewed when under 5 minutes remain');
  assert.equal(calls.length, 2);
});

test('reports a clear error when GitHub refuses the app', async () => {
  const fetch = async () => ({ ok: false, status: 404, json: async () => ({ message: 'Not Found' }) });
  const get = createAppTokenProvider({ appId: '1', installationId: 'wrong', privateKey: pem, fetch });
  await assert.rejects(get(), /GitHub App token request failed \(404\): Not Found/);
});

test('the GitHub client uses the app token for every call', async () => {
  const seen = [];
  const fetch = async (url, init) => {
    seen.push(init.headers.Authorization);
    return { ok: true, status: 200, json: async () => ({ content: Buffer.from('{"a":1}').toString('base64'), sha: 'S' }) };
  };
  let n = 0;
  const gh = createGitHub({ token: async () => `ghs_app${++n}`, repo: 'o/r', branch: 'main', fetch });
  await gh.readJson(['a.json', 'b.json']);
  assert.deepEqual(seen.sort(), ['Bearer ghs_app1', 'Bearer ghs_app2']);
});

test('detects whether the app is configured', () => {
  assert.equal(hasAppConfig({ GH_APP_ID: '1', GH_INSTALLATION_ID: '2', GH_PRIVATE_KEY: 'k' }), true);
  assert.equal(hasAppConfig({ GH_APP_ID: '1', GH_INSTALLATION_ID: '2' }), false);
});
