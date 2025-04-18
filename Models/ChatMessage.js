const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  text: { type: String, required: true },
  timestamp: { type: String, required: true },
  read: { type: Boolean, default: false }, // ✅ important
}, { timestamps: true });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
