'use strict';

/** Minimal GitHub REST client for reading files and committing several at once. */
function createGitHub({ token, repo, branch, fetch }) {
  const base = `https://api.github.com/repos/${repo}`;

  async function call(method, url, body) {
    const res = await fetch(url.startsWith('http') ? url : base + url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'ak-studio-admin',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(`GitHub ${method} ${url} → ${res.status}: ${json.message || ''}`);
      err.status = res.status;
      throw err;
    }
    return json;
  }

  async function head() {
    const ref = await call('GET', `/git/ref/heads/${encodeURIComponent(branch)}`);
    const commit = await call('GET', `/git/commits/${ref.object.sha}`);
    return { commit: ref.object.sha, tree: commit.tree.sha };
  }

  /** Reads JSON files at the branch head. Returns { data, sha } per path. */
  async function readJson(paths) {
    const out = {};
    await Promise.all(
      paths.map(async (p) => {
        const f = await call('GET', `/contents/${p.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(branch)}`);
        out[p] = { data: JSON.parse(Buffer.from(f.content, 'base64').toString('utf8')), sha: f.sha };
      }),
    );
    return out;
  }

  /** Blob shas of the given paths at the branch head (null if absent). */
  async function blobShas(paths, treeSha) {
    const tree = await call('GET', `/git/trees/${treeSha}?recursive=1`);
    const map = new Map(tree.tree.map((e) => [e.path, e.sha]));
    return Object.fromEntries(paths.map((p) => [p, map.get(p) || null]));
  }

  /**
   * Commits files ({ path, content (utf8 string) | base64 }) on top of the
   * branch head. Fails with status 409 if the branch moved underneath us.
   */
  async function commit(files, message, parent) {
    const tip = parent || (await head());
    const entries = await Promise.all(
      files.map(async (f) => {
        const blob = await call('POST', '/git/blobs', f.base64 != null ? { content: f.base64, encoding: 'base64' } : { content: f.content, encoding: 'utf-8' });
        return { path: f.path, mode: '100644', type: 'blob', sha: blob.sha };
      }),
    );
    const tree = await call('POST', '/git/trees', { base_tree: tip.tree, tree: entries });
    const c = await call('POST', '/git/commits', { message, tree: tree.sha, parents: [tip.commit] });
    try {
      await call('PATCH', `/git/refs/heads/${encodeURIComponent(branch)}`, { sha: c.sha, force: false });
    } catch (err) {
      if (err.status === 422) err.status = 409; // not a fast-forward: someone else pushed
      throw err;
    }
    return { sha: c.sha, url: c.html_url };
  }

  return { head, readJson, blobShas, commit };
}

module.exports = { createGitHub };
