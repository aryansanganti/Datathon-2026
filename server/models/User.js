const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    user_id: { type: String, required: true, unique: true }, // e.g. "github:12345"
    source: { type: String, required: true, enum: ['GitHub', 'GitLab', 'Jira', 'Slack', 'Mock', 'Manual'] },
    source_user_id: { type: String, required: true },
    display_name: { type: String },
    email: { type: String },

    // Role & Organization
    role: {
        type: String,
        enum: ['Developer', 'Senior Developer', 'Tech Lead', 'Project Manager', 'HR', 'Finance', 'Executive', 'Product Manager', 'QA Engineer', 'DevOps Engineer', 'Unassigned'],
        default: 'Unassigned'
    },
    department: { type: String }, // e.g., 'Engineering', 'HR', 'Finance'
    team: { type: String }, // e.g., 'Backend Team', 'Frontend Team'
    salary_band: { type: String }, // For CAPEX/OPEX calculation
    hourly_rate: { type: Number }, // For cost calculation
    employment_type: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Intern'],
        default: 'Full-time'
    },
    skills: [{ type: String }], // e.g., ['React', 'Node.js', 'Python']
    seniority_level: {
        type: Number,
        min: 1,
        max: 5,
        default: 1
    }, // 1=Junior, 5=Principal
    metadata: { type: mongoose.Schema.Types.Mixed }, // Additional org-specific data

    // Integration specific fields
    jira_account_id: { type: String },
    capacity_hours_per_sprint: { type: Number, default: 40 },

    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
});

// Update timestamp on save
UserSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

module.exports = mongoose.model('User', UserSchema);
