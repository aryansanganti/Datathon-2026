const axios = require('axios');
const OAuthCredential = require('../models/OAuthCredential');

const GITHUB_API = 'https://api.github.com';

async function getAccessToken() {
  const cred = await OAuthCredential.findOne({ source: 'github' });
  if (!cred || !cred.access_token) throw new Error('GitHub not connected');
  return cred.access_token;
}

/**
 * Fetch commits for a repo. Uses since (ISO date) and per_page. Returns { data, nextPage }.
 * Respects X-RateLimit-*; throws if rate limited.
 */
async function fetchCommits(repo, opts = {}) {
  const token = await getAccessToken();

  // Normalize repo if it's a full URL
  if (repo.startsWith('http')) {
    repo = repo.replace('https://github.com/', '').replace('http://github.com/', '');
  }
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4);
  }

  const since = opts.since || undefined;
  const perPage = Math.min(opts.per_page || 30, 100);
  const page = opts.page || 1;

  const url = `${GITHUB_API}/repos/${repo}/commits`;
  const params = { per_page: perPage, page };
  if (since) params.since = since;

  const res = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
    params,
    validateStatus: (s) => s === 200 || s === 404 || s === 403,
  });

  if (res.status === 403) {
    const remaining = res.headers['x-ratelimit-remaining'];
    if (remaining === '0') throw new Error('GitHub rate limit exceeded');
    throw new Error('GitHub API forbidden');
  }
  if (res.status === 404) return { data: [], nextPage: null };

  const data = res.data;
  const link = res.headers.link;
  let nextPage = null;
  if (link && link.includes('rel="next"')) {
    const match = link.match(/page=(\d+)>; rel="next"/);
    if (match) nextPage = parseInt(match[1], 10);
  }

  return { data, nextPage };
}

/**
 * Fetch single commit details (for branch and full commit info) - optional, can use list commit payload
 */
async function fetchCommitDetails(repo, sha) {
  const token = await getAccessToken();

  // Normalize repo if it's a full URL
  if (repo.startsWith('http')) {
    repo = repo.replace('https://github.com/', '').replace('http://github.com/', '');
  }
  if (repo.endsWith('.git')) {
    repo = repo.slice(0, -4);
  }

  const res = await axios.get(`${GITHUB_API}/repos/${repo}/commits/${sha}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
    validateStatus: (s) => s === 200 || s === 404,
  });
  if (res.status === 404) return null;
  return res.data;
}

module.exports = { getAccessToken, fetchCommits, fetchCommitDetails };
