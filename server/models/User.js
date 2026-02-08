const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    // ---- Identity (Unified) ----
    user_id: { type: String, required: true, unique: true }, // e.g. "github:12345" or "manual:EMP001"
    employee_id: { type: String, unique: true }, // e.g. "TECH001" (optional for external users)

    source: {
      type: String,
      enum: ["GitHub", "GitLab", "Jira", "Slack", "Mock", "Manual"],
      default: "Manual",
    },
    source_user_id: { type: String },

    name: { type: String },          // internal HR name
    display_name: { type: String },  // external / tool name
    email: { type: String, unique: true },

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
        "Unassigned",
      ],
      default: "Unassigned",
    },

    department: { type: String }, // Engineering, HR, Finance
    team: { type: String },       // Backend Team, Frontend Team

    employment_type: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Intern"],
      default: "Full-time",
    },

    // ---- Skills & Allocation Intelligence ----
    years_of_experience: { type: Number },
    skills: [{ type: String }], // ['React', 'Node', 'MongoDB']

    expertise: {
      type: Map,
      of: Number, // skill -> score (0–1)
    },

    seniority_level: {
      type: Number,
      min: 1,
      max: 5,
      default: 1, // 1=Junior, 5=Principal
    },

    working_style: { type: String }, // async, focused, collaborative
    availability: {
      type: String,
      enum: ["Free", "Busy", "Partially Free"],
      default: "Free",
    },

    free_slots_per_week: { type: Number },
    capacity_hours_per_sprint: { type: Number, default: 40 },

    past_performance_score: { type: Number }, // normalized 0–1

    // ---- Cost / Finance ----
    salary_band: { type: String },
    hourly_rate: { type: Number },

    // ---- Integrations ----
    jira_account_id: { type: String },

    metadata: { type: mongoose.Schema.Types.Mixed },

  },
  {
    timestamps: true, // createdAt, updatedAt
    collection: "users",
  }
);

// ---- Indexes ----
UserSchema.index({ role: 1 });
UserSchema.index({ team: 1 });
UserSchema.index({ availability: 1 });
UserSchema.index({ skills: 1 });
UserSchema.index({ jira_account_id: 1 });

module.exports = mongoose.model("User", UserSchema);
