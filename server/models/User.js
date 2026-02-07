const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    user_id: { type: String, required: true, unique: true },
    source: { type: String, required: true, enum: ['GitHub', 'GitLab', 'Jira', 'Slack'] },
    source_user_id: { type: String, required: true },
    display_name: { type: String },
    email: { type: String },
    role: { type: String },
    jira_account_id: { type: String },
    capacity_hours_per_sprint: { type: Number, default: 40 },
    created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);
