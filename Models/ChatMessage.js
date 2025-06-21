const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: false, // Make optional to support file-only messages
  },
  fileUrl: {
    type: String,
    required: false, // Optional field for file messages
  },
  timestamp: {
    type: String,
    required: true,
  },
  recipient: {
    type: String,
    required: false,
  },
  group: {
    type: String,
    required: false,
  },
  read: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
