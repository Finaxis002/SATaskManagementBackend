// models/Notification.js
const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipientEmail: { type: String, required: false},
    message: { type: String, required: true },
    taskId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
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