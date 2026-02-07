const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    user_id: { type: String, required: true, unique: true }, // e.g. "github:12345"
    source: { type: String, required: true, enum: ['GitHub', 'GitLab', 'Jira', 'Slack'] },
    source_user_id: { type: String, required: true },
    display_name: { type: String },
    email: { type: String },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);
