'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { createGitHub } = require('../github');

function fakeFetch(failRef = false) {
  const calls = [];
  const fetch = async (url, init) => {
    const u = url.replace('https://api.github.com/repos/o/r', '');
    calls.push(`${init.method} ${u}`);
    const ok = (json) => ({ ok: true, status: 200, json: async () => json });
    if (u === '/git/ref/heads/main') return ok({ object: { sha: 'HEAD' } });
    if (u === '/git/commits/HEAD') return ok({ tree: { sha: 'TREE' } });
    if (u === '/git/blobs') return ok({ sha: 'BLOB' + calls.length });
    if (u === '/git/trees') return ok({ sha: 'NEWTREE' });
    if (u === '/git/commits') return ok({ sha: 'NEW', html_url: 'https://github.com/o/r/commit/NEW' });
    if (u === '/git/refs/heads/main')
      return failRef ? { ok: false, status: 422, json: async () => ({ message: 'Update is not a fast forward' }) } : ok({});
    if (u.startsWith('/contents/')) return ok({ content: Buffer.from('{"a":1}').toString('base64'), sha: 'S' });
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { fetch, calls };
}

test('commits several files as one commit on the branch head', async () => {
  const f = fakeFetch();
  const gh = createGitHub({ token: 't', repo: 'o/r', branch: 'main', fetch: f.fetch });
  const r = await gh.commit([{ path: 'a.json', content: '{}' }, { path: 'b.jpg', base64: 'AAA=' }], 'msg');
  assert.deepEqual(r, { sha: 'NEW', url: 'https://github.com/o/r/commit/NEW' });
  assert.deepEqual(f.calls, [
    'GET /git/ref/heads/main',
    'GET /git/commits/HEAD',
    'POST /git/blobs',
    'POST /git/blobs',
    'POST /git/trees',
    'POST /git/commits',
    'PATCH /git/refs/heads/main',
  ]);
});

test('maps a non-fast-forward ref update to a 409 conflict', async () => {
  const gh = createGitHub({ token: 't', repo: 'o/r', branch: 'main', fetch: fakeFetch(true).fetch });
  await assert.rejects(gh.commit([{ path: 'a.json', content: '{}' }], 'm'), (e) => e.status === 409);
});

test('reads JSON files with their blob sha', async () => {
  const gh = createGitHub({ token: 't', repo: 'o/r', branch: 'main', fetch: fakeFetch().fetch });
  assert.deepEqual(await gh.readJson(['app/content/site.json']), { 'app/content/site.json': { data: { a: 1 }, sha: 'S' } });
});
