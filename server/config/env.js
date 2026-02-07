module.exports = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/mern-app',
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  // GitHub OAuth
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:8000/api/oauth/github/callback',
  // Session / token signing (after OAuth)
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  // Optional: frontend URL for OAuth redirect after callback
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  // Default repo to sync (owner/repo)
  GITHUB_DEFAULT_REPO: process.env.GITHUB_DEFAULT_REPO,
};
