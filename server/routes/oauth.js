const express = require('express');
const router = express.Router();
const passport = require('passport');
const config = require('../config/env');

// GitHub OAuth: redirect to GitHub authorize
router.get('/github', (req, res, next) => {
  if (!config.GITHUB_CLIENT_ID) {
    return res.status(503).json({ error: 'GitHub OAuth not configured' });
  }
  const scopes = ['repo', 'read:org', 'admin:repo_hook'];
  passport.authenticate('github', { scope: scopes })(req, res, next);
});

// GitHub OAuth callback: exchange code for tokens, store credential, redirect to frontend
router.get(
  '/github/callback',
  passport.authenticate('github', { session: true, failureRedirect: `${config.FRONTEND_URL}?oauth=error` }),
  (req, res) => {
    res.redirect(`${config.FRONTEND_URL}?oauth=success`);
  }
);

// Optional: check if GitHub is connected (for dashboard)
router.get('/github/status', async (req, res) => {
  const OAuthCredential = require('../models/OAuthCredential');
  try {
    const cred = await OAuthCredential.findOne({ source: 'github' });
    res.json({ connected: !!cred });
  } catch {
    res.json({ connected: false });
  }
});

module.exports = router;
