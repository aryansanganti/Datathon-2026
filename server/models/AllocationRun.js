const mongoose = require('mongoose');

const AllocationRunSchema = new mongoose.Schema(
  {
    sprint_id: { type: String },
    sprint_name: { type: String },
    project_key: { type: String },
    board_id: { type: Number },
    assignments: [
      {
        task_id: String,
        jira_key: String,
        assigned_to: String,
      },
    ],
    issues_created: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AllocationRunSchema.index({ created_at: -1 });

module.exports = mongoose.model('AllocationRun', AllocationRunSchema);
