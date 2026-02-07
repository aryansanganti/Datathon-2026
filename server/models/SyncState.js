const mongoose = require('mongoose');

const SyncStateSchema = new mongoose.Schema({
    source: { type: String, required: true },
    entity: { type: String, required: true }, // e.g. 'commits'
    last_sync_at: { type: Date },
    last_cursor: { type: String }, // For pagination
});

// Ensure one sync state per source/entity
SyncStateSchema.index({ source: 1, entity: 1 }, { unique: true });

module.exports = mongoose.model('SyncState', SyncStateSchema);
