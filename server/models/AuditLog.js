const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
    source: { type: String, required: true },
    entity: { type: String, required: true },
    action: { type: String, required: true }, // e.g. 'ingest'
    outcome: { type: String, required: true, enum: ['success', 'fail'] },
    payload_size: { type: Number, default: 0 },
    raw_payload: { type: mongoose.Schema.Types.Mixed }, // Optional
    timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
