'use strict';

const catalyst = require('zcatalyst-sdk-node');
const { createHandler } = require('./handler');
const { createGitHub } = require('./github');
const { createAppTokenProvider, hasAppConfig } = require('./app-auth');

const env = process.env;

// Prefer the GitHub App (short-lived installation tokens); fall back to a
// personal access token in GITHUB_TOKEN if the app is not configured.
const token = hasAppConfig(env)
  ? createAppTokenProvider({
      appId: env.GH_APP_ID,
      installationId: env.GH_INSTALLATION_ID,
      privateKey: env.GH_PRIVATE_KEY,
      fetch: globalThis.fetch,
    })
  : env.GITHUB_TOKEN;

const handle = createHandler({
  env,
  github: createGitHub({
    token,
    repo: env.GITHUB_REPO || 'newsignlabs/AK',
    branch: env.GITHUB_BRANCH || 'main',
    fetch: globalThis.fetch,
  }),
  services(req) {
    const segment = catalyst.initialize(req).cache().segment();
    return {
      cacheGet: (key) => segment.getValue(key),
      cachePut: (key, value, hours) => segment.put(key, value, hours),
    };
  },
});

// Advanced I/O entry point: /server/admin/{login,content,publish,upload}
module.exports = (req, res) => {
  handle(req, res).catch((err) => {
    console.error('admin: unhandled error', err && err.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal' }));
    }
  });
};
