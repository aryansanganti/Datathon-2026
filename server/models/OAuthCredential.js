const mongoose = require('mongoose');

const oauthCredentialSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, unique: true },
    access_token: { type: String, required: true },
    refresh_token: { type: String },
    expires_at: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OAuthCredential', oauthCredentialSchema);
