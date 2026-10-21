'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { Readable } = require('node:stream');
const path = require('node:path');
const fs = require('node:fs');
const { createHandler, gitBlobSha, route } = require('../handler');
const { hashPassword, verifyToken, sign } = require('../auth');

const SECRET = 'x'.repeat(40);
const content = path.resolve(__dirname, '../../../app/content');
const read = (p) => JSON.parse(fs.readFileSync(path.join(content, p), 'utf8'));
const FILES = {
  'app/content/site.json': read('site.json'),
  'app/content/pricing.json': read('pricing.json'),
  'app/content/services.json': read('services.json'),
  'app/content/testimonials.json': read('testimonials.json'),
  'app/content/faq.json': read('faq.json'),
  'app/content/instagram.json': read('instagram.json'),
  'app/content/gallery/categories.json': read('gallery/categories.json'),
  'app/content/gallery/photos.json': read('gallery/photos.json'),
};
const text = (d) => JSON.stringify(d, null, 2) + '\n';

function fakeGitHub() {
  const repo = Object.fromEntries(Object.entries(FILES).map(([p, d]) => [p, text(d)]));
  const commits = [];
  return {
    repo,
    commits,
    async head() {
      return { commit: 'c' + commits.length, tree: 't' + commits.length };
    },
    async readJson(paths) {
      return Object.fromEntries(paths.map((p) => [p, { data: JSON.parse(repo[p]), sha: gitBlobSha(repo[p]) }]));
    },
    async blobShas(paths) {
      return Object.fromEntries(paths.map((p) => [p, repo[p] ? gitBlobSha(repo[p]) : null]));
    },
    async commit(files, message) {
      for (const f of files) repo[f.path] = f.content ?? `<binary ${f.base64.length}>`;
      commits.push({ files: files.map((f) => f.path), message });
      return { sha: 'sha' + commits.length, url: 'https://github.test/c' };
    },
  };
}

function setup(envOver = {}) {
  const github = fakeGitHub();
  const cache = {};
  const handler = createHandler({
    env: {
      ALLOWED_ORIGINS: 'https://site.test',
      ADMIN_PASSWORD_HASH: hashPassword('correct horse battery'),
      ADMIN_TOKEN_SECRET: SECRET,
      GITHUB_TOKEN: 'ghp_test',
      ...envOver,
    },
    github,
    services: () => ({ cacheGet: async (k) => cache[k], cachePut: async (k, v) => { cache[k] = v; } }),
    log: { info() {}, error() {} },
  });
  return { handler, github, cache };
}

async function call(handler, { method = 'POST', url = '/server/admin/login', body, token, origin = 'https://site.test', ip = '1.1.1.1' } = {}) {
  const raw = body === undefined ? '' : JSON.stringify(body);
  const req = Readable.from([Buffer.from(raw)]);
  Object.assign(req, { method, url, headers: { origin, 'x-forwarded-for': ip, ...(token ? { authorization: `Bearer ${token}` } : {}) } });
  const res = { status: 0, headers: {}, body: '', headersSent: false, writeHead(s, h) { this.status = s; this.headers = h; this.headersSent = true; }, end(b) { this.body = b; } };
  await handler(req, res);
  return { status: res.status, headers: res.headers, json: res.body ? JSON.parse(res.body) : null };
}

async function login(handler) {
  const r = await call(handler, { body: { password: 'correct horse battery' } });
  assert.equal(r.status, 200);
  return r.json.token;
}

test('routes on the last path segment', () => {
  assert.equal(route('/server/admin/publish/'), 'publish');
  assert.equal(route('/content?x=1'), 'content');
});

test('logs in with the right password and issues a 12h token', async () => {
  const { handler } = setup();
  const token = await login(handler);
  const p = verifyToken(token, SECRET);
  assert.ok(p && p.exp > Date.now() + 11 * 3600e3);
});

test('rejects wrong passwords and rate limits attempts', async () => {
  const { handler } = setup();
  for (let i = 0; i < 10; i++) assert.equal((await call(handler, { body: { password: 'nope' } })).status, 401);
  assert.equal((await call(handler, { body: { password: 'correct horse battery' } })).status, 429);
  assert.equal((await call(handler, { body: { password: 'correct horse battery' }, ip: '2.2.2.2' })).status, 200);
});

test('requires a valid, unexpired session for content endpoints', async () => {
  const { handler } = setup();
  assert.equal((await call(handler, { method: 'GET', url: '/content' })).status, 401);
  assert.equal((await call(handler, { method: 'GET', url: '/content', token: 'forged.token' })).status, 401);
  const expired = sign({ exp: Date.now() - 1000 }, SECRET);
  assert.equal((await call(handler, { method: 'GET', url: '/content', token: expired })).status, 401);
  const other = sign({ exp: Date.now() + 60_000 }, 'y'.repeat(40));
  assert.equal((await call(handler, { method: 'GET', url: '/content', token: other })).status, 401);
});

test('refuses to run without configuration', async () => {
  const { handler } = setup({ ADMIN_TOKEN_SECRET: 'short' });
  assert.equal((await call(handler, { body: { password: 'x' } })).status, 503);
});

test('loads content and publishes only changed files in one commit', async () => {
  const { handler, github } = setup();
  const token = await login(handler);
  const loaded = await call(handler, { method: 'GET', url: '/content', token });
  assert.equal(loaded.status, 200);
  const { content, shas } = loaded.json;
  assert.equal(content.site.name, FILES['app/content/site.json'].name);

  content.site.tagline = 'Light, *kept*.';
  content.faq.push({ q: 'Do you shoot film?', a: 'Yes, on request.' });
  const r = await call(handler, { url: '/publish', token, body: { content, shas } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  assert.deepEqual(r.json.files.sort(), ['app/content/faq.json', 'app/content/site.json']);
  assert.equal(github.commits.length, 1);
  assert.match(github.commits[0].message, /^Content update via admin: /);
  assert.equal(JSON.parse(github.repo['app/content/site.json']).tagline, 'Light, *kept*.');

  const again = await call(handler, { url: '/publish', token, body: { content, shas: (await call(handler, { method: 'GET', url: '/content', token })).json.shas } });
  assert.deepEqual(again.json, { unchanged: true });
});

test('rejects invalid content with field issues and commits nothing', async () => {
  const { handler, github } = setup();
  const token = await login(handler);
  const { content, shas } = (await call(handler, { method: 'GET', url: '/content', token })).json;
  content.site.socials.instagram = 'javascript:alert(1)';
  const r = await call(handler, { url: '/publish', token, body: { content, shas } });
  assert.equal(r.status, 400);
  assert.ok(r.json.issues.some((i) => i.path === 'socials.instagram'));
  assert.equal(github.commits.length, 0);
});

test('detects a conflicting edit made elsewhere', async () => {
  const { handler, github } = setup();
  const token = await login(handler);
  const { content, shas } = (await call(handler, { method: 'GET', url: '/content', token })).json;
  github.repo['app/content/faq.json'] = text([{ q: 'Edited on GitHub', a: 'Meanwhile.' }]);
  content.faq[0].a = 'My edit';
  const r = await call(handler, { url: '/publish', token, body: { content, shas } });
  assert.equal(r.status, 409);
  assert.equal(r.json.file, 'faq');
});

test('uploads images after checking the file signature', async () => {
  const { handler, github } = setup();
  const token = await login(handler);
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);
  const r = await call(handler, { url: '/upload', token, body: { name: 'Sunset Couple.JPG', data: jpeg.toString('base64') } });
  assert.equal(r.status, 201);
  assert.match(r.json.id, /^sunset-couple-[0-9a-f]{6}$/);
  assert.equal(r.json.file, `${r.json.id}.jpg`);
  assert.ok(github.repo[`app/content/gallery/originals/${r.json.file}`]);

  const html = Buffer.from('<html><script>alert(1)</script>');
  assert.equal((await call(handler, { url: '/upload', token, body: { name: 'x.jpg', data: html.toString('base64') } })).status, 415);
});
