const mongoose = require('mongoose');

const CommitSchema = new mongoose.Schema({
    commit_id: { type: String, required: true }, // SHA
    branch: { type: String },
    message: { type: String }, // Commit message - for ticket parsing
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
    
    // Files changed (for skill inference)
    files_changed: [{
        filename: { type: String },
        status: { type: String }, // 'added', 'modified', 'removed'
        additions: { type: Number, default: 0 },
        deletions: { type: Number, default: 0 },
        language: { type: String } // Inferred from file extension
    }],
    
    // Linked issues (extracted from commit message)
    linked_issues: [{ type: String }], // e.g., ['PROJ-123', 'PROJ-456']
    
    // PR association
    pull_request_id: { type: String },
    pull_request_title: { type: String },
    
    // Code review (if from PR)
    review_status: {
        type: String,
        enum: ['pending', 'approved', 'changes_requested', 'merged', null],
        default: null
    },
    
    // For cost calculation
    estimated_hours: { type: Number }, // Can be estimated from LOC changes
    
    // Metadata
    metadata: { type: mongoose.Schema.Types.Mixed },
    
    created_at: { type: Date, default: Date.now },
});

// Index for idempotency and querying
CommitSchema.index({ raw_signature: 1 }, { unique: true });
CommitSchema.index({ source: 1, timestamp: -1 });
CommitSchema.index({ author_id: 1 });
CommitSchema.index({ repo_id: 1 });
CommitSchema.index({ 'linked_issues': 1 });

module.exports = mongoose.model('Commit', CommitSchema);
