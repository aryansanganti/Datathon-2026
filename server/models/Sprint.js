const mongoose = require('mongoose');

const SprintSchema = new mongoose.Schema({
    sprint_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    state: { type: String, required: true }, // active, closed, future
    board_id: { type: String, required: true },
    start_date: { type: Date },
    end_date: { type: Date },
    complete_date: { type: Date },
    goal: { type: String },
});

SprintSchema.index({ board_id: 1 });
SprintSchema.index({ state: 1 });

module.exports = mongoose.model('Sprint', SprintSchema);
