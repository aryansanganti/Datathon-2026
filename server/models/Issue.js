const mongoose = require('mongoose');

const IssueSchema = new mongoose.Schema({
    issue_id: { type: String, required: true, unique: true }, // Jira internal ID
    key: { type: String, required: true, unique: true }, // e.g., 'PROJ-123'
    title: { type: String, required: true },
    description: { type: String },
    status: { type: String, required: true },
    priority: { type: String },
    
    // Issue type classification
    issue_type: { 
        type: String, 
        enum: ['Story', 'Task', 'Bug', 'Epic', 'Sub-task', 'Feature', 'Improvement', 'Other'],
        default: 'Task'
    },
    
    // Assignments
    assignee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reporter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // Sprint and project
    sprint_id: { type: String }, // Valid if we sync sprints
    project_id: { type: String, required: true },
    
    // Estimation and tracking
    story_points: { type: Number },
    original_estimate_hours: { type: Number },
    time_spent_hours: { type: Number, default: 0 },
    remaining_estimate_hours: { type: Number },
    
    // Labels and components
    labels: [{ type: String }],
    components: [{ type: String }],
    
    // Hierarchy (for epics/sub-tasks)
    parent_key: { type: String }, // Parent issue key
    epic_key: { type: String }, // Epic this belongs to
    
    // Workflow tracking
    workflow_history: [{
        from_status: { type: String },
        to_status: { type: String },
        changed_at: { type: Date },
        changed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    
    // Linked commits (for knowledge graph)
    linked_commits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Commit' }],
    
    // Cost tracking
    cost: {
        estimated_cost: { type: Number }, // Based on story points * team rate
        actual_cost: { type: Number }, // Based on time spent * hourly rate
        currency: { type: String, default: 'USD' }
    },
    
    // Resolution
    resolution: { type: String }, // e.g., 'Done', 'Won\'t Do', 'Duplicate'
    resolved_at: { type: Date },
    
    // Metadata
    metadata: { type: mongoose.Schema.Types.Mixed },
    
    created_at: { type: Date, required: true },
    updated_at: { type: Date, required: true },
});

// Indexes for common queries
IssueSchema.index({ key: 1 });
IssueSchema.index({ assignee_id: 1 });
IssueSchema.index({ project_id: 1 });
IssueSchema.index({ sprint_id: 1 });
IssueSchema.index({ issue_type: 1 });
IssueSchema.index({ status: 1 });
IssueSchema.index({ epic_key: 1 });

module.exports = mongoose.model('Issue', IssueSchema);
