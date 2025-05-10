const mongoose = require("mongoose");


const TaskSchema = new mongoose.Schema({
  taskName: {
    type: String,
    required: true,
  },

  workDesc: {
    type: String,
  },

  taskCategory: {
    type: String,
    required: false, // Dropdown from frontend, add new if needed
  },

  department: {
    type: [String],
    required: false, // Same as above
  },
  clientName: {
    type: String,
    required: false,
  },

  code: {
    type: String,
    required: false, // Project/task code - dropdown + add
  },

  assignedBy: {
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  createdBy: {
    name: { type: String, required: true },
    email: { type: String, required: true },
  },

  assignees: [
    {
      name: { type: String, required: true },
      email: { type: String, required: true },
    },
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
    enum: ["To Do", "In Progress", "Completed", "Overdue" , "Abbstulate"],
    default: "To Do",
  },

  overdueNote: {
    type: String,
    required: function () {
      return this.status === "Overdue";
    },
  },
  // Added Remark field
  remark: {
    type: String,
    required: false, // You can set this to true if you want it to be a mandatory field
    default: "", // Optional: Set an initial value if needed (empty string here)
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  isRepetitive: {
    type: Boolean,
    default: false,
  },
  
  repeatType: {
    type: String,
    enum: ["Daily", "Monthly", "Quarterly", "Every 6 Months", "Annually"],
    required: function () {
      return this.isRepetitive;
    },
  },
  
  repeatDay: {
    type: Number,
    required: function () {
      return (
        this.isRepetitive &&
        ["Monthly", "Quarterly", "Every 6 Months", "Annually"].includes(this.repeatType)
      );
    },
  },
  
  repeatMonth: {
    type: Number,
    required: function () {
      return this.isRepetitive && this.repeatType === "Annually";
    },
  },
  
  repetitionCount: {
    type: Number,
    default: 1,
  },
  
  nextRepetitionDate: {
    type: Date,
    required: false,
  },
 nextDueDate: {
  type: Date,
  required: false,
},

 
});

const Task = mongoose.models.Task || mongoose.model("Task", TaskSchema);

module.exports = Task;
