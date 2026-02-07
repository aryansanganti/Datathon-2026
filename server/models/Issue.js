const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
    issue_id: { type: String, required: true, unique: true }, // Jira internal ID
    key: { type: String, required: true, unique: true }, // e.g., 'PROJ-123'
    title: { type: String, required: true },
    status: { type: String, required: true },
    priority: { type: String },
    assignee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sprint_id: { type: String }, // Valid if we sync sprints
    story_points: { type: Number },
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true },
    project_id: { type: String, required: true },
});

// Indexes for common queries
IssueSchema.index({ key: 1 });
IssueSchema.index({ assignee_id: 1 });
IssueSchema.index({ project_id: 1 });
IssueSchema.index({ sprint_id: 1 });

module.exports = mongoose.model('Issue', IssueSchema);
