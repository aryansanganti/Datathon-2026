const mongoose = require('mongoose');

/**
 * Team Model
 * Represents a team of users working together
 * Used for resource allocation and organizational structure
 */
const TeamSchema = new mongoose.Schema({
    team_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    
    // Organizational hierarchy
    department: { 
        type: String, 
        enum: ['Engineering', 'Product', 'HR', 'Finance', 'Executive', 'Operations', 'QA', 'DevOps', 'Cloud Engineering'],
        required: true
    },
    
    // Team leadership
    manager_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tech_lead_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    
    // Team members
    members: [{ 
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role_in_team: { type: String }, // e.g., 'Frontend Dev', 'Backend Dev', 'QA'
        joined_at: { type: Date, default: Date.now },
        allocation_percentage: { type: Number, default: 100, min: 0, max: 100 } // For shared resources
    }],
    
    // Capacity and skills
    capacity: {
        total_hours_per_sprint: { type: Number, default: 0 }, // Calculated from member allocations
        available_hours_per_sprint: { type: Number, default: 0 }
    },
    skills: [{ type: String }], // Aggregated skills from team members
    
    // Cost tracking
    cost: {
        hourly_rate_avg: { type: Number, default: 0 },
        monthly_cost: { type: Number, default: 0 },
        currency: { type: String, default: 'USD' }
    },
    
    // Active projects
    active_projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    
    // Status
    status: {
        type: String,
        enum: ['Active', 'Forming', 'Disbanded', 'On Hold'],
        default: 'Active'
    },
    
    // Metrics
    metrics: {
        avg_velocity: { type: Number, default: 0 },
        sprint_completion_rate: { type: Number, default: 0 },
        bug_rate: { type: Number, default: 0 }
    },
    
    // Metadata
    metadata: { type: mongoose.Schema.Types.Mixed },
    
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Update timestamp on save
TeamSchema.pre('save', function(next) {
    this.updated_at = new Date();
    next();
});

// Virtual for member count
TeamSchema.virtual('member_count').get(function() {
    return this.members ? this.members.length : 0;
});

// Indexes
TeamSchema.index({ team_id: 1 });
TeamSchema.index({ department: 1 });
TeamSchema.index({ manager_id: 1 });
TeamSchema.index({ status: 1 });

module.exports = mongoose.model('Team', TeamSchema);
