const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  taskName: {
    type: String,
    required: true,
  },
  workDesc: {
    type: String,
  },

  assignees: [
    {
      name: { type: String, required: true },
      email: { type: String, required: true },
    }
  ],
  assignedDate: {
    type: Date,
    required: true,
  },

  dueDate: {
    type: Date,
    required: true,
  },

  priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
  },

  status: {
    type: String,
    enum: ["To Do", "In Progress", "Completed", "Overdue"],
    default: "To Do",
  },

  overdueNote: {
    type: String,
    required: function () {
      return this.status === "Overdue";
    },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Task', TaskSchema);
