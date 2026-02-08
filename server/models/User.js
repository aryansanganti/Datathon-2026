const mongoose = require("mongoose");

/**
 * User Model (Mock Data)
 * Collection: users_mock
 */

const UserSchema = new mongoose.Schema(
  {
    // ---- Identity (Unified) ----
    user_id: { type: String }, // e.g. "github:12345" or "manual:EMP001"
    employee_id: { type: String }, // e.g. "TECH001" (optional for external users)

    source: {
      type: String,
      enum: ["GitHub", "GitLab", "Jira", "Slack", "Mock", "Manual"],
      default: "Mock",
    },
    source_user_id: { type: String },

    name: { type: String },          // internal HR name
    display_name: { type: String },  // external / tool name
    email: { type: String },

    // ---- Org & Role ----
    role: {
      type: String,
      enum: [
        "Developer",
        "Senior Developer",
        "Tech Lead",
        "Frontend Developer",
        "Backend Developer",
        "QA Engineer",
        "DevOps Engineer",
        "Product Manager",
        "Project Manager",
        "HR",
        "Finance",
        "Executive",
        "AWS Solutions Architect",
        "AWS Backend Developer",
        "AWS DevOps Engineer",
        "AWS Cloud Engineer",
        "Unassigned",
      ],
      default: "Developer",
    },

    department: { type: String }, // Engineering, HR, Finance
    team: { type: String },       // Backend Team, Frontend Team

    employment_type: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Intern"],
      default: "Full-time",
    },

    // ---- Skills & Allocation Intelligence ----
    years_of_experience: { type: Number, default: 3 },
    skills: [{ type: String }], // ['React', 'Node', 'MongoDB']

    expertise: {
      type: Map,
      of: Number, // skill -> score (0–1)
    },

    seniority_level: {
      type: Number,
      min: 1,
      max: 5,
      default: 2, // 1=Junior, 5=Principal
    },

    working_style: { type: String }, // async, focused, collaborative
    availability: {
      type: String,
      enum: ["Free", "Busy", "Partially Free"],
      default: "Free",
    },

    free_slots_per_week: { type: Number, default: 30 },
    capacity_hours_per_sprint: { type: Number, default: 40 },

    past_performance_score: { type: Number, default: 0.8 }, // normalized 0–1

    // ---- Cost / Finance ----
    salary_band: { type: String },
    hourly_rate: { type: Number, default: 75 },

    // ---- Integrations ----
    jira_account_id: { type: String },

    metadata: { type: mongoose.Schema.Types.Mixed },

  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "users_mock",
    strict: false  // Allow fields not in schema
  }
);

// ---- Indexes ----
UserSchema.index({ role: 1 });
UserSchema.index({ team: 1 });
UserSchema.index({ name: 1 });
UserSchema.index({ availability: 1 });
UserSchema.index({ skills: 1 });

module.exports = mongoose.model("User", UserSchema);
