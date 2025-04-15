
const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  name: { type: String, required: true },
  due: { type: String, required: true },
  completed: { type: Boolean, default: false },
  assignee: {
    name: { type: String },
    email: { type: String }
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: false,
  },
  assignedToName: { type: String },
  column: { type: String }, // For example: 'Recently assigned', 'Do today', etc.
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', TaskSchema);
