const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  timestamp: {
    type: String,
    required: true,
  },
  recipient: {
    type: String,
    required: false, // For group chat, recipient is not necessary
  },
  group: {
    type: String,
    required: false, // For group chat messages
  },
  read: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
