const mongoose = require('mongoose');

/**
 * Project Model
 * Represents a project that contains multiple issues/tasks
 * Used for CAPEX/OPEX tracking and resource allocation
 */
const ProjectSchema = new mongoose.Schema({
    project_id: { type: String, required: true, unique: true }, // e.g., 'PROJ' from Jira
    name: { type: String, required: true },
    description: { type: String },
    source: { type: String, enum: ['Jira', 'GitHub', 'Manual'], default: 'Manual' },
    
    // Project management
    status: { 
        type: String, 
        enum: ['Planning', 'Active', 'On Hold', 'Completed', 'Archived'],
        default: 'Planning'
    },
    priority: {
        type: String,
        enum: ['Critical', 'High', 'Medium', 'Low'],
        default: 'Medium'
    },
    
    // Team assignment
    lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Project Manager / Tech Lead
    team_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    
    // Timeline
    start_date: { type: Date },
    target_end_date: { type: Date },
    actual_end_date: { type: Date },
    
    // Budget tracking (for CAPEX/OPEX)
    budget: {
        allocated: { type: Number, default: 0 }, // Total allocated budget
        spent: { type: Number, default: 0 }, // Amount spent
        currency: { type: String, default: 'USD' },
        type: { type: String, enum: ['CAPEX', 'OPEX', 'Mixed'], default: 'OPEX' }
    },
    
    // Estimation
    estimated_hours: { type: Number },
    actual_hours: { type: Number },
    
    // Integration references
    jira_project_key: { type: String },
    github_repos: [{ type: String }], // List of GitHub repos associated
    
    // Metrics (computed/updated periodically)
    metrics: {
        total_issues: { type: Number, default: 0 },
        completed_issues: { type: Number, default: 0 },
        total_story_points: { type: Number, default: 0 },
        completed_story_points: { type: Number, default: 0 },
        total_commits: { type: Number, default: 0 },
        velocity: { type: Number, default: 0 } // Story points per sprint average
    },
    
    // Metadata
    tags: [{ type: String }],
    metadata: { type: mongoose.Schema.Types.Mixed },
    
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Update timestamp on save
ProjectSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});

// Indexes
ProjectSchema.index({ project_id: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ lead_id: 1 });
ProjectSchema.index({ team_id: 1 });
ProjectSchema.index({ jira_project_key: 1 });

module.exports = mongoose.model('Project', ProjectSchema);
