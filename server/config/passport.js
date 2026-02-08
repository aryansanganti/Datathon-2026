const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const config = require('./env');
const OAuthCredential = require('../models/OAuthCredential');

if (config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
        callbackURL: config.GITHUB_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          await OAuthCredential.findOneAndUpdate(
            { source: 'github' },
            {
              source: 'github',
              access_token: accessToken,
              refresh_token: refreshToken || undefined,
            },
            { upsert: true, new: true }
          );
          return done(null, { id: profile.id, username: profile.username });
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));
