const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
  {
    task_id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    role_required: {
      type: String,
      required: true,
      enum: ['frontend', 'backend', 'qa', 'devops'],
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    deadline: { type: Date, required: true },
    estimated_hours: { type: Number },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'allocated', 'in_progress', 'done'],
    },
    allocated_to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    jira_issue_key: { type: String },
    jira_issue_id: { type: String },
    sprint_id: { type: String },
    sprint_name: { type: String },
    synced_to_jira: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

TaskSchema.index({ status: 1 });
TaskSchema.index({ deadline: 1 });
TaskSchema.index({ role_required: 1 });
TaskSchema.index({ synced_to_jira: 1 });
TaskSchema.index({ allocated_to: 1 });

module.exports = mongoose.model('Task', TaskSchema);
