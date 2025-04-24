// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientEmail: { type: String, required: true },
    message: { type: String, required: true },
    taskId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    readBy: {
      type: [String], // Array of userIds or emails
      default: [],
    },
    
    type: { type: String, required: true },  // e.g., 'task', 'admin'
    action: { type: String, required: true }, // e.g., 'task-updated'
    updatedBy: { type: String },              // user email or name
    details: {                                // New field to track what changed
      type: Map,
      of: String,
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model("Notification", notificationSchema);
