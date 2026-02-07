const mongoose = require('mongoose');

const CommitSchema = new mongoose.Schema({
    commit_id: { type: String, required: true }, // SHA
    branch: { type: String },
    author_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, required: true },
    source: { type: String, required: true },
    repo_id: { type: String },
    raw_signature: { type: String, required: true, unique: true }, // Deduplication key
    stats: {
        additions: { type: Number, default: 0 },
        deletions: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
    },
    created_at: { type: Date, default: Date.now },
});

// Index for idempotency and querying
CommitSchema.index({ raw_signature: 1 }, { unique: true });
CommitSchema.index({ source: 1, timestamp: -1 });

module.exports = mongoose.model('Commit', CommitSchema);
